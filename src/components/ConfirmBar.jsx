import React from "react";
import { theme } from "../styles/theme";

export default function ConfirmBar({
  open,
  message,
  primaryLabel = "Confirm",
  onPrimary = () => {},
  secondaryLabel = "Cancel",
  onSecondary = () => {},
  variant,
  primaryStyle = {},
}) {
  if (!open) return null;

  const isDanger = variant === "danger";
  const primaryBaseStyle = isDanger
    ? {
        background: theme.colors.dangerBg,
        border: `1px solid ${theme.colors.dangerBorder}`,
        color: theme.colors.dangerText,
      }
    : {
        background: theme.colors.primary,
        border: "none",
        color: "white",
      };

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: 24,
        zIndex: 1101,
        width: "100%",
        maxWidth: 720,
        padding: "0 16px",
        boxSizing: "border-box",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: theme.colors.cardBg,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radii.default,
          padding: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ fontFamily: theme.fonts.ui, color: theme.colors.text, fontSize: 13 }}>{message}</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={onPrimary}
            style={{
              ...primaryBaseStyle,
              ...primaryStyle,
              borderRadius: 8,
              padding: "8px 16px",
              fontFamily: theme.fonts.ui,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {primaryLabel}
          </button>
          <button
            onClick={onSecondary}
            style={{
              background: theme.colors.cardBg,
              border: `1px solid ${theme.colors.inputBorder}`,
              borderRadius: theme.radii.default,
              padding: "8px 16px",
              color: theme.colors.muted,
              fontFamily: theme.fonts.ui,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {secondaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
