import { useState, useEffect, useRef } from "react";
import { StreakBanner } from "./components/StreakBanner";
import { Tasks } from "./components/Tasks";
import { WeekTargets } from "./components/WeekTargets";
import { KanbanBoard } from "./components/KanbanBoard";
import { JobBoardsTab } from "./components/JobBoardsTab";
import { ActivityLog } from "./components/ActivityLog";
import { CollapsiblePanel } from "./components/CollapsiblePanel";
import { DayHeader } from "./components/DayHeader";
import { SettingsTab } from "./components/SettingsTab";
import { TodaysNotes } from "./components/TodaysNotes";
import ErrorBoundary from "./components/ErrorBoundary";
import { S } from "./utils/storage";
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
  { id: "settings", label: "Settings" },
];

function App() {
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [weekKey] = useState(getWeekKey());
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [weekly, setWeekly] = useState({ meetings: 0, outreach: 0, followups: 0, applications: 0 });
  const [cumulative, setCumulative] = useState({ meetings: 15, outreach: 0, followups: 0, applications: 0 });
  const [kanban, setKanban] = useState([]);
  const [streak, setStreak] = useState(0);
  const [lastActive, setLastActive] = useState(null);
  const [pitch, setPitch] = useState(DEFAULT_PITCH);
  const [notesByDate, setNotesByDate] = useState({});
  const [quickNote, setQuickNote] = useState("");
  const [activityLog, setActivityLog] = useState([]);
  const [userSettings, setUserSettings] = useState({
    userName: "Mike Ballin",
    tempUnit: "F",
    locationOverride: null,
    weeklyTargets: { meetings: 1, outreach: 4, followups: 2, applications: 2 },
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
      // After initial load, migrate any notes older than 24 hours into activityLog
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const migratedLogs = [];
      const kept = {};
      const source = nb || (n && n.trim() ? { [todayStr()]: [{ id: Date.now(), text: n, createdAt: Date.now(), date: todayStr() }] } : {});
      for (const [dateKey, arr] of Object.entries(source || {})) {
        const keep = [];
        for (const note of arr) {
          if (note && note.createdAt && note.createdAt < cutoff) {
            migratedLogs.push({ id: Date.now() + Math.random(), date: note.date || dateKey, type: "note", note: note.text });
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

  // Find the last valid weekday (Mon-Fri) before today
  const getLastValidWeekday = () => {
    const lastDay = new Date();
    lastDay.setDate(lastDay.getDate() - 1);
    while (lastDay.getDay() === 0 || lastDay.getDay() === 6) {
      lastDay.setDate(lastDay.getDate() - 1);
    }
    return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(
      lastDay.getDate()
    ).padStart(2, "0")}`;
  };

  const checkIn = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Skip on weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) return;
    
    if (lastActive === todayStr()) return;
    
    const lastValidWeekday = getLastValidWeekday();
    setStreak(lastActive === lastValidWeekday ? streak + 1 : 1);
    setLastActive(todayStr());
  };

  const pitchRef = useRef(null);
  const tasksAddRef = useRef(null);
  const notesAddRef = useRef(null);

  const adjustHeight = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const adjustPitchHeight = () => adjustHeight(pitchRef.current);

  useEffect(() => {
    adjustPitchHeight();
    const onResize = () => {
      adjustPitchHeight();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
            <>
              <div style={{ marginBottom: 20 }}>
                <DayHeader streak={streak} lastActive={lastActive} tempUnit={userSettings.tempUnit} locationOverride={userSettings.locationOverride} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                <div style={{ ...cardStyle, padding: "22px 24px" }}>
                  <Tasks tasks={tasks} setTasks={setTasks} taskAddRef={tasksAddRef} />
                </div>
                <div style={{ ...cardStyle, padding: "22px 24px" }}>
                  <WeekTargets
                    weekly={{ ...weekly, applications: weeklyApplications }}
                    targets={userSettings.weeklyTargets}
                    onInc={inc}
                    onDec={dec}
                    onLog={addLog}
                    quickNote={quickNote}
                    setQuickNote={setQuickNote}
                  />
                </div>
              </div>
              <CollapsiblePanel title="🎯 Pitch & Notes">
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...lbl, marginBottom: 8 }}>Your Pitch</div>
                  <textarea
                    value={pitch}
                    onChange={(e) => setPitch(e.target.value)}
                    ref={pitchRef}
                    onInput={adjustPitchHeight}
                    style={{
                      width: "100%",
                      minHeight: 150,
                      background: "#fafaf8",
                      border: "1px solid #ede9e3",
                      borderRadius: 12,
                      padding: 14,
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 13,
                      lineHeight: 1.7,
                      color: "#374151",
                      outline: "none",
                      resize: "none",
                      overflow: "hidden",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <div style={{ ...lbl, marginBottom: 8 }}>
                    <TodaysNotes
                      notes={(notesByDate[todayStr()] || []).slice().reverse()}
                      noteAddRef={notesAddRef}
                      onAdd={(text) => {
                        const today = todayStr();
                        const note = { id: Date.now(), text, createdAt: Date.now(), date: today };
                        setNotesByDate((prev) => ({ ...prev, [today]: [...(prev[today] || []), note] }));
                      }}
                      onDelete={(id) => {
                        const today = todayStr();
                        setNotesByDate((prev) => ({ ...prev, [today]: (prev[today] || []).filter((n) => n.id !== id) }));
                      }}
                    />
                  </div>
                </div>
              </CollapsiblePanel>
            </>
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

          {/* ── SETTINGS TAB ── */}
          {tab === "settings" && (
            <div style={{ ...cardStyle, padding: "24px 26px" }}>
              <SettingsTab
                userSettings={userSettings}
                setUserSettings={setUserSettings}
              />
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;

