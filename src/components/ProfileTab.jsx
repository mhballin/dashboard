import { useState, useRef, useEffect } from "react";
import { theme, cardStyle as themeCardStyle } from "../styles/theme";

function Section({ title, helper, valueProp, initial, onSave }) {
  const isControlled = valueProp !== undefined;
  const [value, setValue] = useState(initial || "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial || "");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (editing && textareaRef.current) textareaRef.current.focus();
  }, [editing]);

  const displayed = isControlled ? valueProp : value;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayed || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard write can fail in restricted browser contexts.
    }
  };

  const startEdit = () => {
    setDraft(displayed || "");
    setEditing(true);
  };

  const handleSave = () => {
    if (onSave) onSave(draft);
    if (!isControlled) setValue(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(displayed || "");
    setEditing(false);
  };

  const card = {
    ...themeCardStyle(),
    borderRadius: 12,
    padding: "20px 22px",
    marginBottom: 16,
    boxSizing: "border-box",
  };

  const lbl = {
    fontFamily: theme.fonts.ui,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: theme.colors.muted,
  };

  const helperStyle = {
    fontFamily: theme.fonts.ui,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 6,
  };

  const contentStyle = {
    marginTop: 14,
    color: "#374151",
    fontSize: 14,
    lineHeight: 1.7,
    fontFamily: theme.fonts.ui,
    whiteSpace: "pre-wrap",
  };

  const btnBase = {
    fontFamily: theme.fonts.ui,
    fontSize: 13,
    padding: "6px 10px",
    borderRadius: theme.radii.default,
    border: `1px solid ${theme.colors.inputBorder}`,
    background: "white",
    color: theme.colors.muted,
    cursor: "pointer",
  };

  const smallEdit = {
    marginLeft: 8,
    fontSize: 13,
    background: "none",
    border: "none",
    color: theme.colors.muted,
    cursor: "pointer",
    padding: 6,
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={lbl}>{title}</div>
          <div style={helperStyle}>{helper}</div>
        </div>

        <div style={{ marginLeft: 12, display: "flex", alignItems: "center" }}>
          <button onClick={handleCopy} style={btnBase}>
            {copied ? "Copied!" : "Copy"}
          </button>
          <button onClick={startEdit} style={smallEdit} aria-label={`Edit ${title}`}>
            ✏️
          </button>
        </div>
      </div>

      <div style={contentStyle}>
        {!editing && <div>{displayed || ""}</div>}

        {editing && (
          <div>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              style={{
                width: "100%",
                minHeight: 120,
                border: `1px solid ${theme.colors.inputBorder}`,
                borderRadius: 10,
                padding: 12,
                fontFamily: theme.fonts.ui,
                fontSize: 14,
                lineHeight: 1.7,
                color: "#374151",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />

            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button
                onClick={handleSave}
                style={{
                  fontFamily: theme.fonts.ui,
                  background: theme.colors.primary,
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
              >
                Save
              </button>

              <button
                onClick={handleCancel}
                style={{
                  fontFamily: theme.fonts.ui,
                  background: "none",
                  border: "none",
                  color: theme.colors.muted,
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfileTab({
  pitch,
  setPitch,
  profileAsk,
  onSetProfileAsk,
  profileLookingFor,
  onSetProfileLookingFor,
  profileProofPoints,
  onSetProfileProofPoints,
}) {

  return (
    <div style={{ padding: "8px 0" }}>
      <Section
        title="ELEVATOR PITCH"
        helper="Your full intro — for emails and first conversations"
        valueProp={pitch}
        onSave={(v) => setPitch(v)}
      />

      <Section
        title="THE ASK"
        helper="Use this at the end of every networking meeting"
        valueProp={profileAsk}
        onSave={(v) => {
          onSetProfileAsk?.(v);
        }}
      />

      <Section
        title="WHAT I'M LOOKING FOR"
        helper="Quick reference for calls and coffee chats"
        valueProp={profileLookingFor}
        onSave={(v) => {
          onSetProfileLookingFor?.(v);
        }}
      />

      <Section
        title="KEY PROOF POINTS"
        helper="Highlights to work into conversation"
        valueProp={profileProofPoints}
        onSave={(v) => {
          onSetProfileProofPoints?.(v);
        }}
      />
    </div>
  );
}
