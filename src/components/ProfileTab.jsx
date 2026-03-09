import { useRef, useEffect } from "react";

export default function ProfileTab({ pitch, setPitch }) {
  const cardStyle = {
    background: "#ffffff",
    borderRadius: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
    border: "1px solid #ede9e3",
  };

  const lbl = {
    fontFamily: "'Plus Jakarta Sans',sans-serif",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#9ca3af",
  };

  const pitchRef = useRef(null);

  const adjustHeight = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const adjustPitchHeight = () => adjustHeight(pitchRef.current);

  useEffect(() => {
    adjustPitchHeight();
    const onResize = () => {
      adjustPitchHeight();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div style={{ ...cardStyle, padding: "24px 26px" }}>
      <div style={{ ...lbl, marginBottom: 8 }}>Profile</div>
      <div>
        <div style={{ ...lbl, marginBottom: 8 }}>Your Pitch</div>
        <textarea
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          ref={pitchRef}
          onInput={adjustPitchHeight}
          style={{
            width: "100%",
            minHeight: 150,
            background: "#fafaf8",
            border: "1px solid #ede9e3",
            borderRadius: 12,
            padding: 14,
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 13,
            lineHeight: 1.7,
            color: "#374151",
            outline: "none",
            resize: "none",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        />
      </div>
    </div>
  );
}
