export function StreakBanner({ streak, lastActive, cumulative, onCheckIn }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const checkedIn = lastActive === todayStr;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 15,
            background: streak > 0 ? "linear-gradient(135deg,#fef3c7,#fde68a)" : "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            boxShadow: streak > 0 ? "0 2px 10px rgba(245,158,11,0.3)" : "none",
            flexShrink: 0,
          }}
        >
          🔥
        </div>
        <div>
          <div
            style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 22,
              fontWeight: 800,
              color: streak > 0 ? "#d97706" : "#9ca3af",
              lineHeight: 1,
            }}
          >
            {streak}
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#9ca3af",
                marginLeft: 6,
              }}
            >
              day streak
            </span>
          </div>
          <div
            style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 12,
              color: "#9ca3af",
              marginTop: 3,
            }}
          >
            {checkedIn ? "✓ Checked in today" : "Open daily to keep your streak"}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { icon: "💬", val: cumulative.conversations || 0, l: "Convos" },
          { icon: "🤝", val: cumulative.meetings || 0, l: "Meetings" },
          { icon: "📋", val: cumulative.applications || 0, l: "Applied" },
        ].map(({ icon, val, l }) => (
          <div
            key={l}
            style={{ textAlign: "center", padding: "7px 14px", background: "#f7f5f0", borderRadius: 12 }}
          >
            <div
              style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 17,
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
      </div>
      {!checkedIn && (
        <button
          onClick={onCheckIn}
          style={{
            background: "#d97706",
            border: "none",
            borderRadius: 12,
            padding: "10px 20px",
            color: "white",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Check In 🔥
        </button>
      )}
    </div>
  );
}
