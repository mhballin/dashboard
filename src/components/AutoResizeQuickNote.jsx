import { useEffect, useRef } from "react";
import { todayStr } from "../utils/dates";

export function AutoResizeQuickNote({ quickNote, setQuickNote, onLog, onQuickNoteAdd, quickNoteAddRef }) {
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

  useEffect(() => {
    if (quickNoteAddRef) {
      quickNoteAddRef.current = () => {
        ref.current?.focus();
      };
      return () => {
        if (quickNoteAddRef) quickNoteAddRef.current = null;
      };
    }
  }, [quickNoteAddRef]);

  const saveQuickNote = () => {
    const v = quickNote.trim();
    if (!v) return;
    if (onQuickNoteAdd) {
      onQuickNoteAdd(v);
    } else {
      onLog({ date: todayStr(), type: "note", note: v });
    }
    setQuickNote("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveQuickNote();
    }
  };

  return (
    <div>
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
      <div style={{ height: 8 }} />
    </div>
  );
}
