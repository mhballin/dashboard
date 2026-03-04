import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CopyButton } from "./CopyButton";

export function SearchStringCard({ s, isEditing, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  if (isEditing) {
    return (
      <div
        style={{
          background: "#fafaf8",
          borderRadius: 16,
          border: "1px solid #e5e7eb",
          padding: "16px 20px",
          marginBottom: 10,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        {/* Top row: Label input + Delete button */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <input
            type="text"
            value={s.label}
            onChange={(e) => onUpdate({ ...s, label: e.target.value })}
            style={{
              flex: 1,
              fontWeight: 700,
              fontSize: 14,
              color: "#1a1a1a",
              border: "1px solid #ede9e3",
              borderRadius: 6,
              padding: "4px 8px",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              outline: "none",
            }}
          />
          <button
            onClick={onDelete}
            style={{
              fontSize: 14,
              color: "#ef4444",
              background: "none",
              border: "none",
              cursor: "pointer",
              marginLeft: 8,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Query textarea */}
        <textarea
          value={s.query}
          onChange={(e) => onUpdate({ ...s, query: e.target.value })}
          style={{
            width: "100%",
            minHeight: 80,
            resize: "vertical",
            fontFamily: "monospace",
            fontSize: 12,
            border: "1px solid #d1d5db",
            borderRadius: 10,
            padding: "10px 14px",
            boxSizing: "border-box",
            outline: "none",
            background: "white",
          }}
        />

        {/* Tip input */}
        <input
          type="text"
          value={s.tip || ""}
          onChange={(e) => onUpdate({ ...s, tip: e.target.value })}
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#6b7280",
            border: "1px solid #ede9e3",
            borderRadius: 6,
            padding: "4px 8px",
            width: "100%",
            boxSizing: "border-box",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            outline: "none",
            background: "white",
          }}
        />
      </div>
    );
  }

  // READ MODE
  return (
    <div
      style={{
        background: "white",
        borderRadius: 10,
        border: "1px solid #ede9e3",
        marginBottom: 4,
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Main row — always visible */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 14px",
          gap: 10,
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Label — left side */}
        <span
          style={{
            flex: 1,
            fontWeight: 600,
            fontSize: 13,
            color: "#1a1a1a",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
          }}
        >
          {s.label}
        </span>

        {/* Right side — Copy button + Chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div onClick={(e) => e.stopPropagation()}>
            <CopyButton text={s.query} />
          </div>
          {expanded ? (
            <ChevronUp size={14} color="#9ca3af" />
          ) : (
            <ChevronDown size={14} color="#9ca3af" />
          )}
        </div>
      </div>

      {/* Expanded content — query and tip */}
      {expanded && (
        <div
          style={{
            padding: "0 14px 12px",
            borderTop: "1px solid #f3f4f6",
          }}
        >
          {/* Query block */}
          <div
            style={{
              padding: "8px 10px",
              background: "#f7f5f0",
              borderRadius: 8,
              fontFamily: "monospace",
              fontSize: 11,
              color: "#374151",
              lineHeight: 1.5,
              wordBreak: "break-word",
              marginTop: 10,
            }}
          >
            {s.query}
          </div>

          {/* Tip line */}
          {s.tip && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: "#9ca3af",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}
            >
              💡 {s.tip}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
