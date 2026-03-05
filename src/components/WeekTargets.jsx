import { useState, useEffect, useRef } from "react";
import { WEEKLY_TARGETS } from "../data/keywords";
import { todayStr } from "../utils/dates";

const lbl = {
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#9ca3af",
};

export function WeekTargets({ weekly, targets, onInc, onDec, onLog, quickNote, setQuickNote }) {
  const [promptKey, setPromptKey] = useState(null);
  const [promptText, setPromptText] = useState("");
  const METRIC_COLORS = {
    meetings: "#0d9488",
    outreach: "#be185d",
    followups: "#7c3aed",
    applications: "#3b82f6",
  };
  const LOGGED_KEYS = ["meetings", "outreach", "followups"];
  
  // Use provided targets or fall back to WEEKLY_TARGETS
  const targetArray = targets ? 
    Object.entries(targets).map(([key, target]) => {
      const iconMap = { meetings: "🤝", outreach: "📞", followups: "✉️", applications: "📋" };
      const labelMap = { meetings: "Meetings", outreach: "Outreach", followups: "Follow-ups", applications: "Applications" };
      return { key, target, icon: iconMap[key], label: labelMap[key] };
    }) 
    : WEEKLY_TARGETS;
  
  const done = targetArray.filter((t) => weekly[t.key] >= t.target).length;

  const savePrompt = (key) => {
    onInc(key);
    onLog({
      date: todayStr(),
      type: key,
      note: promptText.trim() || "No note added",
    });
    setPromptKey(null);
    setPromptText("");
  };

  const cancelPrompt = () => {
    setPromptKey(null);
    setPromptText("");
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={lbl}>This Week</span>
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: done === targetArray.length ? "#16a34a" : "#f59e0b",
          }}
        >
          {done}/{targetArray.length} targets
        </span>
      </div>
      {targetArray.map(({ key, label, target, icon }) => {
        const val = weekly[key] || 0;
        const pct = Math.min((val / target) * 100, 100);
        const hit = val >= target;
        return (
          <div key={key} style={{ marginBottom: 13 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 14 }}>{icon}</span>
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#374151",
                  flex: 1,
                }}
              >
                {label}
              </span>
              {key !== "applications" ? (
                <button
                  onClick={() => onDec(key)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: "1px solid #e5e7eb",
                    background: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    color: "#9ca3af",
                  }}
                >
                  −
                </button>
              ) : (
                <div style={{ width: 22, height: 22 }} />
              )}
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  color: hit ? "#16a34a" : "#1a1a1a",
                  minWidth: 36,
                  textAlign: "center",
                }}
              >
                {val}
                <span style={{ color: "#d1d5db", fontWeight: 400 }}>/{target}</span>
              </span>
              {key !== "applications" ? (
                <button
                  onClick={() => {
                    if (LOGGED_KEYS.includes(key)) {
                      setPromptKey(key);
                      setPromptText("");
                      return;
                    }
                    onInc(key);
                  }}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: "1px solid #e5e7eb",
                    background: hit ? "#dcfce7" : "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    color: hit ? "#16a34a" : "#374151",
                  }}
                >
                  +
                </button>
              ) : (
                <div style={{ width: 22, height: 22 }} />
              )}
            </div>
            <div style={{ height: 5, background: "#f3f4f6", borderRadius: 99 }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: hit ? "#16a34a" : (METRIC_COLORS[key] || "#f59e0b"),
                  borderRadius: 99,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            {LOGGED_KEYS.includes(key) && promptKey === key && (
              <div
                style={{
                  marginTop: 10,
                  background: "#f0fdf4",
                  border: "1px solid #d1fae5",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div style={{ ...lbl, marginBottom: 8 }}>Add a note</div>
                <input
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") savePrompt(key);
                    if (e.key === "Escape") cancelPrompt();
                  }}
                  placeholder="What did you do?"
                  style={{
                    width: "100%",
                    padding: "9px 13px",
                    borderRadius: 10,
                    border: "1px solid #d1fae5",
                    outline: "none",
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 13,
                    background: "white",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => savePrompt(key)}
                    style={{
                      background: "#16a34a",
                      border: "none",
                      borderRadius: 10,
                      padding: "7px 12px",
                      color: "white",
                      cursor: "pointer",
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelPrompt}
                    style={{
                      background: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: "7px 12px",
                      color: "#6b7280",
                      cursor: "pointer",
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #f3f4f6" }}>
        <div style={{ ...lbl, marginBottom: 8 }}>Today's Note</div>
        {/* Auto-resizing textarea: Enter saves, Shift+Enter inserts newline */}
        <AutoResizeQuickNote
          quickNote={quickNote}
          setQuickNote={setQuickNote}
          onLog={onLog}
        />
      </div>
    </div>
  );
}

function AutoResizeQuickNote({ quickNote, setQuickNote, onLog }) {
  const ref = useRef(null);

  const adjust = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  useEffect(() => {
    adjust();
    const onResize = () => adjust();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (quickNote.trim()) {
        onLog({ date: todayStr(), type: "note", note: quickNote.trim() });
        setQuickNote("");
      }
    }
  };

  return (
    <textarea
      ref={ref}
      placeholder="Jot something down... press Enter to save (Shift+Enter for newline)"
      value={quickNote}
      onChange={(e) => setQuickNote(e.target.value)}
      onInput={adjust}
      onKeyDown={handleKeyDown}
      style={{
        width: "100%",
        minHeight: 40,
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        fontSize: 13,
        outline: "none",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: "#fafaf8",
        boxSizing: "border-box",
        resize: "none",
        overflow: "hidden",
      }}
    />
  );
}
