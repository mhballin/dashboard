import { DayHeader } from "./DayHeader";
import { Tasks } from "./Tasks";
import { WeekTargets } from "./WeekTargets";

export default function DashboardTab({
  streak,
  lastActive,
  tempUnit,
  locationOverride,
  tasks,
  setTasks,
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
  tasksAddRef,
  weekly,
  weeklyApplications,
  targets,
  onInc,
  onDec,
  onLog,
  quickNote,
  setQuickNote,
  onQuickNoteAdd,
  quickNoteAddRef,
  activeNotes,
  onQuickNoteDelete,
}) {
  const cardStyle = {
    background: "#ffffff",
    borderRadius: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
    border: "1px solid #ede9e3",
  };

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <DayHeader
          streak={streak}
          lastActive={lastActive}
          tempUnit={tempUnit}
          locationOverride={locationOverride}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
        <div style={{ ...cardStyle, padding: "22px 24px" }}>
          <Tasks tasks={tasks} setTasks={setTasks} taskAddRef={tasksAddRef} onTaskCreate={onTaskCreate} onTaskUpdate={onTaskUpdate} onTaskDelete={onTaskDelete} />
        </div>
        <div style={{ ...cardStyle, padding: "22px 24px" }}>
          <WeekTargets
            weekly={{ ...weekly, applications: weeklyApplications }}
            targets={targets}
            onInc={onInc}
            onDec={onDec}
            onLog={onLog}
            quickNote={quickNote}
            setQuickNote={setQuickNote}
            onQuickNoteAdd={onQuickNoteAdd}
            quickNoteAddRef={quickNoteAddRef}
            activeNotes={activeNotes}
            onQuickNoteDelete={onQuickNoteDelete}
          />
        </div>
      </div>
    </>
  );
}
