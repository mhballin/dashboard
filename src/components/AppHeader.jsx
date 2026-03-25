import React from "react";
import { theme } from "../styles/theme";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "activity", label: "Activity" },
  { id: "applications", label: "Tracker" },
  { id: "jobboards", label: "Job Boards & Keywords" },
  { id: "profile", label: "Profile" },
  { id: "settings", label: "Settings" },
];

export default function AppHeader({ userName, weekKey, cumulative, tab, setTab, onLogout, version }) {
  return (
    <div style={{ background: theme.colors.cardBg, borderBottom: `1px solid ${theme.colors.border}`, padding: "0 28px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 18,
          paddingBottom: 14,
        }}
      >
        <div>
          <div style={{ fontFamily: theme.fonts.ui, fontWeight: 800, fontSize: 20, color: theme.colors.text }}>
            Job Search HQ
          </div>
          <div style={{ fontFamily: theme.fonts.ui, fontSize: 12, color: theme.colors.muted, marginTop: 2 }}>
            {userName} · {weekKey}
            {version ? (
              <span style={{ marginLeft: 8, fontFamily: theme.fonts.ui, fontSize: 11, color: theme.colors.muted, opacity: 0.9 }}>
                {version}
              </span>
            ) : null}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {[
            { icon: "🤝", val: cumulative.meetings || 0, l: "Meetings" },
            { icon: "📞", val: cumulative.outreach || 0, l: "Outreach" },
            { icon: "📋", val: cumulative.applications || 0, l: "Applied" },
          ].map(({ icon, val, l }) => (
            <div key={l} style={{ textAlign: "center", padding: "6px 14px", background: "#f7f5f0", borderRadius: 10 }}>
              <div
                  style={{
                    fontFamily: theme.fonts.ui,
                    fontSize: 16,
                    fontWeight: 800,
                    color: theme.colors.text,
                  }}
              >
                {icon} {val}
              </div>
              <div
                style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 10,
                  color: "#9ca3af",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {l}
              </div>
            </div>
          ))}
          <button
            onClick={onLogout}
                style={{
              padding: "6px 14px",
              borderRadius: theme.radii.default,
              border: `1px solid ${theme.colors.inputBorder}`,
              background: "transparent",
              fontFamily: theme.fonts.ui,
              fontWeight: 600,
              fontSize: 12,
              color: theme.colors.muted,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
          {/* Floating feature request button moved into App (bottom-right) */}
        </div>
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "none",
              border: "none",
              padding: "10px 18px",
              fontFamily: theme.fonts.ui,
              fontWeight: 600,
              fontSize: 14,
              color: tab === t.id ? theme.colors.text : theme.colors.muted,
              cursor: "pointer",
              borderBottom: `2.5px solid ${tab === t.id ? theme.colors.primary : "transparent"}`,
              transition: "all 0.15s",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
