import { CronJob } from 'cron';
import { gatherRecapData } from './gatherRecapData.js';
import { renderWeeklyRecap } from './renderTemplate.js';
import { sendRecapEmail } from './sendRecap.js';
import { alertAdminOnFailure } from './alertAdmin.js';

const PB_URL = (globalThis.process?.env?.PB_URL || '').replace(/\/+$/, '');
const RECAP_TIMEZONE = 'America/New_York';
const RECAP_CRON = '0 0 5 * * 1';

let schedulerInitialized = false;
let running = false;

function getIsoWeekKey(value) {
  const d = new Date(value);
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function formatYmd(date) {
  return date.toISOString().slice(0, 10);
}

function getWeekRangeFromNow(now = new Date()) {
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  return { weekStart: formatYmd(start), weekEnd: formatYmd(end), weekKey: getIsoWeekKey(end) };
}

function isMondayPastFiveET(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: RECAP_TIMEZONE,
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0);
  return weekday === 'Mon' && hour >= 5;
}

async function pbRequest(path, options = {}, token) {
  const url = `${PB_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || `${response.status} ${response.statusText}`);
  }
  return data;
}

async function authenticateAdmin() {
  const identity = globalThis.process?.env?.PB_ADMIN_EMAIL;
  const password = globalThis.process?.env?.PB_ADMIN_PASSWORD;
  if (!identity || !password) {
    throw new Error('Missing PB_ADMIN_EMAIL or PB_ADMIN_PASSWORD');
  }

  const body = JSON.stringify({ identity, password });
  const endpoints = [
    '/api/admins/auth-with-password',
    '/api/collections/_superusers/auth-with-password',
  ];

  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const data = await pbRequest(endpoint, { method: 'POST', body });
      if (data?.token) return data.token;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to authenticate as PocketBase admin');
}

async function getSettingRecord(token, userId, key) {
  const filter = encodeURIComponent(`(user="${userId}"&&key="${key}")`);
  const data = await pbRequest(`/api/collections/settings/records?filter=${filter}&perPage=1`, {}, token);
  const record = (data?.items || data?.records || [])[0] || null;
  return record;
}

async function setSettingRecord(token, userId, key, value) {
  const existing = await getSettingRecord(token, userId, key);
  const payload = { key, value: JSON.stringify(value), user: userId };
  if (existing?.id) {
    await pbRequest(`/api/collections/settings/records/${existing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ value: JSON.stringify(value) }),
    }, token);
    return;
  }
  await pbRequest('/api/collections/settings/records', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

function parseSettingValue(record, fallback) {
  if (!record) return fallback;
  try {
    return JSON.parse(record.value);
  } catch {
    return fallback;
  }
}

async function getUsers(token) {
  const data = await pbRequest('/api/collections/users/records?perPage=500&fields=id,email,name', {}, token);
  return (data?.items || data?.records || []).filter((user) => !!user?.email);
}

async function runForUser(token, user, weekStart, weekEnd, weekKey) {
  const optInRecord = await getSettingRecord(token, user.id, 'weekly_email_opt_in');
  const optIn = parseSettingValue(optInRecord, true) !== false;
  if (!optIn) return;

  const sentRecord = await getSettingRecord(token, user.id, 'last_recap_sent');
  const alreadySent = parseSettingValue(sentRecord, '') === weekKey;
  if (alreadySent) return;

  const pb = (path, options = {}) => pbRequest(path, options, token);
  const recapData = await gatherRecapData(pb, user.id, weekStart, weekEnd);
  if (!recapData.user.email) return;

  const html = await renderWeeklyRecap(recapData);
  await sendRecapEmail({
    to: recapData.user.email,
    subject: `Your Week in Review: ${recapData.weekLabel}`,
    html,
  });

  await setSettingRecord(token, user.id, 'last_recap_sent', weekKey);
  console.log(`[weekly-recap] sent for user ${user.id} (${weekKey})`);
}

export async function runWeeklyRecap() {
  if (running) return;
  running = true;
  try {
    if (!PB_URL) throw new Error('Missing PB_URL');
    const token = await authenticateAdmin();
    const { weekStart, weekEnd, weekKey } = getWeekRangeFromNow();
    const users = await getUsers(token);
    for (const user of users) {
      try {
        await runForUser(token, user, weekStart, weekEnd, weekKey);
      } catch (error) {
        console.error(`[weekly-recap] failed for user ${user.id}`, error);
        await alertAdminOnFailure({ userId: user.id, error, weekKey });
      }
    }
  } catch (error) {
    console.error('[weekly-recap] job failed', error);
  } finally {
    running = false;
  }
}

export function initWeeklyRecapScheduler() {
  if (schedulerInitialized) return;
  schedulerInitialized = true;

  const job = new CronJob(RECAP_CRON, () => {
    runWeeklyRecap().catch((error) => console.error('[weekly-recap] cron run failed', error));
  }, null, true, RECAP_TIMEZONE);
  job.start();

  if (isMondayPastFiveET()) {
    runWeeklyRecap().catch((error) => console.error('[weekly-recap] startup catch-up failed', error));
  }

  console.log('[weekly-recap] scheduler initialized');
}
