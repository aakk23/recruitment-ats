// src/components/Navbar.jsx
// Persistent top navbar — rendered in App.jsx when authenticated

function Navbar({ onLogout }) {
  return (
    <header style={{
      position: "sticky",
      top: 0,
      zIndex: 500,
      height: "52px",
      background: "var(--bg-surface)",
      borderBottom: "1px solid var(--border-subtle)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      flexShrink: 0,
    }}>
      {/* ── Brand ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Logomark — geometric M */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="var(--accent)" />
          <path
            d="M5 17V7l7 5 7-5v10"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>

        <span style={{
          fontWeight: 700,
          fontSize: "15px",
          letterSpacing: "-0.02em",
          color: "var(--text-primary)",
        }}>
          Maverick
          <span style={{ color: "var(--accent)", marginLeft: "2px" }}>ATS</span>
        </span>
      </div>

      {/* ── Right side ── */}
      <button
        onClick={onLogout}
        style={{
          padding: "5px 14px",
          background: "transparent",
          color: "var(--text-secondary)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          fontSize: "13px",
          fontWeight: 500,
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--text-primary)";
          e.currentTarget.style.borderColor = "var(--border-strong)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-secondary)";
          e.currentTarget.style.borderColor = "var(--border-default)";
        }}
      >
        Sign out
      </button>
    </header>
  );
}

export default Navbar;