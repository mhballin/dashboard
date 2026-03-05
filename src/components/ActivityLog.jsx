import { parseDateToLocalMidnight, dateToMillis } from "../utils/dates";

const TYPE_META = {
  meetings: {
    label: "Meeting",
    background: "#ccfbf1",
    color: "#0d9488",
  },
  outreach: {
    label: "Outreach",
    background: "#fce7f3",
    color: "#be185d",
  },
  followups: {
    label: "Follow-up",
    background: "#f3e8ff",
    color: "#7c3aed",
  },
  applied: {
    label: "Applied",
    background: "#dbeafe",
    color: "#1d4ed8",
  },
  interviewing: {
    label: "Interviewing",
    background: "#fef3c7",
    color: "#d97706",
  },
  closed: {
    label: "Closed",
    background: "#f9fafb",
    color: "#6b7280",
  },
  note: {
    label: "Note",
    background: "#f7f5f0",
    color: "#6b7280",
  },
};

const dateLabelStyle = {
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 12,
  fontWeight: 700,
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 8,
  marginTop: 20,
};

export function ActivityLog({ entries = [], onDelete }) {
  const sortedEntries = [...entries].sort((a, b) => {
    const aTime = dateToMillis(a.date || "1970-01-01");
    const bTime = dateToMillis(b.date || "1970-01-01");
    if (aTime !== bTime) return bTime - aTime;
    return (b.id || 0) - (a.id || 0);
  });

  const grouped = sortedEntries.reduce((acc, entry) => {
    const key = entry.date || "Unknown date";
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const dateKeys = Object.keys(grouped).sort((a, b) => {
    const aTime = dateToMillis(a);
    const bTime = dateToMillis(b);
    return bTime - aTime;
  });

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 4px" }}>
      <div
        style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontWeight: 800,
          fontSize: 18,
          color: "#1a1a1a",
          marginBottom: 20,
        }}
      >
        Activity Log
      </div>

      {entries.length === 0 && (
        <div
          style={{
            minHeight: 180,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 13,
            color: "#9ca3af",
            padding: "0 14px",
          }}
        >
          No activity yet - start logging meetings, outreach, and follow-ups.
        </div>
      )}

      {dateKeys.map((dateKey) => {
        const formattedDate = parseDateToLocalMidnight(dateKey).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });

        return (
          <div key={dateKey}>
            <div style={dateLabelStyle}>{formattedDate}</div>
            {grouped[dateKey].map((entry) => {
              const typeMeta = TYPE_META[entry.type] || {
                label: entry.type || "Activity",
                background: "#f3f4f6",
                color: "#6b7280",
              };

              return (
                <div
                  key={entry.id}
                  style={{
                    background: "white",
                    borderRadius: 12,
                    border: "1px solid #ede9e3",
                    padding: "14px 18px",
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    position: "relative",
                  }}
                >
                  <button
                    onClick={() => onDelete?.(entry.id)}
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 12,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#9ca3af",
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                  <div
                    style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 9px",
                      borderRadius: 99,
                      flexShrink: 0,
                      marginTop: 2,
                      background: typeMeta.background,
                      color: typeMeta.color,
                    }}
                  >
                    {typeMeta.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 13,
                      color: "#374151",
                      lineHeight: 1.6,
                      flex: 1,
                    }}
                  >
                    {entry.note}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
