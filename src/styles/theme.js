export const theme = {
  colors: {
    bg: "#f7f5f0",
    cardBg: "#ffffff",
    border: "#ede9e3",
    muted: "#9ca3af",
    dangerBg: "#fef2f2",
    dangerBorder: "#e8d4d4",
    dangerText: "#92400e",
    primary: "#16a34a",
    text: "#1a1a1a",
    inputBorder: "#e5e7eb",
    subtle: "#f3f4f6",
    streakGradientStart: "#fef3c7",
    streakGradientEnd: "#fde68a",
    accent: "#d97706",
  },
  space: [0, 4, 8, 12, 16, 20, 24, 28, 32],
  radii: {
    card: 20,
    default: 8,
    small: 6,
  },
  shadows: {
    card: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
    streak: "0 2px 10px rgba(245,158,11,0.3)",
  },
  fonts: {
    ui: "'Plus Jakarta Sans',sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  gradients: {
    streak: (start, end) => `linear-gradient(135deg,${start},${end})`,
  },
};

export default theme;

export function cardStyle() {
  return {
    background: theme.colors.cardBg,
    borderRadius: theme.radii.card,
    boxShadow: theme.shadows.card,
    border: `1px solid ${theme.colors.border}`,
  };
}
