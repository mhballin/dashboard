import { useState } from "react";
import { CopyButton } from "./CopyButton";
import { theme } from "../styles/theme";

export function SearchStringCard({ s, isEditing, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  if (isEditing) {
    return (
      <div style={{ background: theme.colors.subtle, borderRadius: theme.radii.default, border: `1px solid ${theme.colors.inputBorder}`, padding: "10px 12px", marginBottom: 5, fontFamily: theme.fonts.ui }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <input
            type="text"
            value={s.label}
            onChange={(e) => onUpdate({ ...s, label: e.target.value })}
            style={{ flex: 1, fontWeight: 600, fontSize: 14, color: theme.colors.text, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.default, padding: "6px 8px", fontFamily: theme.fonts.ui, outline: "none" }}
          />
          <button onClick={onDelete} style={{ fontSize: 16, color: "#ef4444", background: "none", border: "none", cursor: "pointer", marginLeft: 8 }}>×</button>
        </div>

        <textarea value={s.query} onChange={(e) => onUpdate({ ...s, query: e.target.value })} style={{ width: "100%", minHeight: 80, resize: "vertical", fontFamily: theme.fonts.mono, fontSize: 12, border: `1px solid ${theme.colors.inputBorder}`, borderRadius: theme.radii.default, padding: "10px 14px", boxSizing: "border-box", outline: "none", background: theme.colors.cardBg }} />

        <input type="text" value={s.tip || ""} onChange={(e) => onUpdate({ ...s, tip: e.target.value })} style={{ marginTop: theme.space[2], fontSize: 12, color: theme.colors.muted, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.default, padding: "6px 8px", width: "100%", boxSizing: "border-box", fontFamily: theme.fonts.ui, outline: "none", background: theme.colors.cardBg }} />
      </div>
    );
  }

  return (
    <div style={{ background: theme.colors.cardBg, borderRadius: theme.radii.default, border: `1px solid ${theme.colors.border}`, marginBottom: 5, fontFamily: theme.fonts.ui, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", gap: 8, cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: theme.colors.text, fontFamily: theme.fonts.ui }}>{s.label}</span>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={(e) => e.stopPropagation()}>
          <CopyButton text={s.query} />
          <span style={{ fontSize: 14, color: theme.colors.muted }}>{expanded ? '▾' : '▸'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: `0 ${theme.space[3]}px ${theme.space[3]}px`, borderTop: `1px solid ${theme.colors.subtle}` }}>
          <div style={{ padding: 10, background: theme.colors.text, borderRadius: theme.radii.default, fontFamily: theme.fonts.mono, fontSize: 12, color: theme.colors.inputBorder, lineHeight: 1.5, wordBreak: "break-word", marginTop: theme.space[2] }}>{s.query}</div>

          {s.tip && <div style={{ marginTop: theme.space[2], fontSize: 11, color: theme.colors.muted, fontFamily: theme.fonts.ui }}>💡 {s.tip}</div>}
        </div>
      )}
    </div>
  );
}
