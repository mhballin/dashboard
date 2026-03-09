import { useState, useRef, useEffect } from "react";
import { S } from "../utils/storage";

function Section({ title, helper, valueProp, initial, onSave }) {
  const isControlled = valueProp !== undefined;
  const [value, setValue] = useState(initial || "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(isControlled ? valueProp : initial || "");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isControlled) setDraft(valueProp);
  }, [valueProp, isControlled]);

  useEffect(() => {
    if (editing && textareaRef.current) textareaRef.current.focus();
  }, [editing]);

  const displayed = isControlled ? valueProp : value;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayed || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
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
    background: "#ffffff",
    border: "1px solid #ede9e3",
    borderRadius: 12,
    padding: "20px 22px",
    marginBottom: 16,
    boxSizing: "border-box",
  };

  const lbl = {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#9ca3af",
  };

  const helperStyle = {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 6,
  };

  const contentStyle = {
    marginTop: 14,
    color: "#374151",
    fontSize: 14,
    lineHeight: 1.7,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    whiteSpace: "pre-wrap",
  };

  const btnBase = {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 13,
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "white",
    color: "#6b7280",
    cursor: "pointer",
  };

  const smallEdit = {
    marginLeft: 8,
    fontSize: 13,
    background: "none",
    border: "none",
    color: "#6b7280",
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
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 12,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
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
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  background: "#16a34a",
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
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  background: "none",
                  border: "none",
                  color: "#6b7280",
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

export default function ProfileTab({ pitch, setPitch }) {
  const defaultAsk = "I'm targeting ops and CoS roles at startups, 5–30 people,\nMaine or remote-friendly. Do you know 2–3 people I should be talking to?";

  const defaultLooking =
    "Role: Chief of Staff or Head of Operations\nCompany: Early-stage startup, 5–30 people\nLocation: Maine, Remote, or Boston hybrid";

  const defaultProof =
    "• 4 years as de facto COO at Blueprint Surf\n• 80+ surfboards produced, 65% weight reduction\n• Built Raspberry Pi/AI print monitoring system\n• Roux Institute research partnership + Tuck MBA intern management";

  const [ask, setAsk] = useState(defaultAsk);
  const [lookingFor, setLookingFor] = useState(defaultLooking);
  const [proofPoints, setProofPoints] = useState(defaultProof);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [storedAsk, storedLooking, storedProof] = await Promise.all([
          S.get("profile-ask"),
          S.get("profile-looking"),
          S.get("profile-proof"),
        ]);

        if (!mounted) return;
        if (storedAsk != null) setAsk(storedAsk);
        if (storedLooking != null) setLookingFor(storedLooking);
        if (storedProof != null) setProofPoints(storedProof);
      } catch (e) {}
    })();

    return () => {
      mounted = false;
    };
  }, []);

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
        valueProp={ask}
        onSave={(v) => {
          setAsk(v);
          S.set("profile-ask", v);
        }}
      />

      <Section
        title="WHAT I'M LOOKING FOR"
        helper="Quick reference for calls and coffee chats"
        valueProp={lookingFor}
        onSave={(v) => {
          setLookingFor(v);
          S.set("profile-looking", v);
        }}
      />

      <Section
        title="KEY PROOF POINTS"
        helper="Highlights to work into conversation"
        valueProp={proofPoints}
        onSave={(v) => {
          setProofPoints(v);
          S.set("profile-proof", v);
        }}
      />
    </div>
  );
}
