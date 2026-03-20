import { useState, useRef, useEffect } from "react";
import { getTasks, createTask, updateTask, deleteTask } from "./pb";
import { DEFAULT_TASKS } from "../data/defaultContent";

export function useTasks({ isAuthReady, tasksAddRef } = {}) {
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const pendingCreates = useRef(new Map());

  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    (async () => {
      try {
        const pbTasks = await getTasks();
        if (cancelled) return;
        if (pbTasks && pbTasks.length) {
          setTasks(pbTasks.map((t, i) => ({
            id: t.id,
            text: t.text,
            done: !!t.done,
            pinned: !!t.pinned,
            order: t.order ?? i,
            doneAt: t.updated || null,
          })));
        }
      } catch (err) {
        console.error("Failed to load tasks:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthReady]);

  const resolveId = async (id) => {
    if (!pendingCreates.current.has(id)) return id;
    const pending = pendingCreates.current.get(id);
    try {
      const record = await pending;
      return record?.id || id;
    } finally {
      pendingCreates.current.delete(id);
    }
  };

  const handleTaskCreate = async (task) => {
    const tempId = task.id;
    const createPromise = createTask({ text: task.text, done: !!task.done, pinned: !!task.pinned, order: task.order ?? 0 });
    pendingCreates.current.set(tempId, createPromise);
    try {
      const created = await createPromise;
      if (created && created.id) {
        setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, id: created.id } : t));
      }
    } catch (err) {
      pendingCreates.current.delete(tempId);
      console.error("Failed to create task:", err);
    }
  };

  const handleTaskUpdate = async (id, changes) => {
    try {
      const realId = await resolveId(id);
      await updateTask(realId, changes);
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  const handleTaskDelete = async (id) => {
    try {
      const realId = await resolveId(id);
      await deleteTask(realId);
      setTasks((prev) => (prev || []).filter((t) => t.id !== id && t.id !== realId));
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  useEffect(() => {
    if (tasksAddRef) tasksAddRef.current = () => setTasks((p) => [{ id: Date.now(), text: "", done: false, pinned: false, order: (p?.length || 0) }, ...(p || [])]);
    return () => { if (tasksAddRef) tasksAddRef.current = null; };
  }, [tasksAddRef]);

  return {
    tasks,
    setTasks,
    handleTaskCreate,
    handleTaskUpdate,
    handleTaskDelete,
  };
}

export default useTasks;
