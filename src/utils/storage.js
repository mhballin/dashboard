// Dual storage system:
// - When window.storage exists (Claude artifact): use await window.storage.get/set
// - Otherwise: use localStorage
export const S = {
  async get(k) {
    try {
      if (typeof window !== "undefined" && window.storage) {
        const r = await window.storage.get(k);
        return r ? JSON.parse(r.value) : null;
      }
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  },
  async set(k, v) {
    try {
      if (typeof window !== "undefined" && window.storage) {
        await window.storage.set(k, JSON.stringify(v));
        return;
      }
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },

  exportAll() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        keys.push(localStorage.key(i));
      }

      const wanted = new Set([
        'tasks',
        'cumulative',
        'streak',
        'lastActive',
        'pitch',
        'notes',
        'activityLog',
        'kanban',
        'notesByDate',
        'user-settings',
        'notes-ttl-hours',
        'profile-ask',
        'profile-looking',
        'profile-proof',
      ]);

      const data = {};
      keys.forEach((k) => {
        if (!k) return;
        if (k.startsWith('job-dashboard-') || wanted.has(k) || k.startsWith('weekly-')) {
          try {
            const raw = localStorage.getItem(k);
            data[k] = raw ? JSON.parse(raw) : null;
          } catch {
            data[k] = localStorage.getItem(k);
          }
        }
      });

      data._exported = new Date().toISOString();
      data._version = 1;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'job-dashboard-backup.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {}
  },

  async importAll(file) {
    try {
      if (!file) return { ok: false, reason: 'no file' };
      const text = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(fr.error);
        fr.readAsText(file);
      });

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        return { ok: false, reason: 'Invalid JSON' };
      }

      const keys = Object.keys(parsed || {}).filter((k) => !k.startsWith('_'));
      if (keys.length === 0) return { ok: false, reason: 'Invalid backup file' };

      keys.forEach((k) => {
        try {
          localStorage.setItem(k, JSON.stringify(parsed[k]));
        } catch {}
      });

      return { ok: true };
    } catch (e) {
      return { ok: false, reason: e && e.message ? e.message : 'Import failed' };
    }
  }
};
