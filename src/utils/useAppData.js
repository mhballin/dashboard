import { useState, useEffect, useRef } from "react";
import { useStreak } from "./useStreak";
import {
  login,
  register,
  logout,
  getSetting,
  getCards,
  createCard,
  updateCard,
  deleteCard,
  getAllSettings,
  getAllSettingsRecords,
  deleteSettingRecord,
  setSetting,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getActivityLog,
  createActivityEntry,
  deleteActivityEntry,
  getWeeklyStats,
  createWeeklyStat,
  deleteWeeklyStat,
  upsertWeeklyStats,
  getNotes,
  createNote,
  deleteNote,
} from "./pb";
import { getWeekKey, todayStr, parseDateToLocalMidnight } from "./dates";
import { DEFAULT_TASKS, DEFAULT_PITCH } from "../data/defaultContent";
import { JOB_BOARDS, SEARCH_STRINGS } from "../data/jobBoards";
import { KEYWORDS } from "../data/keywords";

const TRACKED_APPLICATION_COLUMNS = ["applied", "interviewing", "closed"];

function buildCumulative(entries = [], cards = [], fallback = null) {
  const meetings = (entries || []).filter((e) => e?.type === "meetings").length;
  const outreach = (entries || []).filter((e) => e?.type === "outreach").length;
  const applications = (cards || []).filter((card) => TRACKED_APPLICATION_COLUMNS.includes(card?.col)).length;

  // Preserve legacy cumulative data only when there is no source data yet.
  if (!entries.length && !cards.length && fallback) {
    return {
      meetings: fallback.meetings || 0,
      outreach: fallback.outreach || 0,
      applications: fallback.applications || 0,
    };
  }

  return { meetings, outreach, applications };
}

