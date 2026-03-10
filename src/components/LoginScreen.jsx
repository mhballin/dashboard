import { useState } from "react";
import ErrorBoundary from "./ErrorBoundary";
import { register } from "../utils/pb";

export default function LoginScreen({ onLogin }) {
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
        await register(email, password, name);
        // Ensure app-level auth state is set (App provides onLogin to set authed)
        if (onLogin) await onLogin(email, password);
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
        background: "#f7f5f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <div style={{
          background: "#ffffff",
          borderRadius: 20,
          border: "1px solid #ede9e3",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
          padding: "40px 36px",
          width: "100%",
          maxWidth: 380,
        }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: "#1a1a1a", marginBottom: 4 }}>
            Job Search HQ
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 28 }}>
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
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 14,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
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
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 14,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
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
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 14,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                outline: "none",
              }}
            />
            {mode === "register" && (
              <div style={{ fontSize: 12, color: "#6b7280", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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
                borderRadius: 8,
                border: "none",
                background: loading ? "#9ca3af" : "#16a34a",
                color: "#ffffff",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
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
                  color: "#6b7280",
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
