import { useState, useEffect, useRef } from "react";

const lbl = {
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#9ca3af",
};

export function TodaysNotes({ notes = [], onAdd, onDelete, noteAddRef }) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.style.height = "auto";
  }, []);

  useEffect(() => {
    if (!noteAddRef) return;
    noteAddRef.current = () => {
      setText("");
      setTimeout(() => inputRef.current?.focus(), 0);
    };
    return () => {
      if (noteAddRef) noteAddRef.current = null;
    };
  }, [noteAddRef]);

  const add = () => {
    const v = text.trim();
    if (!v) return;
    onAdd(v);
    setText("");
  };

  return (
    <div>
      <div style={{ ...lbl, marginBottom: 8 }}>Today's Notes</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <textarea
          data-testid="notes-add-textarea"
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a note… (Enter to save)"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              add();
            }
          }}
          style={{
            flex: 1,
            minHeight: 56,
            borderRadius: 8,
            border: "1px solid #ede9e3",
            padding: 10,
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 13,
            resize: "none",
            outline: "none",
            background: "#fafaf8",
          }}
        />
        <button
          data-testid="notes-add-button"
          onClick={add}
          style={{
            background: "#16a34a",
            border: "none",
            color: "white",
            borderRadius: 8,
            padding: "8px 12px",
            cursor: "pointer",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
          }}
        >
          Add
        </button>
      </div>

      <div>
        {notes.length === 0 && <div style={{ color: "#9ca3af", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>No notes for today</div>}
        {notes.map((n) => (
          <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "white", borderRadius: 8, border: "1px solid #ede9e3", marginBottom: 8 }}>
            <div style={{ flex: 1, fontFamily: "'Plus Jakarta Sans',sans-serif", color: "#374151" }}>{n.text}</div>
            <button onClick={() => onDelete(n.id)} style={{ background: "none", border: "none", color: "#d1d5db", cursor: "pointer" }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
