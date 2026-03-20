import { useState } from "react";
import { todayStr } from "../utils/dates";
import { AutoResizeQuickNote } from "./AutoResizeQuickNote";
import { theme, cardStyle as themeCardStyle } from "../styles/theme";

const lbl = {
  fontFamily: theme.fonts.ui,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: theme.colors.muted,
};

export function WeekTargets({
  weekly,
  targets,
  onInc,
  onDec,
  onLog,
  quickNote,
  setQuickNote,
  onQuickNoteAdd,
  quickNoteAddRef,
  activeNotes = [],
  onQuickNoteDelete,
}) {
  const [promptKey, setPromptKey] = useState(null);
  const [promptText, setPromptText] = useState("");
  const VISIBLE_TARGET_KEYS = ["meetings", "outreach", "applications"];
  const METRIC_COLORS = {
    meetings: "#0d9488",
    outreach: "#be185d",
    applications: "#3b82f6",
  };
  const LOGGED_KEYS = ["meetings", "outreach"];
  
  // `targets` is required — map the provided targets into the render array
  const targetArray = Object.entries(targets)
    .filter(([key]) => VISIBLE_TARGET_KEYS.includes(key))
    .map(([key, target]) => {
      const iconMap = { meetings: "🤝", outreach: "📞", applications: "📋" };
      const labelMap = { meetings: "Meetings", outreach: "Outreach", applications: "Applications" };
      return { key, target, icon: iconMap[key] || "📌", label: labelMap[key] || key };
    });
  
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
            fontFamily: theme.fonts.ui,
            fontSize: 13,
            fontWeight: 700,
            color: done === targetArray.length ? theme.colors.primary : theme.colors.accent,
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
                  fontFamily: theme.fonts.ui,
                  fontSize: 13,
                  fontWeight: 500,
                  color: theme.colors.text,
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
                    border: `1px solid ${theme.colors.inputBorder}`,
                    background: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    color: theme.colors.muted,
                  }}
                >
                  −
                </button>
              ) : (
                <div style={{ width: 22, height: 22 }} />
              )}
              <span
                style={{
                  fontFamily: theme.fonts.ui,
                  fontWeight: 700,
                  fontSize: 14,
                  color: hit ? theme.colors.primary : theme.colors.text,
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
                    border: `1px solid ${theme.colors.inputBorder}`,
                    background: hit ? "#dcfce7" : "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    color: hit ? theme.colors.primary : theme.colors.text,
                  }}
                >
                  +
                </button>
              ) : (
                <div style={{ width: 22, height: 22 }} />
              )}
            </div>
            <div style={{ height: 5, background: theme.colors.subtle, borderRadius: 99 }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: hit ? theme.colors.primary : (METRIC_COLORS[key] || theme.colors.accent),
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
                    border: `1px solid ${theme.colors.inputBorder}`,
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div style={{ ...lbl, marginBottom: 8 }}>Add a note</div>
                  <textarea
                    rows={1}
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    onInput={(e) => {
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") savePrompt(key);
                      if (e.key === "Escape") cancelPrompt();
                    }}
                    placeholder="What did you do?"
                    style={{
                      width: "100%",
                      padding: "9px 13px",
                      borderRadius: 10,
                      border: `1px solid ${theme.colors.inputBorder}`,
                      outline: "none",
                      fontFamily: theme.fonts.ui,
                      fontSize: 13,
                      background: "white",
                      boxSizing: "border-box",
                      resize: "none",
                      overflow: "hidden",
                      minHeight: 40,
                      display: "block",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      onClick={() => savePrompt(key)}
                      style={{
                        background: theme.colors.primary,
                        border: "none",
                        borderRadius: 10,
                        padding: "7px 12px",
                        color: "white",
                        cursor: "pointer",
                        fontFamily: theme.fonts.ui,
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
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radii.default,
                        padding: "7px 12px",
                        color: theme.colors.muted,
                        cursor: "pointer",
                        fontFamily: theme.fonts.ui,
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
              onQuickNoteAdd={onQuickNoteAdd}
              quickNoteAddRef={quickNoteAddRef}
            />
            <div style={{ marginTop: 10 }}>
              {activeNotes.length === 0 ? (
                <div
                  style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 12,
                    color: "#9ca3af",
                  }}
                >
                  No active notes yet.
                </div>
              ) : (
                activeNotes.map((note) => {
                  const created = note.createdAt ? new Date(note.createdAt) : null;
                  const stamp = created
                    ? `${created.toLocaleDateString([], { month: "short", day: "numeric" })} · ${created.toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}`
                    : "Saved";
                  return (
                    <div
                          key={note.id}
                          style={{
                            ...themeCardStyle(),
                            borderRadius: 10,
                            padding: "9px 11px",
                            marginBottom: 8,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <div
                              style={{
                                fontFamily: theme.fonts.ui,
                                fontSize: 13,
                                color: "#374151",
                                lineHeight: 1.45,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                flex: 1,
                              }}
                            >
                              {note.text || note.content}
                            </div>
                            <button
                              onClick={() => onQuickNoteDelete && onQuickNoteDelete(note)}
                              aria-label="Delete note"
                              style={{
                                background: "none",
                                border: "none",
                                color: theme.colors.border,
                                cursor: "pointer",
                                fontFamily: theme.fonts.ui,
                                fontSize: 12,
                                lineHeight: 1,
                                padding: 0,
                                marginTop: 1,
                              }}
                            >
                              X
                            </button>
                          </div>
                          <div
                            style={{
                              fontFamily: theme.fonts.ui,
                              fontSize: 11,
                              color: theme.colors.muted,
                              marginTop: 6,
                            }}
                          >
                            {stamp}
                          </div>
                        </div>
                  );
                })
              )}
            </div>
      </div>
    </div>
  );
}


