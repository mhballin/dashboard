import { useState, useEffect, useRef } from "react";
import { Plus, X, Check } from "lucide-react";

const lbl = {
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#9ca3af",
};

export function Tasks({ tasks, setTasks, taskAddRef, onTaskCreate, onTaskUpdate, onTaskDelete }) {
  const notDone = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const doneSorted = [...done].sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const [showDone, setShowDone] = useState(false);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef();
  const adjust = () => {
    const el = inputRef.current;
    if (!el) return;
    const singleLinePx = 28; // baseline one-line height (fixed single-line)
    if (!el.value) {
      el.style.height = `${singleLinePx}px`;
      return;
    }
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  const dragId = useRef(null);

  useEffect(() => {
    if (adding && inputRef.current) {
      inputRef.current.focus();
      adjust();
    }
  }, [adding]);

  useEffect(() => {
    if (!taskAddRef) return;
    taskAddRef.current = () => {
      setAdding(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    };
    return () => {
      if (taskAddRef) taskAddRef.current = null;
    };
  }, [taskAddRef]);

  useEffect(() => {
    adjust();
  }, [text]);

  useEffect(() => {
    const onResize = () => adjust();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const addTask = () => {
    if (!text.trim()) return setAdding(false);
    const newTask = { id: Date.now(), text: text.trim(), done: false, pinned: false, order: notDone.length };
    setTasks((p) => [...p, newTask]);
    if (onTaskCreate) onTaskCreate(newTask);
    setText("");
    setAdding(false);
  };

  const complete = (id) => {
    setTasks((p) =>
      p.map((t) => (t.id === id ? { ...t, done: true, pinned: false, doneAt: Date.now() } : t))
    );
    if (onTaskUpdate) onTaskUpdate(id, { done: true, pinned: false });
  };
  const remove = (id) => {
    setTasks((p) => p.filter((t) => t.id !== id));
    if (onTaskDelete) onTaskDelete(id);
  };
  const uncheck = (id) => {
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, done: false, doneAt: null } : t)));
    if (onTaskUpdate) onTaskUpdate(id, { done: false });
  };

  const handleDragStart = (taskId) => {
    dragId.current = taskId;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (targetTask) => {
    if (!dragId.current || dragId.current === targetTask.id) return;
    
    const draggedIndex = notDone.findIndex((t) => t.id === dragId.current);
    const targetIndex = notDone.findIndex((t) => t.id === targetTask.id);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newOrder = [...notDone];
    const [dragged] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, dragged);
    
    const doneTaskIds = new Set(done.map((t) => t.id));
    const reordered = [
      ...newOrder,
      ...tasks.filter((t) => doneTaskIds.has(t.id)),
    ];
    
    setTasks(reordered);
    dragId.current = null;
    // Persist new order to PB
    if (onTaskUpdate) {
      newOrder.forEach((t, i) => {
        if (t.order !== i) onTaskUpdate(t.id, { order: i });
      });
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={lbl}>Tasks</span>
        <button
          data-testid="tasks-add-open"
          onClick={() => setAdding(true)}
          style={{
            background: "none",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 12,
            color: "#6b7280",
            cursor: "pointer",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {notDone.map((task, idx) => {
        const isTopThree = idx < 3;
        return (
          <div
            key={task.id}
            draggable="true"
            onDragStart={() => handleDragStart(task.id)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(task)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "9px 13px",
              background: isTopThree ? "#fafaf8" : "transparent",
              borderRadius: isTopThree ? 10 : 0,
              border: isTopThree ? "1px solid #ede9e3" : "none",
              borderLeft: isTopThree ? "3px solid #16a34a" : "none",
              marginBottom: isTopThree ? 4 : 0,
              cursor: "grab",
            }}
          >
            <div
              onClick={() => complete(task.id)}
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                flexShrink: 0,
                border: "2px solid #d1d5db",
                background: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxSizing: "border-box",
              }}
            />
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 13,
                fontWeight: isTopThree ? 500 : 400,
                color: "#1a1a1a",
                flex: 1,
              }}
            >
              {task.text}
            </span>
            <button
              onClick={() => remove(task.id)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", display: "flex", padding: 0 }}
            >
              <X size={13} />
            </button>
          </div>
        );
      })}

      {adding && (
        <div style={{ display: "flex", gap: 8, marginTop: 4, marginBottom: 8 }}>
          <textarea
            data-testid="tasks-add-input"
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                addTask();
              }
              if (e.key === "Escape") {
                setAdding(false);
                setText("");
              }
            }}
            placeholder="Task… (Enter to save)"
            rows={1}
            style={{
              flex: 1,
              padding: "5px 12px",
              lineHeight: "26px",
              borderRadius: 13,
              border: "1.5px solid #d1fae5",
              outline: "none",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 13,
              background: "#f0fdf4",
              resize: "none",
              overflow: "hidden",
              height: "28px",
              minHeight: 0,
            }}
          />
          <button
            data-testid="tasks-add-confirm"
            onClick={addTask}
            style={{
              background: "#16a34a",
              border: "none",
              borderRadius: 8,
              padding: "5px 12px",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Check size={14} />
          </button>
        </div>
      )}

      {done.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <button
            onClick={() => setShowDone((s) => !s)}
            aria-expanded={showDone}
            style={{
              ...lbl,
              marginBottom: 8,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              width: "100%",
              textAlign: "left",
              gap: 8,
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}
          >
            <span>Done ({done.length})</span>
            <span style={{ marginLeft: "auto", fontSize: 12 }}>{showDone ? "▾" : "▸"}</span>
          </button>
          {showDone &&
            doneSorted.map((t) => (
              <div key={t.id} draggable="false" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", opacity: 0.5 }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 5,
                    background: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxSizing: "border-box",
                  }}
                >
                  <Check size={10} color="white" />
                </div>
                <span
                  style={{
                    fontSize: 13,
                    color: "#6b7280",
                    flex: 1,
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    textDecoration: "line-through",
                  }}
                >
                  {t.text}
                </span>
                <button
                  onClick={() => uncheck(t.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center", gap: 4, padding: 0, fontSize: 12, fontFamily: "'Plus Jakarta Sans',sans-serif" }}
                >
                  <span>↩</span>
                  <span style={{ fontSize: 10, fontWeight: 600 }}>undo</span>
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
