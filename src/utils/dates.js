// Get ISO week key (e.g. "2026-W09")
export function getWeekKey() {
  const d = new Date();
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const y = d.getFullYear();
  const start = new Date(y, 0, 1);
  return `${y}-W${String(Math.ceil(((d - start) / 86400000 + 1) / 7)).padStart(2, "0")}`;
}

// Get today as ISO string (YYYY-MM-DD)
export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
