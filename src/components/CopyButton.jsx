import { useState } from "react";
import { Copy, CheckCheck } from "lucide-react";

export function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      style={{
        background: copied ? "#dcfce7" : "#f0fdf4",
        border: `1px solid ${copied ? "#86efac" : "#bbf7d0"}`,
        borderRadius: 8,
        padding: "5px 12px",
        fontSize: 12,
        color: copied ? "#15803d" : "#16a34a",
        cursor: "pointer",
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 5,
        transition: "all 0.15s",
        flexShrink: 0,
      }}
    >
      {copied ? (
        <>
          <CheckCheck size={13} />
          Copied!
        </>
      ) : (
        <>
          <Copy size={13} />
          Copy
        </>
      )}
    </button>
  );
}
