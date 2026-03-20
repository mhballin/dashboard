import { useEffect, useState } from "react";
import { getAuthSnapshot } from "../utils/pb";
import { theme } from "../styles/theme";

export function ImportFromUrlPanel({ isOpen, onClose, onSave }) {
  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [importData, setImportData] = useState(null);
  const [importCompany, setImportCompany] = useState("");
  const [importTitle, setImportTitle] = useState("");
  const [importDescription, setImportDescription] = useState("");
  const [importLocation, setImportLocation] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setImportUrl("");
    setImportLoading(false);
    setImportError("");
    setImportData(null);
    setImportCompany("");
    setImportTitle("");
    setImportDescription("");
    setImportLocation("");
  }, [isOpen]);

  const handleImportFetch = async () => {
    setImportLoading(true);
    setImportError("");
    try {
      const configuredBaseUrl = (import.meta.env.VITE_API_URL || "").trim();
      const apiBase = configuredBaseUrl.replace(/\/+$/, "");
      const endpoint = apiBase ? `${apiBase}/scrape` : "/scrape";
      const token = (getAuthSnapshot && getAuthSnapshot().token) || localStorage.getItem("pb_token") || "";

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: importUrl.trim() }),
      });

      const raw = await resp.text().catch(() => null);
      if (!raw) {
        setImportError("Invalid response from server");
        setImportData(null);
        return;
      }

      let json = null;
      try {
        json = JSON.parse(raw);
      } catch {
        const excerpt = String(raw).trim().slice(0, 500);
        setImportError(excerpt || "Invalid response from server");
        setImportData(null);
        return;
      }

      if (!resp.ok) {
        setImportError(json.error || `Server returned HTTP ${resp.status}`);
        setImportData(null);
        return;
      }

      if (json.success) {
        const data = json.data || {};
        setImportData(data);
        setImportCompany(data.company || "");
        setImportTitle(data.title || "");
        setImportDescription(data.description || "");
        setImportLocation(data.location || "");
        setImportError("");
      } else {
        setImportError(json.error || "Could not extract job data");
        setImportData(null);
      }
    } catch {
      setImportError("Network error - is the server running?");
      setImportData(null);
    } finally {
      setImportLoading(false);
    }
  };

  const handleSave = () => {
    const company = (importCompany || "").trim();
    const title = (importTitle || "").trim();
    if (!company && !title) return;

    onSave({
      company,
      title,
      location: (importLocation || "").trim(),
      description: (importDescription || "").trim(),
      url: (importUrl || "").trim(),
    });
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        marginTop: 10,
        background: theme.colors.cardBg,
        padding: 12,
        borderRadius: theme.radii.default,
        border: "1.5px solid #93c5fd",
      }}
    >
      {!importData ? (
        <>
          <input
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleImportFetch();
              if (e.key === "Escape") onClose();
            }}
            autoFocus
            placeholder="Paste job posting URL..."
            style={{ width: "100%", border: "none", outline: "none", fontFamily: theme.fonts.ui, fontSize: 13, marginBottom: 8 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleImportFetch}
              disabled={importLoading || !importUrl.trim()}
              style={{
                background: "#2563eb",
                border: "none",
                borderRadius: theme.radii.default,
                padding: "6px 12px",
                color: "white",
                fontWeight: 600,
                fontSize: 13,
                cursor: importLoading ? "wait" : "pointer",
              }}
            >
              {importLoading ? "Fetching..." : "Fetch"}
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: `1px solid ${theme.colors.inputBorder}`,
                borderRadius: theme.radii.default,
                padding: "6px 10px",
                fontSize: 13,
                color: theme.colors.muted,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
          {importError && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 8 }}>{importError}</div>}
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 700, marginBottom: 8 }}>
            Extracted from {importData.source || "page"}
          </div>
          <input
            value={importCompany}
            onChange={(e) => setImportCompany(e.target.value)}
            placeholder="Company"
            style={{ width: "100%", border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.default, padding: "6px 8px", fontSize: 13, fontFamily: theme.fonts.ui, marginBottom: 8 }}
          />
          <input
            value={importTitle}
            onChange={(e) => setImportTitle(e.target.value)}
            placeholder="Job Title"
            style={{ width: "100%", border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.default, padding: "6px 8px", fontSize: 13, fontFamily: theme.fonts.ui, marginBottom: 8 }}
          />
          <input
            value={importLocation}
            onChange={(e) => setImportLocation(e.target.value)}
            placeholder="Location"
            style={{ width: "100%", border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.default, padding: "6px 8px", fontSize: 13, fontFamily: theme.fonts.ui, marginBottom: 8 }}
          />
          <textarea
            value={importDescription}
            onChange={(e) => setImportDescription(e.target.value)}
            placeholder="Description"
            style={{ width: "100%", border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.default, padding: "6px 8px", fontSize: 13, fontFamily: theme.fonts.ui, minHeight: 80, resize: "vertical", boxSizing: "border-box", marginTop: 6 }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              onClick={handleSave}
              disabled={!((importCompany || "").trim() || (importTitle || "").trim())}
              style={{
                background: "#16a34a",
                border: "none",
                borderRadius: theme.radii.default,
                padding: "8px 14px",
                color: "white",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Save
            </button>
            <button
              onClick={() => setImportData(null)}
              style={{
                background: "none",
                border: `1px solid ${theme.colors.inputBorder}`,
                borderRadius: theme.radii.default,
                padding: "8px 12px",
                fontSize: 13,
                color: theme.colors.muted,
                cursor: "pointer",
              }}
            >
              Edit URL
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: `1px solid ${theme.colors.inputBorder}`,
                borderRadius: theme.radii.default,
                padding: "8px 12px",
                fontSize: 13,
                color: theme.colors.muted,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
