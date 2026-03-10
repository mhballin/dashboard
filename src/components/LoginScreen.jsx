import { useState } from "react";
import ErrorBoundary from "./ErrorBoundary";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(email, password);
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
            Sign in to continue
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
