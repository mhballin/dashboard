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
import { useStreak } from "./utils/useStreak";
import { S } from "./utils/storage";
import { isLoggedIn, login, logout } from "./utils/pb";
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

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "activity", label: "Activity" },
  { id: "applications", label: "Applications" },
  { id: "jobboards", label: "Job Boards & Keywords" },
  { id: "profile", label: "Profile" },
  { id: "settings", label: "Settings" },
];

function App() {
  const [authed, setAuthed] = useState(isLoggedIn());
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [weekKey] = useState(getWeekKey());
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [weekly, setWeekly] = useState({ meetings: 0, outreach: 0, applications: 0 });
  const [cumulative, setCumulative] = useState({ meetings: 15, outreach: 0, applications: 0 });
  const [kanban, setKanban] = useState([]);
  const { streak, lastActive, setStreak, setLastActive, checkIn } = useStreak();
  const [pitch, setPitch] = useState(DEFAULT_PITCH);
  const [notesByDate, setNotesByDate] = useState({});
  const [quickNote, setQuickNote] = useState("");
  const [activityLog, setActivityLog] = useState([]);
  const [notesTtlHours, setNotesTtlHours] = useState(24);
  const [userSettings, setUserSettings] = useState({
    userName: "Mike Ballin",
    tempUnit: "F",
    locationOverride: null,
    weeklyTargets: { meetings: 1, outreach: 4, applications: 2 },
  });

  // Load from storage on mount
  useEffect(() => {
    (async () => {
      const [t, w, c, k, st, la, p, n, nb, a, u] = await Promise.all([
        S.get("tasks"),
        S.get(`weekly-${weekKey}`),
        S.get("cumulative"),
        S.get("kanban"),
        S.get("streak"),
        S.get("lastActive"),
        S.get("pitch"),
        S.get("notes"),
        S.get("notesByDate"),
        S.get("activityLog"),
        S.get("user-settings"),
      ]);
      if (t) setTasks(t);
      if (w) setWeekly(w);
      if (c) setCumulative(c);
      if (k) {
        // Migrate existing cards to add priority and star fields
        const migratedKanban = k.map((card) => ({
          ...card,
          isHighPriority: card.isHighPriority !== undefined ? card.isHighPriority : false,
          priorityOrder: card.priorityOrder !== undefined ? card.priorityOrder : 0,
          isStarred: card.isStarred !== undefined ? card.isStarred : false,
        }));
        setKanban(migratedKanban);
      }
      if (st !== null) setStreak(st);
      if (la) setLastActive(la);
      if (p) setPitch(p);
      // notesByDate migration: prefer new map, fallback to legacy notes string
      if (nb) {
        setNotesByDate(nb || {});
      } else if (n) {
        const today = todayStr();
        const initial = n && n.trim() ? { [today]: [{ id: Date.now(), text: n, createdAt: Date.now(), date: today }] } : {};
        setNotesByDate(initial);
      }
      if (a) setActivityLog(a);
      if (u) setUserSettings((prev) => ({ ...prev, ...u }));
      // Load TTL setting (hours)
      const ttl = await S.get("notes-ttl-hours");
      if (ttl) setNotesTtlHours(ttl);

      // After initial load, migrate any notes older than TTL into activityLog
      const migratedLogs = [];
      const kept = {};
      const source = nb || (n && n.trim() ? { [todayStr()]: [{ id: Date.now(), text: n, createdAt: Date.now(), date: todayStr() }] } : {});
      const now = Date.now();
      const ttlMs = (ttl || 24) * 60 * 60 * 1000;
      for (const [dateKey, arr] of Object.entries(source || {})) {
        const keep = [];
        for (const note of arr) {
          const expiresAt = note && note.expiresAt ? Number(note.expiresAt) : null;
          const legacyExpired = note && note.createdAt ? note.createdAt + ttlMs <= now : false;
          const isExpired = expiresAt ? expiresAt <= now : legacyExpired;
          if (note && isExpired) {
            // If the note hasn't been copied to activity yet, create an activity entry.
            if (!note.copiedToActivity) {
              migratedLogs.push({ id: Date.now() + Math.random(), date: note.date || dateKey, type: "note", note: note.text });
            }
            // do not keep the note (expired)
          } else if (note) {
            keep.push(note);
          }
        }
        if (keep.length) kept[dateKey] = keep;
      }
      if (Object.keys(kept).length) setNotesByDate(kept);
      if (migratedLogs.length) setActivityLog((prev) => [...migratedLogs, ...prev]);
      setLoaded(true);
    })();
  }, []);

  // Persist TTL setting when changed
  useEffect(() => {
    if (loaded) S.set("notes-ttl-hours", notesTtlHours);
  }, [notesTtlHours, loaded]);

  // Periodic migration: run every 30 minutes to move expired notes to activity
  useEffect(() => {
    if (!loaded) return;
    const migrate = () => {
      const ttlMs = notesTtlHours * 60 * 60 * 1000;
      setNotesByDate((prev) => {
        const now = Date.now();
        const newNotes = {};
        const newActivities = [];
        for (const [dateKey, arr] of Object.entries(prev || {})) {
          for (const note of arr) {
            const expiresAt = note && note.expiresAt ? Number(note.expiresAt) : null;
            const legacyExpired = note && note.createdAt ? note.createdAt + ttlMs <= now : false;
            const isExpired = expiresAt ? expiresAt <= now : legacyExpired;
            if (note && isExpired) {
              if (!note.copiedToActivity) {
                newActivities.push({ id: Date.now() + Math.random(), date: note.date || dateKey, type: "note", note: note.text });
              }
              // drop note (expired)
            } else {
              newNotes[dateKey] = newNotes[dateKey] || [];
              newNotes[dateKey].push(note);
            }
          }
        }
        if (newActivities.length) setActivityLog((prevA) => [...newActivities, ...prevA]);
        return newNotes;
      });
    };
    const id = setInterval(migrate, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [loaded, notesTtlHours]);

  // Persist state changes
  useEffect(() => {
    if (loaded) S.set("tasks", tasks);
  }, [tasks, loaded]);

  useEffect(() => {
    if (loaded) S.set(`weekly-${weekKey}`, weekly);
  }, [weekly, loaded]);

  useEffect(() => {
    if (loaded) S.set("cumulative", cumulative);
  }, [cumulative, loaded]);

  useEffect(() => {
    if (loaded) S.set("kanban", kanban);
  }, [kanban, loaded]);

  useEffect(() => {
    if (loaded) S.set("streak", streak);
  }, [streak, loaded]);

  useEffect(() => {
    if (loaded) S.set("lastActive", lastActive);
  }, [lastActive, loaded]);

  useEffect(() => {
    if (loaded) S.set("pitch", pitch);
  }, [pitch, loaded]);

  useEffect(() => {
    if (loaded) S.set("notesByDate", notesByDate);
  }, [notesByDate, loaded]);

  useEffect(() => {
    if (loaded) S.set("activityLog", activityLog);
  }, [activityLog, loaded]);

  useEffect(() => {
    if (loaded) S.set("user-settings", userSettings);
  }, [userSettings, loaded]);

  // Auto check-in when navigating to dashboard tab
  useEffect(() => {
    if (tab === "dashboard") checkIn();
  }, [tab]);

  const inc = (key) => {
    setWeekly((w) => ({ ...w, [key]: (w[key] || 0) + 1 }));
    setCumulative((c) => ({ ...c, [key]: (c[key] || 0) + 1 }));
  };

  const dec = (key) => {
    setWeekly((w) => ({ ...w, [key]: Math.max(0, (w[key] || 0) - 1) }));
    setCumulative((c) => ({ ...c, [key]: Math.max(0, (c[key] || 0) - 1) }));
  };

  const addLog = (entry) => {
    setActivityLog((prev) => [{ ...entry, id: Date.now(), date: entry.date || todayStr() }, ...prev]);
  };

  // Handler for quick-note adds from WeekTargets: create dashboard note and copy to Activity immediately
  const handleQuickNoteAdd = (text) => {
    const today = todayStr();
    const now = Date.now();
    const note = {
      id: Date.now(),
      text,
      createdAt: now,
      date: today,
      copiedToActivity: true,
      expiresAt: now + notesTtlHours * 60 * 60 * 1000,
    };
    setNotesByDate((prev) => ({ ...prev, [today]: [...(prev[today] || []), note] }));
    addLog({ date: today, type: "note", note: text });
  };

  const handleQuickNoteDelete = (noteToDelete) => {
    if (!noteToDelete || !noteToDelete.id) return;
    setNotesByDate((prev) => {
      const next = {};
      for (const [dateKey, arr] of Object.entries(prev || {})) {
        const kept = (arr || []).filter((note) => !(note && note.id === noteToDelete.id));
        if (kept.length) next[dateKey] = kept;
      }
      return next;
    });
  };

  const activeQuickNotes = Object.entries(notesByDate || {})
    .flatMap(([dateKey, arr]) =>
      (arr || []).filter(Boolean).map((note) => ({ ...note, date: note.date || dateKey }))
    )
    .filter((note) => {
      if (note.expiresAt) return Number(note.expiresAt) > Date.now();
      if (!note.createdAt) return true;
      return note.createdAt + notesTtlHours * 60 * 60 * 1000 > Date.now();
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  

  const tasksAddRef = useRef(null);
  const notesAddRef = useRef(null);

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

  async function handleLogin(e) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      await login(loginEmail, loginPassword);
      setAuthed(true);
    } catch (err) {
      setLoginError(err.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    logout();
    setAuthed(false);
  }

  if (!authed) {
    return (
      <ErrorBoundary>
        <div style={{
          minHeight: "100vh",
          background: "#f7f5f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
          <div style={{
            background: "#ffffff",
            borderRadius: 20,
            border: "1px solid #ede9e3",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
            padding: "40px 36px",
            width: "100%",
            maxWidth: 380,
          }}>
            <div style={{ fontWeight: 800, fontSize: 22, color: "#1a1a1a", marginBottom: 4 }}>
              Job Search HQ
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 28 }}>
              Sign in to continue
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="email"
                placeholder="Email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 14,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  outline: "none",
                }}
              />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin(e)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 14,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  outline: "none",
                }}
              />
              {loginError && (
                <div style={{ fontSize: 13, color: "#dc2626" }}>{loginError}</div>
              )}
              <button
                onClick={handleLogin}
                disabled={loginLoading}
                style={{
                  padding: "11px 0",
                  borderRadius: 8,
                  border: "none",
                  background: loginLoading ? "#9ca3af" : "#16a34a",
                  color: "#ffffff",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: loginLoading ? "not-allowed" : "pointer",
                  marginTop: 4,
                }}
              >
                {loginLoading ? "Signing in…" : "Sign in"}
              </button>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
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
        <div style={{ background: "white", borderBottom: "1px solid #ede9e3", padding: "0 28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 18,
              paddingBottom: 14,
            }}
          >
            <div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 20, color: "#1a1a1a" }}>
                Job Search HQ
              </div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                {userSettings.userName} · {weekKey}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {[
                { icon: "🤝", val: cumulative.meetings || 0, l: "Meetings" },
                { icon: "📋", val: cumulative.applications || 0, l: "Applied" },
              ].map(({ icon, val, l }) => (
                <div key={l} style={{ textAlign: "center", padding: "6px 14px", background: "#f7f5f0", borderRadius: 10 }}>
                  <div
                    style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#1a1a1a",
                    }}
                  >
                    {icon} {val}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 10,
                      color: "#9ca3af",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {l}
                  </div>
                </div>
              ))}
              <button
                onClick={handleLogout}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "transparent",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: 12,
                  color: "#9ca3af",
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: "none",
                  border: "none",
                  padding: "10px 18px",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontWeight: 600,
                  fontSize: 14,
                  color: tab === t.id ? "#1a1a1a" : "#9ca3af",
                  cursor: "pointer",
                  borderBottom: `2.5px solid ${tab === t.id ? "#16a34a" : "transparent"}`,
                  transition: "all 0.15s",
                  marginBottom: -1,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

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
              onDelete={(id) => setActivityLog((prev) => prev.filter((e) => e.id !== id))}
            />
          )}

          {/* ── APPLICATIONS TAB ── */}
          {tab === "applications" && (
            <div style={{ ...cardStyle, padding: "24px 26px" }}>
              <KanbanBoard cards={kanban} setCards={setKanban} onLog={addLog} />
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

