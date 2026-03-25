import { useState } from "react";
import ErrorBoundary from "./ErrorBoundary";
import { theme, cardStyle as themeCardStyle } from "../styles/theme";

export default function LoginScreen({ onLogin, onRegister }) {
  const configuredBaseUrl = (import.meta.env.VITE_API_URL || "").trim();
  const apiBaseUrl = configuredBaseUrl.replace(/\/+$/, "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState("idle"); // idle, sending, sent, error
  const [forgotError, setForgotError] = useState("");

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
            {mode === "login" && (
              <div style={{ textAlign: "right", marginTop: 6 }}>
                {!showForgot ? (
                  <button
                    onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotError(""); setForgotStatus("idle") }}
                    style={{ background: "none", border: "none", color: theme.colors.muted, cursor: "pointer", fontSize: 13, padding: 0 }}
                  >
                    Forgot password?
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                    <input
                      type="email"
                      placeholder="Your account email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      style={{ padding: "8px 10px", borderRadius: theme.radii.small, border: `1px solid ${theme.colors.inputBorder}`, fontSize: 13, fontFamily: theme.fonts.ui, outline: "none", flex: 1 }}
                    />
                    <button
                      onClick={async () => {
                        setForgotError("");
                        setForgotStatus("sending");
                        try {
                          const forgotUrl = apiBaseUrl ? `${apiBaseUrl}/auth/forgot` : "/auth/forgot";
                          const resp = await fetch(forgotUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: forgotEmail || email }) })
                          if (!resp.ok) throw new Error('Request failed')
                          setForgotStatus('sent')
                        } catch (err) {
                          setForgotError(err?.message || 'Failed to send')
                          setForgotStatus('error')
                        }
                      }}
                      style={{ padding: "8px 12px", borderRadius: theme.radii.default, border: "none", background: theme.colors.primary, color: '#fff', cursor: 'pointer', fontSize: 13 }}
                    >
                      {forgotStatus === 'sending' ? 'Sending…' : 'Send'}
                    </button>
                    <button
                      onClick={() => setShowForgot(false)}
                      style={{ background: 'none', border: 'none', color: theme.colors.muted, cursor: 'pointer', fontSize: 13 }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {forgotStatus === 'sent' && <div style={{ fontSize: 13, color: theme.colors.muted, marginTop: 6 }}>If that email exists, a reset link has been sent.</div>}
                {forgotError && <div style={{ fontSize: 13, color: '#dc2626', marginTop: 6 }}>{forgotError}</div>}
              </div>
            )}
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
