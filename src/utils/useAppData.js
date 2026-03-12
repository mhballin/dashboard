import { useState, useEffect, useRef } from "react";
import { useStreak } from "./useStreak";
import {
  getCards,
  createCard,
  updateCard,
  deleteCard,
  getAllSettings,
  setSetting,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getActivityLog,
  createActivityEntry,
  getWeeklyStats,
  upsertWeeklyStats,
  getNotes,
  createNote,
  updateNote,
  deleteNote,
} from "./pb";
import { getWeekKey, todayStr, parseDateToLocalMidnight } from "./dates";
import { DEFAULT_TASKS, DEFAULT_PITCH } from "../data/defaultContent";

const TRACKED_APPLICATION_COLUMNS = ["applied", "interviewing", "closed"];

function buildCumulative(entries = [], cards = [], fallback = null) {
  const meetings = (entries || []).filter((e) => e?.type === "meetings").length;
  const outreach = (entries || []).filter((e) => e?.type === "outreach").length;
  const applications = (cards || []).filter((card) => TRACKED_APPLICATION_COLUMNS.includes(card?.col)).length;

  // Preserve legacy cumulative data only when there is no source data yet.
  if (!entries.length && !cards.length && fallback) {
    return {
      meetings: fallback.meetings || 0,
      outreach: fallback.outreach || 0,
      applications: fallback.applications || 0,
    };
  }

  return { meetings, outreach, applications };
}

