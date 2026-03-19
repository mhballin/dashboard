function toISODate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function parseMaybeJSON(value) {
  if (value == null) return value;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function truncate(text, max = 80) {
  const s = typeof text === 'string' ? text.trim() : '';
  if (!s) return null;
  if (s.length <= max) return s;
  return `${s.slice(0, max - 3)}...`;
}

function formatDateLabel(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

function formatWeekLabel(startISO, endISO) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const startFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(start);
  const endFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(end);
  return `${startFmt} - ${endFmt}`;
}

function getIsoWeekKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function startOfUtcDay(value) {
  const d = value instanceof Date ? value : new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysBetween(fromValue, toValue) {
  const from = startOfUtcDay(fromValue);
  const to = startOfUtcDay(toValue);
  const diff = to.getTime() - from.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

function getCardReferenceDate(card) {
  if (!card) return null;
  const dates = parseMaybeJSON(card.dates) || {};
  if (card.col === 'saved') return card.added || dates.saved || null;
  if (card.col === 'applied') return dates.applied || dates.saved || card.added || null;
  const nonEmpty = Object.values(dates).filter(Boolean);
  if (nonEmpty.length) {
    nonEmpty.sort();
    return nonEmpty[nonEmpty.length - 1];
  }
  return card.added || null;
}

function toTypeLabel(type) {
  const lower = (type || '').toLowerCase();
  if (lower === 'meetings') return 'meeting';
  if (lower === 'applications') return 'application';
  if (lower === 'followups') return 'followup';
  return lower || 'note';
}

async function getList(pb, collection, query = '') {
  const response = await pb(`/api/collections/${collection}/records${query}`);
  return (response && (response.items || response.records)) || [];
}

export async function gatherRecapData(pb, userId, weekStartISO, weekEndISO) {
  const weekStart = toISODate(weekStartISO);
  const weekEnd = toISODate(weekEndISO);
  const weekKey = getIsoWeekKey(weekStart);

  const [user, weeklyStatsRecords, activityRecords, cards, tasks] = await Promise.all([
    pb(`/api/collections/users/records/${userId}?fields=id,name,email`),
    getList(
      pb,
      'weekly_stats',
      `?filter=${encodeURIComponent(`(user="${userId}"&&weekKey="${weekKey}")`)}&perPage=1`
    ),
    getList(
      pb,
      'activity_log',
      `?filter=${encodeURIComponent(`(user="${userId}"&&date>="${weekStart}"&&date<="${weekEnd}")`)}&sort=-date,-created&perPage=500`
    ),
    getList(
      pb,
      'cards',
      `?filter=${encodeURIComponent(`user="${userId}"`)}&perPage=1000&sort=-updated`
    ),
    getList(
      pb,
      'tasks',
      `?filter=${encodeURIComponent(`(user="${userId}"&&done=false)`)}&perPage=500&sort=-pinned,order`
    ),
  ]);

  const weeklyStats = weeklyStatsRecords[0] || {};
  const stats = {
    applications: Number(weeklyStats.applications || 0),
    meetings: Number(weeklyStats.meetings || 0),
    outreach: Number(weeklyStats.outreach || 0),
    followups: Number(weeklyStats.followups || 0),
  };
  stats.isEmpty = stats.applications + stats.meetings + stats.outreach + stats.followups === 0;

  const grouped = new Map();
  for (const entry of activityRecords) {
    const date = entry.date || toISODate(entry.created) || weekStart;
    const list = grouped.get(date) || [];
    list.push({
      type: toTypeLabel(entry.type),
      note: entry.note || '',
    });
    grouped.set(date, list);
  }

  const activityLog = Array.from(grouped.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, entries]) => ({
      date,
      dateLabel: formatDateLabel(date),
      entries,
    }));

  const mapCard = (card) => ({
    company: card.company || 'Unknown',
    notes: truncate(card.notes || ''),
  });

  const savedCards = cards.filter((card) => card.col === 'saved').map(mapCard);
  const appliedCards = cards.filter((card) => card.col === 'applied').map(mapCard);
  const interviewingCards = cards.filter((card) => card.col === 'interviewing').map(mapCard);

  const closedThisWeekCards = cards
    .filter((card) => {
      const dates = parseMaybeJSON(card.dates) || {};
      const closedDate = toISODate(dates.closed);
      return !!closedDate && closedDate >= weekStart && closedDate <= weekEnd;
    })
    .map(mapCard);

  const pipeline = {
    saved: { count: savedCards.length, cards: savedCards },
    applied: { count: appliedCards.length, cards: appliedCards },
    interviewing: { count: interviewingCards.length, cards: interviewingCards },
    closedThisWeek: { count: closedThisWeekCards.length, cards: closedThisWeekCards },
  };

  const now = new Date();
  const staleCards = cards
    .filter((card) => card && (card.col === 'saved' || card.col === 'applied'))
    .map((card) => {
      const reference = getCardReferenceDate(card);
      const daysStale = reference ? daysBetween(reference, now) : 0;
      return {
        company: card.company || 'Unknown',
        col: card.col,
        daysStale,
      };
    })
    .filter((card) => card.daysStale >= 14)
    .sort((a, b) => b.daysStale - a.daysStale);

  const pinned = tasks.filter((task) => !!task.pinned).map((task) => ({ text: task.text || '' }));
  const unpinned = tasks.filter((task) => !task.pinned).map((task) => ({ text: task.text || '' }));

  const isEmptyWeek = stats.isEmpty && activityLog.length === 0 && pipeline.closedThisWeek.count === 0 && pinned.length + unpinned.length === 0;

  return {
    user: {
      name: user?.name || 'there',
      email: user?.email || '',
    },
    weekLabel: formatWeekLabel(weekStart, weekEnd),
    weekKey,
    stats,
    hasActivityLog: activityLog.length > 0,
    activityLog,
    pipeline,
    staleCards,
    hasStaleCards: staleCards.length > 0,
    tasks: {
      pinned,
      unpinned,
      isEmpty: pinned.length + unpinned.length === 0,
    },
    isEmptyWeek,
  };
}
