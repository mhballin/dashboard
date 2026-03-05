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
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

// Get current local timestamp (YYYY-MM-DD HH:MM)
export function nowTimestamp() {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${date} ${time}`;
}
