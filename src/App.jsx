import { useEffect, useState } from "react";
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
import { login, logout } from "./utils/pb";
import { useAppData } from "./utils/useAppData";

const readAuthState = () => ({
  token: localStorage.getItem("pb_token"),
  userId: localStorage.getItem("pb_userId"),
});

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
  const [authState, setAuthState] = useState(readAuthState);
  const authed = !!(authState.token && authState.userId);

  const [tab, setTab] = useState("dashboard");
  const data = useAppData(tab, authState);
  const {
    loaded,
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
  } = data;

  useEffect(() => {
    const syncAuthFromStorage = () => setAuthState(readAuthState());
    window.addEventListener("storage", syncAuthFromStorage);
    return () => window.removeEventListener("storage", syncAuthFromStorage);
  }, []);

  // data provided by useAppData (loading, persistence and handlers)

  function handleLogout() {
    logout();
    setAuthState(readAuthState());
  }

  if (!authed) {
    return (
      <LoginScreen
        onLogin={async (email, password) => {
          await login(email, password);
          setAuthState(readAuthState());
        }}
      />
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
        <AppHeader userName={userSettings.userName} weekKey={weekKey} cumulative={cumulative} tab={tab} setTab={setTab} onLogout={handleLogout} />

        <div style={{ padding: "24px 28px", maxWidth: tab === "applications" ? 1500 : 1100, margin: "0 auto" }}>
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
              onDelete={(id) => handleDeleteActivity(id)}
            />
          )}

          {/* ── TRACKER TAB ── */}
          {tab === "applications" && (
            <div style={{ ...cardStyle, padding: "24px 30px" }}>
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
          {tab === "jobboards" && <JobBoardsTab isAuthenticated={authed} />}

          {/* ── PROFILE TAB ── */}
          {tab === "profile" && (
            <ProfileTab pitch={pitch} setPitch={setPitch} isAuthenticated={authed} />
          )}

          {/* ── SETTINGS TAB ── */}
          {tab === "settings" && (
            <div style={{ ...cardStyle, padding: "24px 26px" }}>
              <SettingsTab
                userSettings={userSettings}
                setUserSettings={setUserSettings}
                notesTtlHours={notesTtlHours}
                setNotesTtlHours={setNotesTtlHours}
                handleBulkImportCards={handleBulkImportCards}
              />
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;

