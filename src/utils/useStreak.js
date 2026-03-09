import { useState, useCallback } from "react";
import { todayStr } from "./dates";

function getLastValidWeekday() {
  const lastDay = new Date();
  lastDay.setDate(lastDay.getDate() - 1);
  while (lastDay.getDay() === 0 || lastDay.getDay() === 6) {
    lastDay.setDate(lastDay.getDate() - 1);
  }
  return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(
    lastDay.getDate()
  ).padStart(2, "0")}`;
}

export function useStreak() {
  const [streak, setStreak] = useState(0);
  const [lastActive, setLastActive] = useState(null);

  const checkIn = useCallback(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    // Skip on weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) return;

    const todayString = todayStr();
    if (lastActive === todayString) return;

    const lastValidWeekday = getLastValidWeekday();
    setStreak((prev) => (lastActive === lastValidWeekday ? prev + 1 : 1));
    setLastActive(todayString);
  }, [lastActive]);

  return { streak, lastActive, setStreak, setLastActive, checkIn };
}
