import { useState, useEffect, useRef } from "react";
import { Tasks } from "./components/Tasks";
import { WeekTargets } from "./components/WeekTargets";
import { KanbanBoard } from "./components/KanbanBoard";
import { JobBoardsTab } from "./components/JobBoardsTab";
import { ActivityLog } from "./components/ActivityLog";
import DashboardTab from "./components/DashboardTab";
import { SettingsTab } from "./components/SettingsTab";
import ErrorBoundary from "./components/ErrorBoundary";
import ProfileTab from "./components/ProfileTab";
import LoginScreen from "./components/LoginScreen";
import AppHeader from "./components/AppHeader";
import { useStreak } from "./utils/useStreak";
import { isLoggedIn, login, logout, getCards, createCard, updateCard, deleteCard, getAllSettings, setSetting, getTasks, createTask, updateTask, deleteTask, getActivityLog, createActivityEntry, deleteActivityEntry, getWeeklyStats, upsertWeeklyStats, getNotes, createNote, updateNote, deleteNote } from "./utils/pb";
import { getWeekKey, todayStr, parseDateToLocalMidnight } from "./utils/dates";
import { DEFAULT_TASKS, DEFAULT_PITCH } from "./data/defaultContent";

const cardStyle = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
  border: "1px solid #ede9e3",
};

const lbl = {
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#9ca3af",
};

