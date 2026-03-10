import React from "react";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "activity", label: "Activity" },
  { id: "applications", label: "Applications" },
  { id: "jobboards", label: "Job Boards & Keywords" },
  { id: "profile", label: "Profile" },
  { id: "settings", label: "Settings" },
];

export default function AppHeader({ userName, weekKey, cumulative, tab, setTab, onLogout }) {
  return (
    <div style={{ background: "white", borderBottom: "1px solid #ede9e3", padding: "0 28px" }}>
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
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 20, color: "#1a1a1a" }}>
            Job Search HQ
          </div>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
            {userName} · {weekKey}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {[
            { icon: "🤝", val: cumulative.meetings || 0, l: "Meetings" },
            { icon: "📋", val: cumulative.applications || 0, l: "Applied" },
          ].map(({ icon, val, l }) => (
            <div key={l} style={{ textAlign: "center", padding: "6px 14px", background: "#f7f5f0", borderRadius: 10 }}>
              <div
                style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#1a1a1a",
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
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "transparent",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              fontSize: 12,
              color: "#9ca3af",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
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
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontWeight: 600,
              fontSize: 14,
              color: tab === t.id ? "#1a1a1a" : "#9ca3af",
              cursor: "pointer",
              borderBottom: `2.5px solid ${tab === t.id ? "#16a34a" : "transparent"}`,
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
