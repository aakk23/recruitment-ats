// src/pages/LoginPage.jsx
import { useState } from "react";
import { login } from "../api";

function LoginPage({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    login(email, password)
      .then(() => onLogin())   // ← cookie is already set; nothing to store
      .catch(() => setError("Invalid email or password"))
      .finally(() => setLoading(false));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      {/* Subtle grid background */}
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundImage: `
          linear-gradient(var(--border-subtle) 1px, transparent 1px),
          linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)
        `,
        backgroundSize: "48px 48px",
        opacity: 0.4,
        pointerEvents: "none",
      }} />

      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: "380px",
      }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "48px",
            height: "48px",
            background: "var(--accent)",
            borderRadius: "12px",
            marginBottom: "16px",
            boxShadow: "0 0 32px rgba(37,99,235,0.3)",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 17V7l7 5 7-5v10"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 style={{
            fontSize: "22px",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            margin: 0,
          }}>
            Maverick<span style={{ color: "var(--accent)" }}>ATS</span>
          </h1>
          <p style={{
            marginTop: "6px",
            fontSize: "13px",
            color: "var(--text-muted)",
          }}>
            Recruitment operations platform
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-xl)",
          padding: "32px",
          boxShadow: "var(--shadow-lg)",
        }}>
          <p style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "20px",
          }}>
            Sign in to your account
          </p>

          {/* Email */}
          <label style={labelStyle}>Email address</label>
          <input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="email"
            style={inputStyle}
          />

          {/* Password */}
          <label style={{ ...labelStyle, marginTop: "16px" }}>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="current-password"
            style={inputStyle}
          />

          {/* Error */}
          {error && (
            <div style={{
              marginTop: "12px",
              padding: "10px 12px",
              background: "var(--danger-muted)",
              border: "1px solid var(--danger)",
              borderRadius: "var(--radius-md)",
              fontSize: "13px",
              color: "var(--danger)",
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            disabled={loading || !email || !password}
            onClick={handleSubmit}
            style={{
              display: "block",
              width: "100%",
              marginTop: "24px",
              padding: "11px",
              background: loading || !email || !password
                ? "var(--bg-overlay)"
                : "var(--accent)",
              color: loading || !email || !password
                ? "var(--text-muted)"
                : "#fff",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontSize: "14px",
              fontWeight: 600,
              textAlign: "center",
              transition: "all 0.15s",
              boxShadow: (!loading && email && password)
                ? "0 0 20px rgba(37,99,235,0.25)"
                : "none",
            }}
            onMouseEnter={(e) => {
              if (!loading && email && password)
                e.currentTarget.style.background = "var(--accent-hover)";
            }}
            onMouseLeave={(e) => {
              if (!loading && email && password)
                e.currentTarget.style.background = "var(--accent)";
            }}
          >
            {loading ? "Signing in…" : "Sign in →"}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--text-secondary)",
  marginBottom: "6px",
  letterSpacing: "0.02em",
};

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "10px 12px",
  background: "var(--bg-raised)",
  color: "var(--text-primary)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  fontSize: "14px",
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

export default LoginPage;