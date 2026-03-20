import { useEffect, useState } from "react";
import { KanbanBoard } from "./components/KanbanBoard";
import { JobBoardsTab } from "./components/JobBoardsTab";
import { ActivityLog } from "./components/ActivityLog";
import DashboardTab from "./components/DashboardTab";
import { SettingsTab } from "./components/SettingsTab";
import ErrorBoundary from "./components/ErrorBoundary";
import ProfileTab from "./components/ProfileTab";
import LoginScreen from "./components/LoginScreen";
import AppHeader from "./components/AppHeader";
import { theme, cardStyle as themeCardStyle } from "./styles/theme";
import { useAppData } from "./utils/useAppData";

const readAuthState = () => ({
  token: localStorage.getItem("pb_token"),
  userId: localStorage.getItem("pb_userId"),
  email: localStorage.getItem("pb_email"),
});

const cardStyle = themeCardStyle();

function App() {
  const [authState, setAuthState] = useState(readAuthState);
  const authed = !!(authState.token && authState.userId);
  const [dismissedBootError, setDismissedBootError] = useState(null);

  const [tab, setTab] = useState("dashboard");
  const data = useAppData(tab, authState);
  const {
    loaded,
    bootError,
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
    weeklyEmailOptIn,
    setWeeklyEmailOptIn,
    userSettings,
    setUserSettings,
    jobBoards,
    searchStrings,
    keywords,
    profileAsk,
    profileLookingFor,
    profileProofPoints,
    tasksAddRef,
    notesAddRef,
    handleAuthLogin,
    handleAuthRegister,
    handleAuthLogout,
    inc,
    dec,
    addLog,
    handleFullExport,
    handleFullImport,
    handleCardCreate,
    handleCardUpdate,
    handleCardDelete,
    handleTaskCreate,
    handleTaskUpdate,
    handleTaskDelete,
    handleQuickNoteAdd,
    handleQuickNoteDelete,
    handleSetJobBoards,
    handleSetSearchStrings,
    handleSetKeywords,
    handleSetProfileAsk,
    handleSetProfileLookingFor,
    handleSetProfileProofPoints,
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
    handleAuthLogout();
    setAuthState(readAuthState());
  }

  if (!authed) {
    return (
      <LoginScreen
        onLogin={async (email, password) => {
          await handleAuthLogin(email, password);
          setAuthState(readAuthState());
        }}
        onRegister={async (email, password, name) => {
          await handleAuthRegister(email, password, name);
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
            background: theme.colors.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: theme.fonts.ui,
            color: theme.colors.muted,
          }}
        >
          Loading…
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div style={{ minHeight: "100vh", background: theme.colors.bg, paddingBottom: 60 }}>

        {/* Header */}
        <AppHeader userName={userSettings.userName} weekKey={weekKey} cumulative={cumulative} tab={tab} setTab={setTab} onLogout={handleLogout} />

        <div style={{ padding: "24px 28px", maxWidth: tab === "applications" ? 1500 : 1100, margin: "0 auto" }}>
          {loaded && bootError && dismissedBootError !== bootError && (
            <div
                style={{
                background: theme.colors.dangerBg,
                border: `1px solid ${theme.colors.dangerBorder}`,
                color: theme.colors.dangerText,
                padding: "12px 16px",
                borderRadius: theme.radii.default,
                fontFamily: theme.fonts.ui,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span style={{ fontFamily: theme.fonts.ui, fontSize: 13 }}>
                Some data failed to load. Try refreshing.
              </span>
              <button
                onClick={() => setDismissedBootError(bootError)}
                style={{
                  fontFamily: theme.fonts.ui,
                  border: "none",
                  background: "transparent",
                  color: "#92400e",
                  fontSize: 18,
                  lineHeight: 1,
                  cursor: "pointer",
                  padding: 0,
                }}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

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
          {tab === "jobboards" && (
            <JobBoardsTab
              jobBoards={jobBoards}
              onSetJobBoards={handleSetJobBoards}
              searchStrings={searchStrings}
              onSetSearchStrings={handleSetSearchStrings}
              keywords={keywords}
              onSetKeywords={handleSetKeywords}
            />
          )}

          {/* ── PROFILE TAB ── */}
          {tab === "profile" && (
            <ProfileTab
              pitch={pitch}
              setPitch={setPitch}
              profileAsk={profileAsk}
              onSetProfileAsk={handleSetProfileAsk}
              profileLookingFor={profileLookingFor}
              onSetProfileLookingFor={handleSetProfileLookingFor}
              profileProofPoints={profileProofPoints}
              onSetProfileProofPoints={handleSetProfileProofPoints}
            />
          )}

          {/* ── SETTINGS TAB ── */}
          {tab === "settings" && (
            <div style={{ ...cardStyle, padding: "24px 26px" }}>
              <SettingsTab
                userSettings={userSettings}
                setUserSettings={setUserSettings}
                notesTtlHours={notesTtlHours}
                setNotesTtlHours={setNotesTtlHours}
                weeklyEmailOptIn={weeklyEmailOptIn}
                setWeeklyEmailOptIn={setWeeklyEmailOptIn}
                handleFullExport={handleFullExport}
                handleFullImport={handleFullImport}
                auth={authState}
              />
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;

