import { useState, useEffect, useMemo } from "react";
import { getNotes, createNote, deleteNote, createActivityEntry } from "./pb";
import { todayStr } from "./dates";

export function useNotes({ isAuthReady, notesAddRef, notesTtlHoursInitial = 24, onAddActivity } = {}) {
  const [notes, setNotes] = useState([]);
  const [notesTtlHours, setNotesTtlHours] = useState(notesTtlHoursInitial);

  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    (async () => {
      try {
        const pbNotes = await getNotes();
        if (cancelled) return;
        const mapPbRecord = (r) => {
          const createdAt = r.created ? Date.parse(r.created) : (r.createdAt || Date.now());
          const expiresAt = r.expiresAt ? Number(r.expiresAt) : (r.expires_at ? Number(r.expires_at) : null);
          return {
            id: r.id,
            content: r.content || r.text || "",
            text: r.content || r.text || "",
            date: r.date || todayStr(),
            createdAt,
            expiresAt,
            copiedToActivity: !!r.copiedToActivity || !!r.copied_to_activity,
          };
        };
        if (pbNotes && pbNotes.length) {
          setNotes(pbNotes.map(mapPbRecord));
        }
      } catch (err) {
        console.error("Failed to load notes:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthReady]);

  useEffect(() => {
    if (notesAddRef) notesAddRef.current = () => setNotes((p) => [{ id: Date.now(), text: "", content: "", date: todayStr(), createdAt: Date.now() }, ...(p || [])]);
    return () => { if (notesAddRef) notesAddRef.current = null; };
  }, [notesAddRef]);

  const handleQuickNoteAdd = async (text) => {
    const today = todayStr();
    const now = new Date().getTime();
    const body = {
      content: text,
      date: today,
      copiedToActivity: true,
      expiresAt: now + notesTtlHours * 60 * 60 * 1000,
    };
    try {
      const created = await createNote(body);
      const mapped = {
        id: created.id,
        content: created.content || body.content,
        text: created.content || body.content,
        date: created.date || body.date,
        createdAt: created.created ? Date.parse(created.created) : now,
        expiresAt: created.expiresAt ? Number(created.expiresAt) : body.expiresAt,
        copiedToActivity: !!created.copiedToActivity,
      };
      setNotes((prev) => [mapped, ...(prev || [])]);
    } catch (err) {
      console.error("Failed to create PB note, falling back to local:", err);
      const fallback = { id: Date.now(), text, content: text, date: today, createdAt: now, expiresAt: now + notesTtlHours * 60 * 60 * 1000, copiedToActivity: true };
      setNotes((prev) => [fallback, ...(prev || [])]);
    }
    if (onAddActivity && typeof onAddActivity.current === "function") {
      onAddActivity.current({ date: today, type: "note", note: text });
    } else {
      try {
        await createActivityEntry({ date: today, type: "note", note: text });
      } catch (err) {
        console.error("Failed to create activity entry for quick note:", err);
      }
    }
  };

  const handleQuickNoteDelete = async (noteToDelete) => {
    if (!noteToDelete || !noteToDelete.id) return;
    if (noteToDelete.id && typeof noteToDelete.id === "string") {
      try { await deleteNote(noteToDelete.id); } catch (err) { console.error("Failed to delete PB note:", err); }
    }
    setNotes((prev) => (prev || []).filter((n) => !(n && n.id === noteToDelete.id)));
  };

  const activeQuickNotes = useMemo(() => {
    const now = new Date().getTime();
    return (notes || [])
      .filter(Boolean)
      .map((note) => ({ ...note, text: note.text || note.content }))
      .filter((note) => {
        if (note.expiresAt) return Number(note.expiresAt) > now;
        if (!note.createdAt) return true;
        return note.createdAt + notesTtlHours * 60 * 60 * 1000 > now;
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [notes, notesTtlHours]);

  return {
    notes,
    setNotes,
    notesTtlHours,
    setNotesTtlHours,
    handleQuickNoteAdd,
    handleQuickNoteDelete,
    activeQuickNotes,
  };
}

export default useNotes;
