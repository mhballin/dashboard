import { useState, useRef, useMemo } from "react";
import { createCard, updateCard, deleteCard } from "./pb";
import { toDateMillis } from "./appDataUtils";
import { THREE_DAYS_MS, CRM_STALE_THRESHOLD_DAYS, PRIORITY_REASON_SCORES } from "./appDataUtils";
import { parseDateToLocalMidnight } from "./dates";

// TODO: unused export — confirm or remove
export function useKanban({ weekKey } = {}) {
  const [kanban, setKanban] = useState([]);
  const pendingCreates = useRef(new Map());

  const resolveId = async (id) => {
    if (!pendingCreates.current.has(id)) return id;
    const pending = pendingCreates.current.get(id);
    try {
      const record = await pending;
      return record?.id || id;
    } finally {
      pendingCreates.current.delete(id);
    }
  };

  const handleCardCreate = async (card) => {
    const tempId = card.id;
    const createPromise = createCard(card);
    pendingCreates.current.set(tempId, createPromise);
    try {
      const created = await createPromise;
      if (created && created.id) {
        setKanban((prev) => prev.map((c) => (c.id === card.id ? { ...card, ...created } : c)));
      }
    } catch (err) {
      pendingCreates.current.delete(tempId);
      console.error("Failed to create card:", err);
    }
  };

  const handleCardUpdate = async (id, changes) => {
    try {
      const realId = await resolveId(id);
      await updateCard(realId, changes);
    } catch (err) {
      console.error("Failed to update card:", err);
    }
  };

  const handleCardDelete = async (id) => {
    try {
      const realId = await resolveId(id);
      await deleteCard(realId);
      setKanban((prev) => (prev || []).filter((c) => c.id !== id && c.id !== realId));
    } catch (err) {
      console.error("Failed to delete card:", err);
    }
  };

  const handleUpdateCardField = async (cardId, fieldName, value) => {
    try {
      const realId = await resolveId(cardId);
      setKanban((prev) => prev.map((card) => (
        card.id === cardId || card.id === realId
          ? { ...card, [fieldName]: value }
          : card
      )));
      await updateCard(realId, { [fieldName]: value });
    } catch (err) {
      console.error("Failed to update card field:", err);
    }
  };

  const handleUpdateInterviewNotes = async (cardId, notesArray) => {
    try {
      const realId = await resolveId(cardId);
      const nextNotes = Array.isArray(notesArray) ? notesArray : [];
      setKanban((prev) => prev.map((card) => (
        card.id === cardId || card.id === realId
          ? { ...card, interviewNotes: nextNotes }
          : card
      )));
      await updateCard(realId, { interviewNotes: nextNotes });
    } catch (err) {
      console.error("Failed to update interview notes:", err);
    }
  };

  const handleToggleStarred = async (cardId) => {
    const card = (kanban || []).find((c) => c.id === cardId);
    const nextStarred = !(card?.starred === true);
    await handleUpdateCardField(cardId, "starred", nextStarred);
  };

  const weeklyApplications = useMemo(() => {
    try {
      if (!weekKey) return 0;
      const [year, week] = weekKey.split("-W").map(Number);
      const jan4 = new Date(year, 0, 4);
      const monday = new Date(jan4);
      monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return (kanban || []).filter((card) => {
        if (!["applied", "interviewing", "closed"].includes(card.col)) return false;
        if (!card.dates?.applied) return false;
        const applied = parseDateToLocalMidnight(card.dates.applied);
        return applied && applied.getTime() >= monday.getTime() && applied.getTime() <= sunday.getTime();
      }).length;
    } catch {
      return 0;
    }
  }, [kanban, weekKey]);

  const followUpsDueToday = useMemo(() => {
    const todayMillis = toDateMillis(new Date());
    return (kanban || []).filter((card) => {
      const followUpMillis = toDateMillis(card.followUpDate);
      if (followUpMillis === null || followUpMillis !== todayMillis) return false;
      const snoozeMillis = toDateMillis(card.reminderSnoozedUntil);
      return snoozeMillis === null || snoozeMillis < todayMillis;
    });
  }, [kanban]);

  const overdueFollowUps = useMemo(() => {
    const todayMillis = toDateMillis(new Date());
    return (kanban || []).filter((card) => {
      const followUpMillis = toDateMillis(card.followUpDate);
      if (followUpMillis === null || followUpMillis >= todayMillis) return false;
      const snoozeMillis = toDateMillis(card.reminderSnoozedUntil);
      return snoozeMillis === null || snoozeMillis < todayMillis;
    });
  }, [kanban]);

  const upcomingDeadlines = useMemo(() => {
    const now = Date.now();
    return (kanban || []).filter((card) => {
      const deadlineMillis = toDateMillis(card.deadline);
      if (deadlineMillis === null) return false;
      return deadlineMillis >= now && deadlineMillis <= now + THREE_DAYS_MS;
    });
  }, [kanban]);

  const staleApplications = useMemo(() => {
    const now = Date.now();
    return (kanban || []).filter((card) => {
      if (!card || !["applied", "interviewing"].includes(card.col)) return false;
      const stageDate = card.dates?.[card.col] || card.dates?.applied || card.added;
      const stageMillis = toDateMillis(stageDate);
      if (stageMillis === null) return false;
      return now - stageMillis > CRM_STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
    });
  }, [kanban]);

  const priorityQueue = useMemo(() => {
    const byCardId = new Map();

    const applyPriority = (cards, reasonScore) => {
      for (const card of cards) {
        const key = String(card?.id ?? `${card?.company || "unknown"}-${card?.title || "unknown"}`);
        const existing = byCardId.get(key);
        if (!existing || reasonScore.score > existing.score) {
          byCardId.set(key, { card, reason: reasonScore.reason, score: reasonScore.score });
        }
      }
    };

    applyPriority(overdueFollowUps, PRIORITY_REASON_SCORES.OVERDUE_FOLLOW_UP);
    applyPriority(upcomingDeadlines, PRIORITY_REASON_SCORES.UPCOMING_DEADLINE);
    applyPriority(staleApplications, PRIORITY_REASON_SCORES.STALE_APPLICATION);
    applyPriority((kanban || []).filter((card) => !!(card?.starred || card?.isStarred)), PRIORITY_REASON_SCORES.STARRED);
    applyPriority(followUpsDueToday, PRIORITY_REASON_SCORES.FOLLOW_UP_TODAY);

    return Array.from(byCardId.values()).sort((a, b) => b.score - a.score);
  }, [kanban, followUpsDueToday, overdueFollowUps, upcomingDeadlines, staleApplications]);

  return {
    kanban,
    setKanban,
    handleCardCreate,
    handleCardUpdate,
    handleCardDelete,
    handleUpdateCardField,
    handleUpdateInterviewNotes,
    handleToggleStarred,
    weeklyApplications,
    followUpsDueToday,
    overdueFollowUps,
    upcomingDeadlines,
    staleApplications,
    priorityQueue,
  };
}

// TODO: unused export — confirm or remove
export default useKanban;
