import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || "Unknown error",
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleResetApp = () => {
    const keysToRemove = [
      "tasks",
      "cumulative",
      "streak",
      "lastActive",
      "pitch",
      "kanban",
      "activityLog",
      "notes",
      "notesByDate",
      "user-settings",
      "notes-ttl-hours",
      "profile-ask",
      "profile-looking",
      "profile-proof",
    ];

    keysToRemove.forEach((k) => localStorage.removeItem(k));

    const prefixes = ["job-dashboard-", "weekly-"];
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      for (const p of prefixes) {
        if (key.startsWith(p)) {
          localStorage.removeItem(key);
          break;
        }
      }
    }

    window.location.reload();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#f7f5f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            boxSizing: "border-box",
            fontFamily: "Plus Jakarta Sans",
          }}
        >
          <div style={{ width: "100%", maxWidth: 640 }}>
            <h1
              style={{
                margin: "0 0 12px",
                color: "#1a1a1a",
                fontSize: 30,
                lineHeight: 1.2,
                fontWeight: 800,
              }}
            >
              Something went wrong
            </h1>

            <pre
              style={{
                margin: "0 0 16px",
                padding: 14,
                background: "#fff",
                border: "1px solid #ede9e3",
                borderRadius: 12,
                color: "#6b7280",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 13,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {this.state.errorMessage}
            </pre>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={this.handleResetApp}
                style={{
                  border: "none",
                  borderRadius: 8,
                  background: "#dc2626",
                  color: "#ffffff",
                  padding: "10px 14px",
                  fontFamily: "Plus Jakarta Sans",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Reset App
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  border: "none",
                  borderRadius: 8,
                  background: "#f3f0ea",
                  color: "#374151",
                  padding: "10px 14px",
                  fontFamily: "Plus Jakarta Sans",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