export function useAppData(tab, authState) {
  const authToken = authState?.token || null;
  const authUserId = authState?.userId || null;
  const isAuthReady = !!(authToken && authUserId);

  const [loaded, setLoaded] = useState(false);
  const [weekKey] = useState(getWeekKey());
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [weekly, setWeekly] = useState({ meetings: 0, outreach: 0, applications: 0 });
  const [cumulative, setCumulative] = useState({ meetings: 0, outreach: 0, applications: 0 });
  const [kanban, setKanban] = useState([]);
  const { streak, lastActive, setStreak, setLastActive, checkIn } = useStreak();
  const [pitch, setPitch] = useState(DEFAULT_PITCH);
  const [notes, setNotes] = useState([]);
  const [quickNote, setQuickNote] = useState("");
  const [activityLog, setActivityLog] = useState([]);
  const [notesTtlHours, setNotesTtlHours] = useState(24);
  const [userSettings, setUserSettings] = useState({
    userName: "Mike Ballin",
    tempUnit: "F",
    locationOverride: null,
    weeklyTargets: { meetings: 1, outreach: 4, applications: 2 },
  });

  const weeklyPersistChainRef = useRef(Promise.resolve());
  const weeklyStatsIdRef = useRef(null);
  const tasksAddRef = useRef(null);
  const notesAddRef = useRef(null);

  // Load from PocketBase when auth is available
  useEffect(() => {
    if (!isAuthReady) {
      setLoaded(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const all = await getAllSettings();

      if (cancelled) return;

      if (all.streak !== null && all.streak !== undefined) setStreak(all.streak);
      if (all.lastActive) setLastActive(all.lastActive);
      if (all.pitch) setPitch(all.pitch);

      if (all["user-settings"]) setUserSettings((prev) => ({ ...prev, ...all["user-settings"] }));
      if (all["notes-ttl-hours"]) setNotesTtlHours(all["notes-ttl-hours"]);

      let pbNotes = [];
      try {
        pbNotes = await getNotes();
      } catch (err) {
        console.error("Failed to load notes from PB:", err);
      }

      if (cancelled) return;

      const mapPbRecord = (r) => {
        const createdAt = r.created ? Date.parse(r.created) : (r.createdAt || Date.now());
        const expiresAt = r.expiresAt ? Number(r.expiresAt) : (r.expires_at ? Number(r.expires_at) : null);
        return {
          id: r.id,
          content: r.content || r.text || "",
          text: r.content || r.text || "",
          date: r.date || todayStr(),
          createdAt,
          expiresAt,
          copiedToActivity: !!r.copiedToActivity || !!r.copied_to_activity,
        };
      };

      if (pbNotes && pbNotes.length) {
        setNotes(pbNotes.map(mapPbRecord));
      } else {
        const nb = all.notesByDate;
        const n = all.notes;
        if (nb) {
          const flat = Object.entries(nb || {}).flatMap(([dateKey, arr]) => (arr || []).map((note) => ({
            id: note.id || Date.now() + Math.random(),
            text: note.text,
            content: note.text,
            date: note.date || dateKey,
            createdAt: note.createdAt || Date.now(),
            expiresAt: note.expiresAt || null,
            copiedToActivity: !!note.copiedToActivity,
          })));
          setNotes(flat);
        } else if (n) {
          const today = todayStr();
          const initial = n && n.trim()
            ? [{ id: Date.now(), text: n, content: n, createdAt: Date.now(), date: today }]
            : [];
          setNotes(initial);
        }
      }

      const pbTasks = await getTasks();
      if (cancelled) return;
      if (pbTasks && pbTasks.length) {
        setTasks(pbTasks.map((t, i) => ({
          id: t.id,
          text: t.text,
          done: !!t.done,
          pinned: !!t.pinned,
          order: t.order ?? i,
          doneAt: t.updated || null,
        })));
      } else if (all.tasks) {
        setTasks(all.tasks);
      }

      const pbActivity = await getActivityLog();
      if (cancelled) return;
      if (pbActivity && pbActivity.length) {
        setActivityLog(pbActivity.map((e) => ({ id: e.id, date: e.date, type: e.type, note: e.note })));
      } else if (all.activityLog) {
        setActivityLog(all.activityLog);
      }

      const pbWeekly = await getWeeklyStats(weekKey);
      if (cancelled) return;
      if (pbWeekly && pbWeekly.length) {
        const w = pbWeekly[0];
        setWeekly({ applications: w.applications || 0, meetings: w.meetings || 0, outreach: w.outreach || 0 });
        weeklyStatsIdRef.current = w.id;
      } else if (all[`weekly-${weekKey}`]) {
        setWeekly(all[`weekly-${weekKey}`]);
      }

      const k = await getCards();
      if (cancelled) return;
      if (k && k.length) {
        const migratedKanban = k.map((card) => ({
          ...card,
          isHighPriority: card.isHighPriority !== undefined ? card.isHighPriority : false,
          priorityOrder: card.priorityOrder !== undefined ? card.priorityOrder : 0,
          isStarred: card.isStarred !== undefined ? card.isStarred : false,
          dates: typeof card.dates === 'string' ? JSON.parse(card.dates) : (card.dates || {}), // Parse dates if they are strings
          added: card.added || todayStr(), // Ensure added has a default value
        }));
        setKanban(migratedKanban);
        setCumulative((prev) => buildCumulative(pbActivity || [], migratedKanban, all.cumulative || prev));
      } else {
        setCumulative((prev) => buildCumulative(pbActivity || [], [], all.cumulative || prev));
      }

      // Migrate expired notes from PB (or legacy) into activity log and delete PB records
      const ttl = all["notes-ttl-hours"] || 24;
      const now = Date.now();
      const ttlMs = ttl * 60 * 60 * 1000;

      const processExpired = async (arr) => {
        for (const note of arr) {
          const expiresAt = note && note.expiresAt ? Number(note.expiresAt) : null;
          const legacyExpired = note && note.createdAt ? note.createdAt + ttlMs <= now : false;
          const isExpired = expiresAt ? expiresAt <= now : legacyExpired;
          if (note && isExpired) {
            if (!note.copiedToActivity) {
              try {
                const newEntry = { date: note.date || todayStr(), type: "note", note: note.text || note.content };
                const created = await createActivityEntry(newEntry);
                setActivityLog((prev) => [{ id: created.id, ...newEntry }, ...prev]);
              } catch (err) {
                console.error("Failed to log expired note:", err);
                setActivityLog((prev) => [{ id: Date.now() + Math.random(), date: note.date || todayStr(), type: "note", note: note.text || note.content }, ...prev]);
              }
            }
            if (note.id && typeof note.id === "string") {
              try { await deleteNote(note.id); } catch (err) { console.error("Failed to delete expired note:", err); }
            }
          }
        }
      };

      const toProcess = pbNotes && pbNotes.length ? (pbNotes.map(mapPbRecord)) : (all.notesByDate ? Object.entries(all.notesByDate).flatMap(([dateKey, arr]) => (arr || []).map((note) => ({ id: note.id, text: note.text, content: note.text, date: note.date || dateKey, createdAt: note.createdAt, expiresAt: note.expiresAt, copiedToActivity: !!note.copiedToActivity }))) : (all.notes ? [{ id: Date.now(), text: all.notes, content: all.notes, date: todayStr(), createdAt: Date.now() }] : []));
      if (toProcess.length) {
        processExpired(toProcess).catch((err) => console.error("Expired notes migration failed:", err));
      }

      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthReady, authToken, authUserId, weekKey]);

  // Keep top-level cumulative counters synced with current app state.
  useEffect(() => {
    if (!loaded) return;
    setCumulative((prev) => {
      const next = buildCumulative(activityLog, kanban, prev);
      if (
        next.meetings === prev.meetings
        && next.outreach === prev.outreach
        && next.applications === prev.applications
      ) {
        return prev;
      }
      return next;
    });
  }, [activityLog, kanban, loaded]);

  // Persist TTL setting when changed
  useEffect(() => {
    if (loaded) setSetting("notes-ttl-hours", notesTtlHours);
  }, [notesTtlHours, loaded]);

  // Periodic migration: run every 30 minutes to move expired notes to activity
  useEffect(() => {
    if (!loaded) return;
    const migrate = async () => {
      const ttlMs = notesTtlHours * 60 * 60 * 1000;
      const now = Date.now();
      setNotes((prev) => {
        const keep = [];
        const expired = [];
        for (const note of prev || []) {
          const expiresAt = note && note.expiresAt ? Number(note.expiresAt) : null;
          const legacyExpired = note && note.createdAt ? note.createdAt + ttlMs <= now : false;
          const isExpired = expiresAt ? expiresAt <= now : legacyExpired;
          if (note && isExpired) expired.push(note);
          else keep.push(note);
        }
        if (expired.length) {
          (async () => {
            for (const n of expired) {
              try {
                if (!n.copiedToActivity) {
                  const newEntry = { date: n.date || todayStr(), type: "note", note: n.text || n.content };
                  const created = await createActivityEntry(newEntry);
                  setActivityLog((prev) => [{ id: created.id, ...newEntry }, ...prev]);
                }
              } catch (err) {
                console.error("Failed to add activity for expired note:", err);
                setActivityLog((prev) => [{ id: Date.now() + Math.random(), date: n.date || todayStr(), type: "note", note: n.text || n.content }, ...prev]);
              }
              if (n.id && typeof n.id === "string") {
                try { await deleteNote(n.id); } catch (err) { console.error("Failed to delete expired note:", err); }
              }
            }
          })();
        }
        return keep;
      });
    };
    const id = setInterval(migrate, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [loaded, notesTtlHours]);

  // Persist state changes
  useEffect(() => {
    if (loaded) setSetting("cumulative", cumulative);
  }, [cumulative, loaded]);

  useEffect(() => {
    if (loaded) setSetting("streak", streak);
  }, [streak, loaded]);

  useEffect(() => {
    if (loaded) setSetting("lastActive", lastActive);
  }, [lastActive, loaded]);

  useEffect(() => {
    if (loaded) setSetting("pitch", pitch);
  }, [pitch, loaded]);

  useEffect(() => {
    if (loaded) setSetting("user-settings", userSettings);
  }, [userSettings, loaded]);

  // Auto check-in when navigating to dashboard tab
  useEffect(() => {
    if (tab === "dashboard") checkIn();
  }, [tab]);

  const persistWeekly = async (data) => {
    weeklyPersistChainRef.current = weeklyPersistChainRef.current
      .then(async () => {
        try {
          const result = await upsertWeeklyStats(weekKey, data, weeklyStatsIdRef.current);
          if (result && result.id) weeklyStatsIdRef.current = result.id;
        } catch (err) {
          console.error("Failed to persist weekly stats:", err);
        }
      })
      .catch((err) => {
        console.error("persistWeekly chain error:", err);
      });
  };

  const inc = (key) => {
    setWeekly((w) => {
      const next = { ...w, [key]: (w[key] || 0) + 1 };
      persistWeekly(next);
      return next;
    });
  };

  const dec = (key) => {
    setWeekly((w) => {
      const next = { ...w, [key]: Math.max(0, (w[key] || 0) - 1) };
      persistWeekly(next);
      return next;
    });
  };

  const addLog = async (entry) => {
    const newEntry = { date: entry.date || todayStr(), type: entry.type || "note", note: entry.note || "" };
    try {
      const created = await createActivityEntry(newEntry);
      setActivityLog((prev) => [{ id: created.id, ...newEntry }, ...prev]);
    } catch (err) {
      console.error("Failed to create activity entry:", err);
      setActivityLog((prev) => [{ id: Date.now(), ...newEntry }, ...prev]);
    }
  };

  const handleCardCreate = async (card) => {
    try {
      const created = await createCard(card);
      if (created && created.id) {
        setKanban((prev) => prev.map((c) => c.id === card.id ? { ...card, ...created } : c));
      }
    } catch (err) {
      console.error("Failed to create card:", err);
    }
  };

  const handleCardUpdate = async (id, changes) => {
    try {
      await updateCard(id, changes);
    } catch (err) {
      console.error("Failed to update card:", err);
    }
  };

  const handleCardDelete = async (id) => {
    try {
      if (typeof id === 'string' && id.length === 15) {
        await deleteCard(id);
      }
    } catch (err) {
      console.error("Failed to delete card:", err);
    }
  };

  const handleTaskCreate = async (task) => {
    try {
      const created = await createTask({ text: task.text, done: !!task.done, pinned: !!task.pinned, order: task.order ?? 0 });
      if (created && created.id) {
        setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, id: created.id } : t));
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  const handleTaskUpdate = async (id, changes) => {
    try {
      if (typeof id === "string") await updateTask(id, changes);
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  const handleTaskDelete = async (id) => {
    try {
      if (typeof id === "string") await deleteTask(id);
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handleQuickNoteAdd = async (text) => {
    const today = todayStr();
    const now = Date.now();
    const body = {
      content: text,
      date: today,
      copiedToActivity: true,
      expiresAt: now + notesTtlHours * 60 * 60 * 1000,
    };
    try {
      const created = await createNote(body);
      const mapped = {
        id: created.id,
        content: created.content || body.content,
        text: created.content || body.content,
        date: created.date || body.date,
        createdAt: created.created ? Date.parse(created.created) : now,
        expiresAt: created.expiresAt ? Number(created.expiresAt) : body.expiresAt,
        copiedToActivity: !!created.copiedToActivity,
      };
      setNotes((prev) => [mapped, ...(prev || [])]);
    } catch (err) {
      console.error("Failed to create PB note, falling back to local:", err);
      const fallback = { id: Date.now(), text, content: text, date: today, createdAt: now, expiresAt: now + notesTtlHours * 60 * 60 * 1000, copiedToActivity: true };
      setNotes((prev) => [fallback, ...(prev || [])]);
    }
    addLog({ date: today, type: "note", note: text });
  };

  const handleQuickNoteDelete = async (noteToDelete) => {
    if (!noteToDelete || !noteToDelete.id) return;
    if (noteToDelete.id && typeof noteToDelete.id === "string") {
      try { await deleteNote(noteToDelete.id); } catch (err) { console.error("Failed to delete PB note:", err); }
    }
    setNotes((prev) => (prev || []).filter((n) => !(n && n.id === noteToDelete.id)));
  };

  const activeQuickNotes = (notes || [])
    .filter(Boolean)
    .map((note) => ({ ...note, text: note.text || note.content }))
    .filter((note) => {
      if (note.expiresAt) return Number(note.expiresAt) > Date.now();
      if (!note.createdAt) return true;
      return note.createdAt + notesTtlHours * 60 * 60 * 1000 > Date.now();
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const tasksAdd = tasksAddRef;
  const notesAdd = notesAddRef;

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.defaultPrevented) return;
      try {
        const active = document.activeElement;
        if (active) {
          const tag = (active.tagName || "").toLowerCase();
          const isEditable = active.isContentEditable || tag === "input" || tag === "textarea" || tag === "select";
          if (isEditable) return;
        }
      } catch (err) {}

      const k = (e.key || "").toLowerCase();
      const hasModifier = e.altKey || e.metaKey || e.ctrlKey;
      const accept = !hasModifier || e.altKey;
      if (!accept) return;
      if (k === "t") {
        e.preventDefault();
        tasksAddRef.current?.();
      } else if (k === "n") {
        e.preventDefault();
        notesAddRef.current?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Compute weekly applications from kanban cards
  const weeklyApplications = kanban.filter((card) => {
    if (!["applied", "interviewing", "closed"].includes(card.col)) return false;
    if (!card.dates?.applied) return false;
    const [year, week] = weekKey.split("-W").map(Number);
    const jan4 = new Date(year, 0, 4);
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const applied = parseDateToLocalMidnight(card.dates.applied);
    return applied && applied.getTime() >= monday.getTime() && applied.getTime() <= sunday.getTime();
  }).length;

  const handleDeleteActivity = (id) => {
    setActivityLog((prev) => prev.filter((e) => e.id !== id));
  };

  return {
    loaded,
    weekKey,
    tasks,
    setTasks,
    weekly,
    cumulative,
    kanban,
    setKanban,
    streak,
    lastActive,
    pitch,
    setPitch,
    quickNote,
    setQuickNote,
    activityLog,
    activeQuickNotes,
    notesTtlHours,
    setNotesTtlHours,
    userSettings,
    setUserSettings,
    tasksAddRef,
    notesAddRef,
    inc,
    dec,
    addLog,
    handleCardCreate,
    handleCardUpdate,
    handleCardDelete,
    handleTaskCreate,
    handleTaskUpdate,
    handleTaskDelete,
    handleQuickNoteAdd,
    handleQuickNoteDelete,
    weeklyApplications,
    weekKey,
    handleDeleteActivity,
  };
}
