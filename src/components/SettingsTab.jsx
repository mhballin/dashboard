import { useState } from 'react';
import { getAllSettings, setSetting, getCards, createCard, deleteCard } from '../utils/pb';

export function SettingsTab({ userSettings, setUserSettings, notesTtlHours, setNotesTtlHours }) {
  const [importMsg, setImportMsg] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    try {
      const settings = await getAllSettings();
      const cards = await getCards();
      const stripped = (cards || []).map((c) => ({
        col: c.col,
        company: c.company,
        title: c.title,
        location: c.location,
        description: c.description,
        url: c.url,
        notes: c.notes,
        added: c.added,
        dates: c.dates,
        isHighPriority: c.isHighPriority,
        priorityOrder: c.priorityOrder,
        isStarred: c.isStarred,
      }));

      const exportObj = {
        exportedAt: new Date().toISOString(),
        settings: settings || {},
        cards: stripped,
      };

      const json = JSON.stringify(exportObj, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ymd = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `dashboard-backup-${ymd}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Export failed: ' + (err && err.message ? err.message : err));
    }
  };

  const handleImportClick = () => {
    const el = document.getElementById('settings-import-input');
    if (el) el.click();
  };

  const handleFileChange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setIsImporting(true);
    setImportMsg(null);
    try {
      const text = await f.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || !parsed.settings || !Array.isArray(parsed.cards)) {
        setImportMsg('✗ Invalid file format');
        return;
      }

      // SETTINGS
      for (const [key, value] of Object.entries(parsed.settings)) {
        // setSetting is expected to persist each setting in PocketBase
        // wait for each to complete to ensure consistency
        // eslint-disable-next-line no-await-in-loop
        await setSetting(key, value);
      }

      // CARDS: remove existing, then recreate from import
      const existing = await getCards();
      for (const ex of existing || []) {
        // eslint-disable-next-line no-await-in-loop
        await deleteCard(ex.id);
      }

      for (const card of parsed.cards || []) {
        // eslint-disable-next-line no-await-in-loop
        await createCard(card);
      }

      setImportMsg('✓ Imported — reloading...');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setImportMsg('✗ ' + (err && err.message ? err.message : String(err)));
    } finally {
      setIsImporting(false);
      if (e && e.target) e.target.value = '';
    }
  };

  const lbl = {
    fontFamily: "'Plus Jakarta Sans',sans-serif",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#9ca3af",
  };

  const inputStyle = {
    fontFamily: "'Plus Jakarta Sans',sans-serif",
    fontSize: 14,
    color: "#1a1a1a",
    background: "#fafaf8",
    border: "1px solid #ede9e3",
    borderRadius: 10,
    padding: "11px 14px",
    outline: "none",
    boxSizing: "border-box",
    width: "100%",
    transition: "all 0.15s",
  };

  const sectionStyle = {
    marginBottom: 32,
  };

  const handleUserNameChange = (e) => {
    setUserSettings((prev) => ({ ...prev, userName: e.target.value }));
  };

  const handleLocationChange = (e) => {
    setUserSettings((prev) => ({ ...prev, locationOverride: e.target.value || null }));
  };

  const handleLocationToggle = (e) => {
    if (e.target.checked) {
      setUserSettings((prev) => ({ ...prev, locationOverride: null }));
    }
  };

  const handleTempUnitChange = (unit) => {
    setUserSettings((prev) => ({ ...prev, tempUnit: unit }));
  };

  const handleTargetChange = (key, value) => {
    const numValue = Math.max(0, Math.min(20, parseInt(value) || 0));
    setUserSettings((prev) => ({
      ...prev,
      weeklyTargets: { ...prev.weeklyTargets, [key]: numValue },
    }));
  };

  const handleNotesTtlChange = (e) => {
    const next = Number(e.target.value);
    if (!Number.isFinite(next) || next <= 0) return;
    setNotesTtlHours(next);
  };

  return (
    <div style={{ maxWidth: 600 }}>
      {/* Data Section */}
      <div style={sectionStyle}>
        <div style={{ ...lbl, marginBottom: 16 }}>Data</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={handleExport}
            style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 13,
              fontWeight: 600,
              background: '#f7f5f0',
              border: '1px solid #ede9e3',
              borderRadius: 8,
              padding: '7px 16px',
              cursor: 'pointer',
              color: '#374151',
            }}
          >
            Export data
          </button>

          <button
            onClick={handleImportClick}
            disabled={isImporting}
            style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 13,
              fontWeight: 600,
              background: '#f7f5f0',
              border: '1px solid #ede9e3',
              borderRadius: 8,
              padding: '7px 16px',
              cursor: isImporting ? 'default' : 'pointer',
              color: '#374151',
              opacity: isImporting ? 0.6 : 1,
            }}
          >
            {isImporting ? 'Importing...' : 'Import data'}
          </button>
        </div>

        <input id="settings-import-input" type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />

        {importMsg && (
          <div style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 12,
            color: importMsg.startsWith('✓') ? '#16a34a' : '#ef4444',
            marginBottom: 12,
          }}>
            {importMsg}
          </div>
        )}

        <div style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 11,
          color: '#9ca3af',
          marginTop: 6,
        }}>
          Export saves a backup file to your downloads folder. Import restores from a previous export.
        </div>
      </div>

      {/* Profile Section */}
      <div style={sectionStyle}>
        <div style={{ ...lbl, marginBottom: 16 }}>Profile</div>
        <div style={{ marginBottom: 0 }}>
          <label style={{ display: "block", ...lbl, marginBottom: 8 }}>Name</label>
          <input
            type="text"
            value={userSettings.userName}
            onChange={handleUserNameChange}
            style={inputStyle}
            placeholder="Your name"
          />
        </div>
      </div>

      {/* Weekly Targets Section */}
      <div style={sectionStyle}>
        <div style={{ ...lbl, marginBottom: 16 }}>Weekly Targets</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          {[
            { key: "meetings", label: "🤝 Meetings" },
            { key: "outreach", label: "📞 Outreach" },
            { key: "applications", label: "📋 Applications" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label style={{ display: "block", ...lbl, marginBottom: 8 }}>{label}</label>
              <input
                type="number"
                min="0"
                max="20"
                value={userSettings.weeklyTargets[key]}
                onChange={(e) => handleTargetChange(key, e.target.value)}
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Location Preferences Section */}
      <div style={sectionStyle}>
        <div style={{ ...lbl, marginBottom: 16 }}>Location</div>
        <div style={{ marginBottom: 0 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={userSettings.locationOverride === null}
              onChange={handleLocationToggle}
              style={{ cursor: "pointer", width: 18, height: 18 }}
            />
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: "#374151", fontWeight: 500 }}>
              Use auto-detect
            </span>
          </label>
        </div>
        {userSettings.locationOverride !== null && (
          <div style={{ marginTop: 14 }}>
            <label style={{ display: "block", ...lbl, marginBottom: 8 }}>Manual Location</label>
            <input
              type="text"
              value={userSettings.locationOverride}
              onChange={handleLocationChange}
              style={inputStyle}
              placeholder="e.g., Portland, Maine"
            />
          </div>
        )}
      </div>

      {/* Preferences Section */}
      <div style={sectionStyle}>
        <div style={{ ...lbl, marginBottom: 16 }}>Notes</div>
        <div>
          <label style={{ display: "block", ...lbl, marginBottom: 8 }}>Quick Note Retention</label>
          <select
            value={notesTtlHours}
            onChange={handleNotesTtlChange}
            style={inputStyle}
          >
            <option value={24}>24 hours</option>
            <option value={48}>48 hours</option>
            <option value={72}>72 hours</option>
            <option value={168}>7 days</option>
          </select>
          <div
            style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 12,
              color: "#9ca3af",
              marginTop: 8,
            }}
          >
            New notes stay in Today&apos;s Note quick reference for this long.
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div style={sectionStyle}>
        <div style={{ ...lbl, marginBottom: 16 }}>Preferences</div>
        <div>
          <label style={{ display: "block", ...lbl, marginBottom: 12 }}>Temperature Unit</label>
          <div style={{ display: "flex", gap: 8 }}>
            {["F", "C"].map((unit) => (
              <button
                key={unit}
                onClick={() => handleTempUnitChange(unit)}
                style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "9px 18px",
                  border: userSettings.tempUnit === unit ? "none" : "1px solid #ede9e3",
                  background: userSettings.tempUnit === unit ? "#16a34a" : "white",
                  color: userSettings.tempUnit === unit ? "white" : "#6b7280",
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                °{unit}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
