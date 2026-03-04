import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const cardStyle = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
  border: "1px solid #ede9e3",
};

export function CollapsiblePanel({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ ...cardStyle, marginBottom: 12, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          padding: "16px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontWeight: 700,
            fontSize: 14,
            color: "#1a1a1a",
          }}
        >
          {title}
        </span>
        {open ? (
          <ChevronUp size={16} color="#9ca3af" />
        ) : (
          <ChevronDown size={16} color="#9ca3af" />
        )}
      </button>
      {open && <div style={{ padding: "0 22px 22px" }}>{children}</div>}
    </div>
  );
}
