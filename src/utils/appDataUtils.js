import { parseDateToLocalMidnight } from "./dates";

export const TRACKED_APPLICATION_COLUMNS = ["applied", "interviewing", "closed"];
export const CRM_STALE_THRESHOLD_DAYS = 14;
export const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export const PRIORITY_REASON_SCORES = {
  OVERDUE_FOLLOW_UP: { reason: "overdue follow-up", score: 5 },
  UPCOMING_DEADLINE: { reason: "deadline within 72h", score: 4 },
  STALE_APPLICATION: { reason: "stale application", score: 3 },
  STARRED: { reason: "starred card", score: 2 },
  FOLLOW_UP_TODAY: { reason: "follow-up due today", score: 1 },
};

export function buildCumulative(entries = [], cards = [], fallback = null) {
  const meetings = (entries || []).filter((e) => e?.type === "meetings").length;
  const outreach = (entries || []).filter((e) => e?.type === "outreach").length;
  const applications = (cards || []).filter((card) => TRACKED_APPLICATION_COLUMNS.includes(card?.col)).length;

  if (!entries.length && !cards.length && fallback) {
    return {
      meetings: fallback.meetings || 0,
      outreach: fallback.outreach || 0,
      applications: fallback.applications || 0,
    };
  }

  return { meetings, outreach, applications };
}

export function toDateMillis(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  }

  if (typeof value === "string") {
    const ymd = value.slice(0, 10);
    const parsedLocal = parseDateToLocalMidnight(ymd);
    if (parsedLocal) return parsedLocal.getTime();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
}

export function getCardLabel(card) {
  if (!card) return "Unknown role";
  const company = card.company?.trim();
  const title = card.title?.trim();
  return [company, title].filter(Boolean).join(" - ") || "Unknown role";
}
