const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const getToken = () => localStorage.getItem("pb_token");
const getUserId = () => localStorage.getItem("pb_userId");

export async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    let msg = (data && data.message) || text || `${res.status} ${res.statusText}`;
    if (data && data.data && typeof data.data === 'object') {
      for (const val of Object.values(data.data)) {
        if (!val) continue;
        if (typeof val === 'string') { msg = val; break; }
        if (Array.isArray(val) && val.length) {
          if (typeof val[0] === 'string') { msg = val[0]; break; }
          if (val[0] && val[0].message) { msg = val[0].message; break; }
        }
        if (val.message) { msg = val.message; break; }
        if (typeof val === 'object') {
          const inner = Object.values(val)[0];
          if (typeof inner === 'string') { msg = inner; break; }
          if (inner && inner.message) { msg = inner.message; break; }
        }
      }
    }
    throw new Error(msg);
  }

  const token = data?.token || data?.accessToken || (data?.data && data.data.token);
  const userId = data?.userId || data?.user?.id || (data?.data && data.data.userId);
  const emailOut = data?.email || (data?.user && data.user.email) || null;

  if (!token || !userId) {
    throw new Error("Login response missing token or userId");
  }

  localStorage.setItem("pb_token", token);
  localStorage.setItem("pb_userId", userId);

  return { token, userId, email: emailOut };
}

export async function register(email, password, name) {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, passwordConfirm: password, name }),
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    let msg = (data && data.message) || text || `${res.status} ${res.statusText}`;
    if (data && data.data && typeof data.data === 'object' && Object.keys(data.data).length) {
      const parts = Object.values(data.data).map((err) => {
        if (!err) return "";
        if (typeof err === 'string') return err;
        if (Array.isArray(err) && err.length) {
          if (typeof err[0] === 'string') return err[0];
          if (err[0] && err[0].message) return err[0].message;
        }
        if (err.message) return err.message;
        // fallback: try to read nested first value
        if (typeof err === 'object') {
          const inner = Object.values(err)[0];
          if (typeof inner === 'string') return inner;
          if (inner && inner.message) return inner.message;
        }
        return "";
      }).filter(Boolean);
      if (parts.length) msg = parts.join('. ');
    }
    throw new Error(msg);
  }

  // Registration successful — sign the user in using existing login flow
  return await login(email, password);
}

export function logout() {
  localStorage.removeItem("pb_token");
  localStorage.removeItem("pb_userId");
}

export function isLoggedIn() {
  return !!getToken();
}

async function pbFetch(method, path, body) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = `${API}/api${p}`;

  const headers = { "Content-Type": "application/json", "Authorization": "Bearer " + getToken() };

  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();

  if (!res.ok && res.status !== 404) {
    const msg = text || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  if (res.status === 404) return null;
  if (!text) return null;

  try { return JSON.parse(text); } catch { return text; }

}

export async function getSetting(key) {
  const filter = `(key="${key}"&&user="${getUserId()}")`;
  const q = `?filter=${encodeURIComponent(filter)}&perPage=1`;
  const res = await pbFetch('GET', `/collections/settings/records${q}`);
  const records = (res && (res.records || res.items)) || [];
  if (!records.length) return null;
  const val = records[0].value;
  try { return JSON.parse(val); } catch { return val; }
}

export async function setSetting(key, value) {
  const filter = `(key="${key}"&&user="${getUserId()}")`;
  const q = `?filter=${encodeURIComponent(filter)}&perPage=1`;
  const existing = await pbFetch('GET', `/collections/settings/records${q}`);
  const records = (existing && (existing.records || existing.items)) || [];

  const payload = { value: JSON.stringify(value) };

  if (records.length) {
    const id = records[0].id;
    return await pbFetch('PATCH', `/collections/settings/records/${id}`, payload);
  }

  const createBody = { key, value: JSON.stringify(value), user: getUserId() };
  return await pbFetch('POST', `/collections/settings/records`, createBody);
}

export async function getAllSettings() {
  const filter = `(user="${getUserId()}")`;
  const q = `?filter=${encodeURIComponent(filter)}&perPage=200`;
  const res = await pbFetch('GET', `/collections/settings/records${q}`);
  const records = (res && (res.records || res.items)) || [];
  return records.reduce((acc, r) => {
    try { acc[r.key] = JSON.parse(r.value); } catch { acc[r.key] = r.value; }
    return acc;
  }, {});
}