function App() {
  const [authed, setAuthed] = useState(isLoggedIn());
  const weeklyPersistChainRef = useRef(Promise.resolve());

  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [weekKey] = useState(getWeekKey());
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [weekly, setWeekly] = useState({ meetings: 0, outreach: 0, applications: 0 });
  const [cumulative, setCumulative] = useState({ meetings: 15, outreach: 0, applications: 0 });
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

  // Load from PocketBase on mount
  useEffect(() => {
    (async () => {
      // Load all settings in one request
      const all = await getAllSettings();

      
      if (all.cumulative) setCumulative(all.cumulative);
      if (all.streak !== null && all.streak !== undefined) setStreak(all.streak);
      if (all.lastActive) setLastActive(all.lastActive);
      if (all.pitch) setPitch(all.pitch);
      
      if (all['user-settings']) setUserSettings((prev) => ({ ...prev, ...all['user-settings'] }));
      if (all['notes-ttl-hours']) setNotesTtlHours(all['notes-ttl-hours']);

      // Load notes from PocketBase first, fallback to legacy settings blob
      let pbNotes = [];
      try {
        pbNotes = await getNotes();
      } catch (err) {
        console.error("Failed to load notes from PB:", err);
      }

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
        // Fallback to legacy settings-based notes
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
      // Load tasks from tasks collection
      const pbTasks = await getTasks();
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
        // Fallback to settings blob if no records yet
        setTasks(all.tasks);
      }

      // Load activity log from activity_log collection
      const pbActivity = await getActivityLog();
      if (pbActivity && pbActivity.length) {
        setActivityLog(pbActivity.map((e) => ({
          id: e.id,
          date: e.date,
          type: e.type,
          note: e.note,
        })));
      } else if (all.activityLog) {
        setActivityLog(all.activityLog);
      }

      // Load weekly stats from weekly_stats collection
      const pbWeekly = await getWeeklyStats(weekKey);
      if (pbWeekly && pbWeekly.length) {
        const w = pbWeekly[0];
            setWeekly({ applications: w.applications || 0, meetings: w.meetings || 0, outreach: w.outreach || 0 });
            weeklyStatsIdRef.current = w.id;
      } else if (all[`weekly-${weekKey}`]) {
        setWeekly(all[`weekly-${weekKey}`]);
      }

      // Load cards from cards collection (individual records)
      const k = await getCards();
      if (k && k.length) {
        const migratedKanban = k.map((card) => ({
          ...card,
          isHighPriority: card.isHighPriority !== undefined ? card.isHighPriority : false,
          priorityOrder: card.priorityOrder !== undefined ? card.priorityOrder : 0,
          isStarred: card.isStarred !== undefined ? card.isStarred : false,
        }));
        setKanban(migratedKanban);
      }

      // Migrate expired notes from PB (or legacy) into activity log and delete PB records
      const ttl = all['notes-ttl-hours'] || 24;
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
                const newEntry = { date: note.date || todayStr(), type: 'note', note: note.text || note.content };
                const created = await createActivityEntry(newEntry);
                setActivityLog((prev) => [{ id: created.id, ...newEntry }, ...prev]);
              } catch (err) {
                console.error('Failed to log expired note:', err);
                setActivityLog((prev) => [{ id: Date.now() + Math.random(), date: note.date || todayStr(), type: 'note', note: note.text || note.content }, ...prev]);
              }
            }
            // delete PB record if it exists (string id)
            if (note.id && typeof note.id === 'string') {
              try { await deleteNote(note.id); } catch (err) { console.error('Failed to delete expired note:', err); }
            }
          }
        }
      };

      // Run migration for PB-loaded notes (or the fallback flat list)
      const toProcess = pbNotes && pbNotes.length ? (pbNotes.map(mapPbRecord)) : (all.notesByDate ? Object.entries(all.notesByDate).flatMap(([dateKey, arr]) => (arr || []).map((note) => ({ id: note.id, text: note.text, content: note.text, date: note.date || dateKey, createdAt: note.createdAt, expiresAt: note.expiresAt, copiedToActivity: !!note.copiedToActivity }))) : (all.notes ? [{ id: Date.now(), text: all.notes, content: all.notes, date: todayStr(), createdAt: Date.now() }] : []));
      if (toProcess.length) {
        processExpired(toProcess).catch((err) => console.error('Expired notes migration failed:', err));
      }

      setLoaded(true);
    })();
  }, []);

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
          // handle expired notes async (log + delete PB records)
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

  // NOTE: kanban is persisted via individual card handlers; no bulk sync here

  useEffect(() => {
    if (loaded) setSetting("streak", streak);
  }, [streak, loaded]);

  useEffect(() => {
    if (loaded) setSetting("lastActive", lastActive);
  }, [lastActive, loaded]);

  useEffect(() => {
    if (loaded) setSetting("pitch", pitch);
  }, [pitch, loaded]);

  // notesByDate persisted to settings removed — notes now live in PocketBase


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
        // swallow errors to keep chain alive
        console.error("persistWeekly chain error:", err);
      });
  };

  const inc = (key) => {
    setWeekly((w) => {
      const next = { ...w, [key]: (w[key] || 0) + 1 };
      persistWeekly(next);
      return next;
    });
    setCumulative((c) => ({ ...c, [key]: (c[key] || 0) + 1 }));
  };

  const dec = (key) => {
    setWeekly((w) => {
      const next = { ...w, [key]: Math.max(0, (w[key] || 0) - 1) };
      persistWeekly(next);
      return next;
    });
    setCumulative((c) => ({ ...c, [key]: Math.max(0, (c[key] || 0) - 1) }));
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

  // Handler for quick-note adds from WeekTargets: create PB note and copy to Activity immediately
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
    // Always create activity entry
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

  

  const tasksAddRef = useRef(null);
  const notesAddRef = useRef(null);
  const weeklyStatsIdRef = useRef(null);

  // Global keyboard shortcuts: plain `t` / `n` when not typing, Alt fallback
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
      } catch (err) {
        // ignore DOM access errors
      }

      const k = (e.key || "").toLowerCase();
      // Allow plain keypresses (no ctrl/meta/alt) — shift is permitted —
      // or Alt/Option as a fallback for systems where plain keys conflict.
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
    // Get Monday of the current week from weekKey (format "YYYY-WNN")
    const [year, week] = weekKey.split("-W").map(Number);
    const jan4 = new Date(year, 0, 4);
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const applied = parseDateToLocalMidnight(card.dates.applied);
    return applied && applied.getTime() >= monday.getTime() && applied.getTime() <= sunday.getTime();
  }).length;

  

  function handleLogout() {
    logout();
    setAuthed(false);
  }

  if (!authed) {
    return <LoginScreen onLogin={async (email, password) => { await login(email, password); setAuthed(true); }} />;
  }

  if (!loaded) {
    return (
      <ErrorBoundary>
        <div
          style={{
            minHeight: "100vh",
            background: "#f7f5f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            color: "#9ca3af",
          }}
        >
          Loading…
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div style={{ minHeight: "100vh", background: "#f7f5f0", paddingBottom: 60 }}>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />

        {/* Header */}
        <AppHeader userName={userSettings.userName} weekKey={weekKey} cumulative={cumulative} tab={tab} setTab={setTab} onLogout={handleLogout} />

        <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto" }}>
          {/* ── DASHBOARD TAB ── */}
          {tab === "dashboard" && (
            <DashboardTab
              streak={streak}
              lastActive={lastActive}
              tempUnit={userSettings.tempUnit}
              locationOverride={userSettings.locationOverride}
              tasks={tasks}
              setTasks={setTasks}
              onTaskCreate={handleTaskCreate}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
              tasksAddRef={tasksAddRef}
              weekly={weekly}
              weeklyApplications={weeklyApplications}
              targets={userSettings.weeklyTargets}
              onInc={inc}
              onDec={dec}
              onLog={addLog}
              quickNote={quickNote}
              setQuickNote={setQuickNote}
              onQuickNoteAdd={handleQuickNoteAdd}
              quickNoteAddRef={notesAddRef}
              activeNotes={activeQuickNotes}
              onQuickNoteDelete={handleQuickNoteDelete}
            />
          )}

          {/* ── ACTIVITY TAB ── */}
          {tab === "activity" && (
            <ActivityLog
              entries={activityLog}
              onDelete={(id) => {
                setActivityLog((prev) => prev.filter((e) => e.id !== id));
                if (typeof id === "string") deleteActivityEntry(id).catch((err) => console.error("Failed to delete activity:", err));
              }}
            />
          )}

          {/* ── APPLICATIONS TAB ── */}
          {tab === "applications" && (
            <div style={{ ...cardStyle, padding: "24px 26px" }}>
              <KanbanBoard
                cards={kanban}
                setCards={setKanban}
                onLog={addLog}
                onCardCreate={handleCardCreate}
                onCardUpdate={handleCardUpdate}
                onCardDelete={handleCardDelete}
              />
            </div>
          )}

          {/* ── JOB BOARDS TAB ── */}
          {tab === "jobboards" && <JobBoardsTab />}

          {/* ── PROFILE TAB ── */}
          {tab === "profile" && (
            <ProfileTab pitch={pitch} setPitch={setPitch} />
          )}

          {/* ── SETTINGS TAB ── */}
          {tab === "settings" && (
            <div style={{ ...cardStyle, padding: "24px 26px" }}>
              <SettingsTab
                userSettings={userSettings}
                setUserSettings={setUserSettings}
                notesTtlHours={notesTtlHours}
                setNotesTtlHours={setNotesTtlHours}
              />
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;

