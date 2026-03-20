import { useState } from "react";
import ErrorBoundary from "./ErrorBoundary";
import { theme, cardStyle as themeCardStyle } from "../styles/theme";

export default function LoginScreen({ onLogin, onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    setLoading(true);
    if (mode === "register" && password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }
    try {
      if (mode === "register") {
        if (onRegister) await onRegister(email, password, name);
      } else {
        await onLogin(email, password);
      }
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <div style={{
        minHeight: "100vh",
        background: theme.colors.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: theme.fonts.ui,
      }}>
        <div style={{
          ...themeCardStyle(),
          padding: "40px 36px",
          width: "100%",
          maxWidth: 380,
        }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: "#1a1a1a", marginBottom: 4 }}>
            Job Search HQ
          </div>
          <div style={{ fontSize: 13, color: theme.colors.muted, marginBottom: 28 }}>
            {mode === "register" ? "Create an account" : "Sign in to continue"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mode === "register" && (
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit(e)}
                style={{
                  padding: "10px 14px",
                  borderRadius: theme.radii.default,
                  border: `1px solid ${theme.colors.inputBorder}`,
                  fontSize: 14,
                  fontFamily: theme.fonts.ui,
                  outline: "none",
                }}
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                padding: "10px 14px",
                borderRadius: theme.radii.default,
                border: `1px solid ${theme.colors.inputBorder}`,
                fontSize: 14,
                fontFamily: theme.fonts.ui,
                outline: "none",
              }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit(e)}
              style={{
                padding: "10px 14px",
                borderRadius: theme.radii.default,
                border: `1px solid ${theme.colors.inputBorder}`,
                fontSize: 14,
                fontFamily: theme.fonts.ui,
                outline: "none",
              }}
            />
            {mode === "register" && (
              <div style={{ fontSize: 12, color: theme.colors.muted, fontFamily: theme.fonts.ui }}>
                Password must be at least 8 characters.
              </div>
            )}
            {error && (
              <div style={{ fontSize: 13, color: "#dc2626" }}>{error}</div>
            )}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                padding: "11px 0",
                borderRadius: theme.radii.default,
                border: "none",
                background: loading ? theme.colors.muted : theme.colors.primary,
                color: "#ffffff",
                fontFamily: theme.fonts.ui,
                fontWeight: 700,
                fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: 4,
              }}
            >
              {loading ? (mode === "register" ? "Creating…" : "Signing in…") : (mode === "register" ? "Create account" : "Sign in")}
            </button>
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <button
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError("");
                }}
                style={{
                  fontSize: 13,
                  color: theme.colors.muted,
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  padding: 0,
                }}
              >
                {mode === "login" ? "Don't have an account? Create one" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