export async function getCards() {
  const filter = `(user="${getUserId()}")`;
  const q = `?filter=${encodeURIComponent(filter)}&perPage=500&sort=-created`;
  const res = await pbFetch('GET', `/collections/cards/records${q}`);
  return (res && (res.records || res.items)) || [];
}

export async function createCard(card) {
  const { id, ...rest } = card;
  const body = { ...rest, user: getUserId() };
  return await pbFetch('POST', `/collections/cards/records`, body);
}

export async function updateCard(id, changes) {
  return await pbFetch('PATCH', `/collections/cards/records/${id}`, changes);
}

export async function deleteCard(id) {
  return await pbFetch('DELETE', `/collections/cards/records/${id}`);
}

export async function updateCards(cards) {
  return Promise.all(cards.map((c) => updateCard(c.id, c)));
}

// ── Tasks ──

export async function getTasks() {
  const filter = `(user="${getUserId()}")`;
  const q = `?filter=${encodeURIComponent(filter)}&perPage=500&sort=order`;
  const res = await pbFetch('GET', `/collections/tasks/records${q}`);
  return (res && (res.records || res.items)) || [];
}

export async function createTask(task) {
  const { id, ...rest } = task;
  const body = { ...rest, user: getUserId() };
  return await pbFetch('POST', `/collections/tasks/records`, body);
}

export async function updateTask(id, changes) {
  return await pbFetch('PATCH', `/collections/tasks/records/${id}`, changes);
}

export async function deleteTask(id) {
  return await pbFetch('DELETE', `/collections/tasks/records/${id}`);
}

// ── Activity Log ──

export async function getActivityLog() {
  const filter = `(user="${getUserId()}")`;
  const q = `?filter=${encodeURIComponent(filter)}&perPage=500&sort=-date,-created`;
  const res = await pbFetch('GET', `/collections/activity_log/records${q}`);
  return (res && (res.records || res.items)) || [];
}

export async function createActivityEntry(entry) {
  const { id, ...rest } = entry;
  const body = { ...rest, user: getUserId() };
  return await pbFetch('POST', `/collections/activity_log/records`, body);
}

export async function updateActivityEntry(id, changes) {
  return await pbFetch('PATCH', `/collections/activity_log/records/${id}`, changes);
}

export async function deleteActivityEntry(id) {
  return await pbFetch('DELETE', `/collections/activity_log/records/${id}`);
}

// ── Notes ──

export async function getNotes() {
  const filter = `(user="${getUserId()}")`;
  const q = `?filter=${encodeURIComponent(filter)}&perPage=500&sort=-date,-created`;
  const res = await pbFetch('GET', `/collections/notes/records${q}`);
  return (res && (res.records || res.items)) || [];
}

export async function createNote(note) {
  const { id, ...rest } = note;
  const body = { ...rest, user: getUserId() };
  return await pbFetch('POST', `/collections/notes/records`, body);
}

export async function updateNote(id, changes) {
  return await pbFetch('PATCH', `/collections/notes/records/${id}`, changes);
}

export async function deleteNote(id) {
  return await pbFetch('DELETE', `/collections/notes/records/${id}`);
}

// ── Weekly Stats ──

export async function getWeeklyStats(weekKey) {
  const filter = weekKey
    ? `(user="${getUserId()}"&&weekKey="${weekKey}")`
    : `(user="${getUserId()}")`;
  const q = `?filter=${encodeURIComponent(filter)}&perPage=200&sort=-weekKey`;
  const res = await pbFetch('GET', `/collections/weekly_stats/records${q}`);
  return (res && (res.records || res.items)) || [];
}

export async function upsertWeeklyStats(weekKey, data, existingId) {
  if (existingId) {
    return await pbFetch('PATCH', `/collections/weekly_stats/records/${existingId}`, data);
  }

  const filter = `(user="${getUserId()}"&&weekKey="${weekKey}")`;
  const q = `?filter=${encodeURIComponent(filter)}&perPage=1`;
  const existing = await pbFetch('GET', `/collections/weekly_stats/records${q}`);
  const records = (existing && (existing.records || existing.items)) || [];

  if (records.length) {
    return await pbFetch('PATCH', `/collections/weekly_stats/records/${records[0].id}`, data);
  }

  return await pbFetch('POST', `/collections/weekly_stats/records`, {
    weekKey, ...data, user: getUserId()
  });
}

// End of file