export function useAppData(tab, authState) {
  const authToken = authState?.token || null;
  const authUserId = authState?.userId || null;
  const isAuthReady = !!(authToken && authUserId);

  const [loaded, setLoaded] = useState(false);
  const [bootError, setBootError] = useState(null);
  const [weekKey] = useState(getWeekKey());
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [weekly, setWeekly] = useState({ meetings: 0, outreach: 0, applications: 0 });
  const [cumulative, setCumulative] = useState({ meetings: 0, outreach: 0, applications: 0 });
  const [kanban, setKanban] = useState([]);
  const { streak, lastActive, setStreak, setLastActive, checkIn } = useStreak();
  const [pitch, setPitch] = useState(DEFAULT_PITCH);
  const [notes, setNotes] = useState([]);
  const [quickNote, setQuickNote] = useState("");
  const [activityLog, setActivityLog] = useState([]);
  const [notesTtlHours, setNotesTtlHours] = useState(24);
  const [userSettings, setUserSettings] = useState({
    userName: "Mike Ballin",
    tempUnit: "F",
    locationOverride: null,
    weeklyTargets: { meetings: 1, outreach: 4, applications: 2 },
  });
  const [jobBoards, setJobBoards] = useState(JOB_BOARDS);
  const [searchStrings, setSearchStrings] = useState(SEARCH_STRINGS || []);
  const [keywords, setKeywords] = useState(
    Object.entries(KEYWORDS || {}).map(([section, words]) => ({ section, keywords: words }))
  );
  const [profileAsk, setProfileAsk] = useState("");
  const [profileLookingFor, setProfileLookingFor] = useState("");
  const [profileProofPoints, setProfileProofPoints] = useState("");

  const weeklyPersistChainRef = useRef(Promise.resolve());
  const weeklyStatsIdRef = useRef(null);
  const tasksAddRef = useRef(null);
  const notesAddRef = useRef(null);
  const pendingCreates = useRef(new Map());

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

  // Load from PocketBase when auth is available
  useEffect(() => {
    if (!isAuthReady) {
      setBootError(null);
      setLoaded(false);
      return;
    }

    let cancelled = false;

    (async () => {
      let all = {};
      setBootError(null);
      try {
        all = await getAllSettings();

        if (cancelled) return;

        if (all.streak !== null && all.streak !== undefined) setStreak(all.streak);
        if (all.lastActive) setLastActive(all.lastActive);
        if (all.pitch) setPitch(all.pitch);

        if (all["user-settings"]) setUserSettings((prev) => ({ ...prev, ...all["user-settings"] }));
        if (all["notes-ttl-hours"]) setNotesTtlHours(all["notes-ttl-hours"]);

        const [
          storedBoards,
          storedSearchStrings,
          storedKeywords,
          storedProfileAsk,
          storedProfileLookingFor,
          storedProfileProof,
        ] = await Promise.all([
          getSetting("job-dashboard-boards"),
          getSetting("job-dashboard-search-strings"),
          getSetting("job-dashboard-keywords"),
          getSetting("profile-ask"),
          getSetting("profile-looking"),
          getSetting("profile-proof"),
        ]);

        if (cancelled) return;
        setJobBoards(Array.isArray(storedBoards) ? storedBoards : JOB_BOARDS);
        setSearchStrings(Array.isArray(storedSearchStrings) ? storedSearchStrings : (SEARCH_STRINGS || []));
        setKeywords(
          Array.isArray(storedKeywords)
            ? storedKeywords
            : Object.entries(KEYWORDS || {}).map(([section, words]) => ({ section, keywords: words }))
        );
        setProfileAsk(typeof storedProfileAsk === "string" ? storedProfileAsk : "");
        setProfileLookingFor(typeof storedProfileLookingFor === "string" ? storedProfileLookingFor : "");
        setProfileProofPoints(typeof storedProfileProof === "string" ? storedProfileProof : "");

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
        } else {
          const nb = all.notesByDate;
          const n = all.notes;
          if (nb) {
            const flat = Object.entries(nb || {}).flatMap(([dateKey, arr]) => (arr || []).map((note) => ({
              id: note.id || Date.now() + Math.random(),
              text: note.text,
              content: note.text,
              date: note.date || dateKey,
              createdAt: note.createdAt || Date.now(),
              expiresAt: note.expiresAt || null,
              copiedToActivity: !!note.copiedToActivity,
            })));
            setNotes(flat);
          } else if (n) {
            const today = todayStr();
            const initial = n && n.trim()
              ? [{ id: Date.now(), text: n, content: n, createdAt: Date.now(), date: today }]
              : [];
            setNotes(initial);
          }
        }

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
        } else if (all.tasks) {
          setTasks(all.tasks);
        }

        const pbActivity = await getActivityLog();
        if (cancelled) return;
        if (pbActivity && pbActivity.length) {
          setActivityLog(pbActivity.map((e) => ({ id: e.id, date: e.date, type: e.type, note: e.note })));
        } else if (all.activityLog) {
          setActivityLog(all.activityLog);
        }

        const pbWeekly = await getWeeklyStats(weekKey);
        if (cancelled) return;
        if (pbWeekly && pbWeekly.length) {
          const w = pbWeekly[0];
          setWeekly({ applications: w.applications || 0, meetings: w.meetings || 0, outreach: w.outreach || 0 });
          weeklyStatsIdRef.current = w.id;
        } else if (all[`weekly-${weekKey}`]) {
          setWeekly(all[`weekly-${weekKey}`]);
        }

        const k = await getCards();
        if (cancelled) return;
        if (k && k.length) {
          const migratedKanban = k.map((card) => ({
            ...card,
            isHighPriority: card.isHighPriority !== undefined ? card.isHighPriority : false,
            priorityOrder: card.priorityOrder !== undefined ? card.priorityOrder : 0,
            isStarred: card.isStarred !== undefined ? card.isStarred : false,
            dates: typeof card.dates === 'string' ? JSON.parse(card.dates) : (card.dates || {}), // Parse dates if they are strings
            added: card.added || todayStr(), // Ensure added has a default value
          }));
          setKanban(migratedKanban);
          setCumulative((prev) => buildCumulative(pbActivity || [], migratedKanban, all.cumulative || prev));
        } else {
          setCumulative((prev) => buildCumulative(pbActivity || [], [], all.cumulative || prev));
        }

        // Migrate expired notes from PB (or legacy) into activity log and delete PB records
        const ttl = all["notes-ttl-hours"] || 24;
        const now = Date.now();
        const ttlMs = ttl * 60 * 60 * 1000;

        const processExpired = async (arr) => {
          for (const note of arr) {
            const expiresAt = note && note.expiresAt ? Number(note.expiresAt) : null;
            const legacyExpired = note && note.createdAt ? note.createdAt + ttlMs <= now : false;
            const isExpired = expiresAt ? expiresAt <= now : legacyExpired;
            if (note && isExpired) {
              if (!note.copiedToActivity) {
                try {
                  const newEntry = { date: note.date || todayStr(), type: "note", note: note.text || note.content };
                  const created = await createActivityEntry(newEntry);
                  setActivityLog((prev) => [{ id: created.id, ...newEntry }, ...prev]);
                } catch (err) {
                  console.error("Failed to log expired note:", err);
                  setActivityLog((prev) => [{ id: Date.now() + Math.random(), date: note.date || todayStr(), type: "note", note: note.text || note.content }, ...prev]);
                }
              }
              if (note.id && typeof note.id === "string") {
                try { await deleteNote(note.id); } catch (err) { console.error("Failed to delete expired note:", err); }
              }
            }
          }
        };

        const toProcess = pbNotes && pbNotes.length ? (pbNotes.map(mapPbRecord)) : (all.notesByDate ? Object.entries(all.notesByDate).flatMap(([dateKey, arr]) => (arr || []).map((note) => ({ id: note.id, text: note.text, content: note.text, date: note.date || dateKey, createdAt: note.createdAt, expiresAt: note.expiresAt, copiedToActivity: !!note.copiedToActivity }))) : (all.notes ? [{ id: Date.now(), text: all.notes, content: all.notes, date: todayStr(), createdAt: Date.now() }] : []));
        if (toProcess.length) {
          processExpired(toProcess).catch((err) => console.error("Expired notes migration failed:", err));
        }
      } catch (err) {
        console.error("Boot sequence failed:", err);
        if (!cancelled) setBootError(err?.message || "Failed to load data");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthReady, authToken, authUserId, weekKey]);

  // Keep top-level cumulative counters synced with current app state.
  useEffect(() => {
    if (!loaded) return;
    setCumulative((prev) => {
      const next = buildCumulative(activityLog, kanban, prev);
      if (
        next.meetings === prev.meetings
        && next.outreach === prev.outreach
        && next.applications === prev.applications
      ) {
        return prev;
      }
      return next;
    });
  }, [activityLog, kanban, loaded]);

  // Persist TTL setting when changed
  useEffect(() => {
    if (loaded) setSetting("notes-ttl-hours", notesTtlHours);
  }, [notesTtlHours, loaded]);

  // Periodic migration: run every 30 minutes to move expired notes to activity
  useEffect(() => {
    if (!loaded) return;
    const migrate = async () => {
      const ttlMs = notesTtlHours * 60 * 60 * 1000;
      const now = Date.now();
      setNotes((prev) => {
        const keep = [];
        const expired = [];
        for (const note of prev || []) {
          const expiresAt = note && note.expiresAt ? Number(note.expiresAt) : null;
          const legacyExpired = note && note.createdAt ? note.createdAt + ttlMs <= now : false;
          const isExpired = expiresAt ? expiresAt <= now : legacyExpired;
          if (note && isExpired) expired.push(note);
          else keep.push(note);
        }
        if (expired.length) {
          (async () => {
            for (const n of expired) {
              try {
                if (!n.copiedToActivity) {
                  const newEntry = { date: n.date || todayStr(), type: "note", note: n.text || n.content };
                  const created = await createActivityEntry(newEntry);
                  setActivityLog((prev) => [{ id: created.id, ...newEntry }, ...prev]);
                }
              } catch (err) {
                console.error("Failed to add activity for expired note:", err);
                setActivityLog((prev) => [{ id: Date.now() + Math.random(), date: n.date || todayStr(), type: "note", note: n.text || n.content }, ...prev]);
              }
              if (n.id && typeof n.id === "string") {
                try { await deleteNote(n.id); } catch (err) { console.error("Failed to delete expired note:", err); }
              }
            }
          })();
        }
        return keep;
      });
    };
    const id = setInterval(migrate, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [loaded, notesTtlHours]);

  // Persist state changes
  useEffect(() => {
    if (loaded) setSetting("cumulative", cumulative);
  }, [cumulative, loaded]);

  useEffect(() => {
    if (loaded) setSetting("streak", streak);
  }, [streak, loaded]);

  useEffect(() => {
    if (loaded) setSetting("lastActive", lastActive);
  }, [lastActive, loaded]);

  useEffect(() => {
    if (loaded) setSetting("pitch", pitch);
  }, [pitch, loaded]);

  useEffect(() => {
    if (loaded) setSetting("user-settings", userSettings);
  }, [userSettings, loaded]);

  // Auto check-in when navigating to dashboard tab
  useEffect(() => {
    if (tab === "dashboard") checkIn();
  }, [tab]);

  const persistWeekly = async (data) => {
    weeklyPersistChainRef.current = weeklyPersistChainRef.current
      .then(async () => {
        try {
          const result = await upsertWeeklyStats(weekKey, data, weeklyStatsIdRef.current);
          if (result && result.id) weeklyStatsIdRef.current = result.id;
        } catch (err) {
          console.error("Failed to persist weekly stats:", err);
        }
      })
      .catch((err) => {
        console.error("persistWeekly chain error:", err);
      });
  };

  const inc = (key) => {
    setWeekly((w) => {
      const next = { ...w, [key]: (w[key] || 0) + 1 };
      persistWeekly(next);
      return next;
    });
  };

  const dec = (key) => {
    setWeekly((w) => {
      const next = { ...w, [key]: Math.max(0, (w[key] || 0) - 1) };
      persistWeekly(next);
      return next;
    });
  };

  const addLog = async (entry) => {
    const newEntry = { date: entry.date || todayStr(), type: entry.type || "note", note: entry.note || "" };
    try {
      const created = await createActivityEntry(newEntry);
      setActivityLog((prev) => [{ id: created.id, ...newEntry }, ...prev]);
    } catch (err) {
      console.error("Failed to create activity entry:", err);
      setActivityLog((prev) => [{ id: Date.now(), ...newEntry }, ...prev]);
    }
  };

  const handleBulkImportCards = async (cardsArray) => {
    try {
      for (const c of kanban) {
        // eslint-disable-next-line no-await-in-loop
        await deleteCard(c.id);
      }
      const created = [];
      for (const card of cardsArray) {
        // eslint-disable-next-line no-await-in-loop
        const result = await createCard(card);
        if (result) created.push(result);
      }
      setKanban(created);
      const n = created.length;
      const newEntry = { type: "import", text: `Imported ${n} card${n !== 1 ? "s" : ""}`, date: todayStr() };
      try {
        const logged = await createActivityEntry(newEntry);
        setActivityLog((prev) => [logged || { id: Date.now(), ...newEntry }, ...prev]);
      } catch {
        setActivityLog((prev) => [{ id: Date.now(), ...newEntry }, ...prev]);
      }
    } catch (err) {
      console.error("Failed to bulk import cards:", err);
      throw err;
    }
  };

  const handleCardCreate = async (card) => {
    const tempId = card.id;
    const createPromise = createCard(card);
    pendingCreates.current.set(tempId, createPromise);
    try {
      const created = await createPromise;
      if (created && created.id) {
        setKanban((prev) => prev.map((c) => c.id === card.id ? { ...card, ...created } : c));
      }
    } catch (err) {
      pendingCreates.current.delete(tempId);
      console.error("Failed to create card:", err);
    }
  };

  const handleCardUpdate = async (id, changes) => {
    try {
      const realId = await resolveId(id);
      await updateCard(realId, changes);
    } catch (err) {
      console.error("Failed to update card:", err);
    }
  };

  const handleCardDelete = async (id) => {
    try {
      const realId = await resolveId(id);
      await deleteCard(realId);
    } catch (err) {
      console.error("Failed to delete card:", err);
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
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handleFullExport = async () => {
    const [settings, cards, tasksRecords, activityRecords, noteRecords, weeklyStats] = await Promise.all([
      getAllSettings(),
      getCards(),
      getTasks(),
      getActivityLog(),
      getNotes(),
      getWeeklyStats(),
    ]);

    const exportObj = {
      version: 2,
      exportedAt: new Date().toISOString(),
      data: {
        settings: settings || {},
        cards: cards || [],
        tasks: tasksRecords || [],
        activityLog: activityRecords || [],
        notes: noteRecords || [],
        weeklyStats: weeklyStats || [],
        jobBoards,
        searchStrings,
        keywords,
        profileAsk,
        profileLookingFor,
        profileProofPoints,
      },
    };

    const json = JSON.stringify(exportObj, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ymd = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `dashboard-full-backup-${ymd}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleFullImport = async (jsonObject) => {
    if (!jsonObject || typeof jsonObject !== "object") {
      throw new Error("Invalid backup format");
    }
    if (jsonObject.version === undefined || jsonObject.version === null) {
      throw new Error("Backup version is missing");
    }

    const payload = jsonObject.data && typeof jsonObject.data === "object" ? jsonObject.data : {};
    const settings = payload.settings && typeof payload.settings === "object" ? payload.settings : {};
    const cards = Array.isArray(payload.cards) ? payload.cards : [];
    const tasksRecords = Array.isArray(payload.tasks) ? payload.tasks : [];
    const activityRecords = Array.isArray(payload.activityLog) ? payload.activityLog : [];
    const noteRecords = Array.isArray(payload.notes) ? payload.notes : [];
    const weeklyStats = Array.isArray(payload.weeklyStats) ? payload.weeklyStats : [];
    const importJobBoards = Array.isArray(payload.jobBoards) ? payload.jobBoards : null;
    const importSearchStrings = Array.isArray(payload.searchStrings) ? payload.searchStrings : null;
    const importKeywords = Array.isArray(payload.keywords) ? payload.keywords : null;
    const importProfileAsk = typeof payload.profileAsk === "string" ? payload.profileAsk : null;
    const importProfileLookingFor = typeof payload.profileLookingFor === "string" ? payload.profileLookingFor : null;
    const importProfileProofPoints = typeof payload.profileProofPoints === "string" ? payload.profileProofPoints : null;
    const settingsToRestore = { ...settings };

    if (!("job-dashboard-boards" in settingsToRestore) && importJobBoards) {
      settingsToRestore["job-dashboard-boards"] = importJobBoards;
    }
    if (!("job-dashboard-search-strings" in settingsToRestore) && importSearchStrings) {
      settingsToRestore["job-dashboard-search-strings"] = importSearchStrings;
    }
    if (!("job-dashboard-keywords" in settingsToRestore) && importKeywords) {
      settingsToRestore["job-dashboard-keywords"] = importKeywords;
    }
    if (!("profile-ask" in settingsToRestore) && importProfileAsk !== null) {
      settingsToRestore["profile-ask"] = importProfileAsk;
    }
    if (!("profile-looking" in settingsToRestore) && importProfileLookingFor !== null) {
      settingsToRestore["profile-looking"] = importProfileLookingFor;
    }
    if (!("profile-proof" in settingsToRestore) && importProfileProofPoints !== null) {
      settingsToRestore["profile-proof"] = importProfileProofPoints;
    }

    setLoaded(false);
    setBootError(null);

    try {
      const [existingCards, existingTasks, existingActivity, existingNotes, existingWeekly, existingSettings] = await Promise.all([
        getCards(),
        getTasks(),
        getActivityLog(),
        getNotes(),
        getWeeklyStats(),
        getAllSettingsRecords(),
      ]);

      await Promise.all((existingCards || []).map((card) => deleteCard(card.id)));
      await Promise.all((existingTasks || []).map((task) => deleteTask(task.id)));
      await Promise.all((existingActivity || []).map((entry) => deleteActivityEntry(entry.id)));
      await Promise.all((existingNotes || []).map((note) => deleteNote(note.id)));
      await Promise.all((existingWeekly || []).map((stat) => deleteWeeklyStat(stat.id)));
      await Promise.all((existingSettings || []).map((settingRecord) => deleteSettingRecord(settingRecord.id)));

      const restoredCards = [];
      for (const card of cards) {
        // eslint-disable-next-line no-await-in-loop
        const created = await createCard({
          col: card.col || "saved",
          company: card.company || "",
          title: card.title || "",
          location: card.location || "",
          description: card.description || "",
          url: card.url || "",
          notes: card.notes || "",
          added: card.added || todayStr(),
          dates: card.dates || { saved: todayStr(), applied: null, interviewing: null, closed: null },
          isHighPriority: !!card.isHighPriority,
          priorityOrder: card.priorityOrder || Date.now(),
          isStarred: !!card.isStarred,
        });
        if (created) restoredCards.push(created);
      }

      const restoredTasks = [];
      for (const task of tasksRecords) {
        // eslint-disable-next-line no-await-in-loop
        const created = await createTask({
          text: task.text || "",
          done: !!task.done,
          pinned: !!task.pinned,
          order: task.order ?? 0,
        });
        if (created) restoredTasks.push(created);
      }

      const restoredActivity = [];
      for (const entry of activityRecords) {
        // eslint-disable-next-line no-await-in-loop
        const created = await createActivityEntry({
          date: entry.date || todayStr(),
          type: entry.type || "note",
          note: entry.note || "",
        });
        if (created) restoredActivity.push(created);
      }

      const restoredNotes = [];
      for (const note of noteRecords) {
        // eslint-disable-next-line no-await-in-loop
        const created = await createNote({
          content: note.content || note.text || "",
          date: note.date || todayStr(),
          copiedToActivity: !!note.copiedToActivity,
          expiresAt: note.expiresAt || null,
        });
        if (created) restoredNotes.push(created);
      }

      const restoredWeekly = [];
      for (const stat of weeklyStats) {
        if (!stat.weekKey) continue;
        // eslint-disable-next-line no-await-in-loop
        const created = await createWeeklyStat({
          weekKey: stat.weekKey,
          meetings: stat.meetings || 0,
          outreach: stat.outreach || 0,
          applications: stat.applications || 0,
        });
        if (created) restoredWeekly.push(created);
      }

      for (const [key, value] of Object.entries(settingsToRestore)) {
        // eslint-disable-next-line no-await-in-loop
        await setSetting(key, value);
      }

      const restoreEntry = await createActivityEntry({
        date: todayStr(),
        type: "note",
        note: `Full restore from backup (${todayStr()})`,
      });
      const activityWithRestore = [{ id: restoreEntry?.id || Date.now(), date: todayStr(), type: "note", note: `Full restore from backup (${todayStr()})` }, ...restoredActivity];

      setTasks(restoredTasks.map((t, i) => ({
        id: t.id,
        text: t.text,
        done: !!t.done,
        pinned: !!t.pinned,
        order: t.order ?? i,
        doneAt: t.updated || null,
      })));

      const migratedKanban = restoredCards.map((card) => ({
        ...card,
        isHighPriority: card.isHighPriority !== undefined ? card.isHighPriority : false,
        priorityOrder: card.priorityOrder !== undefined ? card.priorityOrder : 0,
        isStarred: card.isStarred !== undefined ? card.isStarred : false,
        dates: typeof card.dates === "string" ? JSON.parse(card.dates) : (card.dates || {}),
        added: card.added || todayStr(),
      }));
      setKanban(migratedKanban);

      setActivityLog(activityWithRestore.map((e) => ({
        id: e.id,
        date: e.date,
        type: e.type,
        note: e.note,
      })));

      setNotes(restoredNotes.map((r) => {
        const createdAt = r.created ? Date.parse(r.created) : Date.now();
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
      }));

      const currentWeek = (restoredWeekly || []).find((w) => w.weekKey === weekKey) || null;
      setWeekly({
        applications: currentWeek?.applications || 0,
        meetings: currentWeek?.meetings || 0,
        outreach: currentWeek?.outreach || 0,
      });
      weeklyStatsIdRef.current = currentWeek?.id || null;

      if (settingsToRestore.streak !== null && settingsToRestore.streak !== undefined) setStreak(settingsToRestore.streak);
      if (settingsToRestore.lastActive) setLastActive(settingsToRestore.lastActive);
      if (settingsToRestore.pitch) setPitch(settingsToRestore.pitch);
      if (settingsToRestore["user-settings"]) setUserSettings((prev) => ({ ...prev, ...settingsToRestore["user-settings"] }));
      if (settingsToRestore["notes-ttl-hours"]) setNotesTtlHours(settingsToRestore["notes-ttl-hours"]);

      setJobBoards(Array.isArray(settingsToRestore["job-dashboard-boards"]) ? settingsToRestore["job-dashboard-boards"] : JOB_BOARDS);
      setSearchStrings(Array.isArray(settingsToRestore["job-dashboard-search-strings"]) ? settingsToRestore["job-dashboard-search-strings"] : (SEARCH_STRINGS || []));
      setKeywords(
        Array.isArray(settingsToRestore["job-dashboard-keywords"])
          ? settingsToRestore["job-dashboard-keywords"]
          : Object.entries(KEYWORDS || {}).map(([section, words]) => ({ section, keywords: words }))
      );
      setProfileAsk(typeof settingsToRestore["profile-ask"] === "string" ? settingsToRestore["profile-ask"] : "");
      setProfileLookingFor(typeof settingsToRestore["profile-looking"] === "string" ? settingsToRestore["profile-looking"] : "");
      setProfileProofPoints(typeof settingsToRestore["profile-proof"] === "string" ? settingsToRestore["profile-proof"] : "");

      setCumulative((prev) => buildCumulative(activityWithRestore, migratedKanban, settingsToRestore.cumulative || prev));
    } catch (err) {
      console.error("Failed to import full backup:", err);
      setBootError(err?.message || "Failed to import backup");
      throw err;
    } finally {
      setLoaded(true);
    }
  };

  const handleQuickNoteAdd = async (text) => {
    const today = todayStr();
    const now = Date.now();
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
    addLog({ date: today, type: "note", note: text });
  };

  const handleQuickNoteDelete = async (noteToDelete) => {
    if (!noteToDelete || !noteToDelete.id) return;
    if (noteToDelete.id && typeof noteToDelete.id === "string") {
      try { await deleteNote(noteToDelete.id); } catch (err) { console.error("Failed to delete PB note:", err); }
    }
    setNotes((prev) => (prev || []).filter((n) => !(n && n.id === noteToDelete.id)));
  };

  const activeQuickNotes = (notes || [])
    .filter(Boolean)
    .map((note) => ({ ...note, text: note.text || note.content }))
    .filter((note) => {
      if (note.expiresAt) return Number(note.expiresAt) > Date.now();
      if (!note.createdAt) return true;
      return note.createdAt + notesTtlHours * 60 * 60 * 1000 > Date.now();
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const tasksAdd = tasksAddRef;
  const notesAdd = notesAddRef;

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.defaultPrevented) return;
      try {
        const active = document.activeElement;
        if (active) {
          const tag = (active.tagName || "").toLowerCase();
          const isEditable = active.isContentEditable || tag === "input" || tag === "textarea" || tag === "select";
          if (isEditable) return;
        }
      } catch (err) {}

      const k = (e.key || "").toLowerCase();
      const hasModifier = e.altKey || e.metaKey || e.ctrlKey;
      const accept = !hasModifier || e.altKey;
      if (!accept) return;
      if (k === "t") {
        e.preventDefault();
        tasksAddRef.current?.();
      } else if (k === "n") {
        e.preventDefault();
        notesAddRef.current?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Compute weekly applications from kanban cards
  const weeklyApplications = kanban.filter((card) => {
    if (!["applied", "interviewing", "closed"].includes(card.col)) return false;
    if (!card.dates?.applied) return false;
    const [year, week] = weekKey.split("-W").map(Number);
    const jan4 = new Date(year, 0, 4);
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const applied = parseDateToLocalMidnight(card.dates.applied);
    return applied && applied.getTime() >= monday.getTime() && applied.getTime() <= sunday.getTime();
  }).length;

  const handleDeleteActivity = async (id) => {
    if (typeof id === "string") await deleteActivityEntry(id).catch((err) => console.error("Failed to delete activity:", err));
    setActivityLog((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSetJobBoards = async (newBoards) => {
    setJobBoards(newBoards);
    try {
      await setSetting("job-dashboard-boards", newBoards);
    } catch (err) {
      console.error("Failed to save job boards:", err);
    }
  };

  const handleSetSearchStrings = async (newStrings) => {
    setSearchStrings(newStrings);
    try {
      await setSetting("job-dashboard-search-strings", newStrings);
    } catch (err) {
      console.error("Failed to save search strings:", err);
    }
  };

  const handleSetKeywords = async (newKeywords) => {
    setKeywords(newKeywords);
    try {
      await setSetting("job-dashboard-keywords", newKeywords);
    } catch (err) {
      console.error("Failed to save keywords:", err);
    }
  };

  const handleSetProfileAsk = async (text) => {
    setProfileAsk(text);
    try {
      await setSetting("profile-ask", text);
    } catch (err) {
      console.error("Failed to save profile ask:", err);
    }
  };

  const handleSetProfileLookingFor = async (text) => {
    setProfileLookingFor(text);
    try {
      await setSetting("profile-looking", text);
    } catch (err) {
      console.error("Failed to save profile looking-for:", err);
    }
  };

  const handleSetProfileProofPoints = async (text) => {
    setProfileProofPoints(text);
    try {
      await setSetting("profile-proof", text);
    } catch (err) {
      console.error("Failed to save profile proof points:", err);
    }
  };

  const handleAuthLogin = async (email, password) => login(email, password);
  const handleAuthRegister = async (email, password, name) => register(email, password, name);
  const handleAuthLogout = () => logout();

  return {
    loaded,
    bootError,
    weekKey,
    tasks,
    setTasks,
    weekly,
    cumulative,
    kanban,
    setKanban,
    streak,
    lastActive,
    pitch,
    setPitch,
    quickNote,
    setQuickNote,
    activityLog,
    activeQuickNotes,
    notesTtlHours,
    setNotesTtlHours,
    userSettings,
    setUserSettings,
    jobBoards,
    searchStrings,
    keywords,
    profileAsk,
    profileLookingFor,
    profileProofPoints,
    tasksAddRef,
    notesAddRef,
    handleAuthLogin,
    handleAuthRegister,
    handleAuthLogout,
    inc,
    dec,
    addLog,
    handleFullExport,
    handleFullImport,
    handleBulkImportCards,
    handleCardCreate,
    handleCardUpdate,
    handleCardDelete,
    handleTaskCreate,
    handleTaskUpdate,
    handleTaskDelete,
    handleQuickNoteAdd,
    handleQuickNoteDelete,
    handleSetJobBoards,
    handleSetSearchStrings,
    handleSetKeywords,
    handleSetProfileAsk,
    handleSetProfileLookingFor,
    handleSetProfileProofPoints,
    weeklyApplications,
    weekKey,
    handleDeleteActivity,
  };
}
