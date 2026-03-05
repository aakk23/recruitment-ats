// src/components/Navbar.jsx
// user is fetched once in App.jsx and passed down — avoids a duplicate /auth/me call.
import { useState, useEffect, useRef } from "react";

export default function Navbar({ user, onLogout, onSettings }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
    : "—";

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 500, height: "52px",
      background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="var(--accent)" />
          <path d="M5 17V7l7 5 7-5v10" stroke="#fff" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <span style={{ fontWeight: 700, fontSize: "15px", letterSpacing: "-0.02em" }}>
          Maverick<span style={{ color: "var(--accent)", marginLeft: "2px" }}>ATS</span>
        </span>
      </div>

      {/* User avatar + dropdown */}
      <div ref={ref} style={{ position: "relative" }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "4px 8px 4px 4px",
            background: open ? "var(--bg-raised)" : "transparent",
            border: "1px solid " + (open ? "var(--border-default)" : "transparent"),
            borderRadius: "var(--radius-md)", transition: "all 0.15s",
          }}
          onMouseEnter={e => { if (!open) { e.currentTarget.style.background = "var(--bg-raised)"; e.currentTarget.style.borderColor = "var(--border-subtle)"; }}}
          onMouseLeave={e => { if (!open) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}}
        >
          {/* Avatar */}
          <div style={{
            width: "28px", height: "28px", borderRadius: "50%",
            background: "var(--bg-overlay)", border: "1px solid var(--border-default)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "10px", fontWeight: 700, color: "var(--text-secondary)",
            fontFamily: "var(--font-mono)", flexShrink: 0,
          }}>{initials}</div>
          {user && (
            <span style={{
              fontSize: "13px", color: "var(--text-secondary)",
              maxWidth: "140px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{user.name}</span>
          )}
          {/* Admin badge */}
          {user?.is_admin && (
            <span style={{
              fontSize: "9px", fontWeight: 700, letterSpacing: "0.05em",
              color: "var(--accent)", background: "var(--accent-muted)",
              border: "1px solid rgba(37,99,235,0.3)",
              borderRadius: "4px", padding: "1px 5px", flexShrink: 0,
            }}>ADMIN</span>
          )}
          {/* Chevron */}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
            style={{ color: "var(--text-muted)", transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }}>
            <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0,
            background: "var(--bg-overlay)", border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-md)",
            minWidth: "200px", overflow: "hidden", zIndex: 600,
          }}>
            {/* User info */}
            {user && (
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px" }}>{user.name}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{user.email}</div>
                {user.is_admin && (
                  <div style={{ fontSize: "10px", color: "var(--accent)", marginTop: "4px", fontWeight: 600 }}>
                    Administrator
                  </div>
                )}
              </div>
            )}
            <div style={{ padding: "4px 0" }}>
              <DropdownItem
                icon="⚙"
                label="Settings"
                onClick={() => { setOpen(false); onSettings?.(); }}
              />
              <div style={{ height: "1px", background: "var(--border-subtle)", margin: "4px 0" }} />
              <DropdownItem icon="→" label="Sign out" danger onClick={() => { setOpen(false); onLogout(); }} />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function DropdownItem({ icon, label, onClick, disabled, hint, danger }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: "10px", padding: "8px 14px",
        cursor: disabled ? "default" : "pointer",
        background: hov ? "var(--bg-raised)" : "transparent",
        opacity: disabled ? 0.4 : 1, transition: "background 0.1s",
      }}
    >
      <span style={{ fontSize: "12px", color: danger ? "var(--danger)" : "var(--text-muted)", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: "13px", color: danger ? "var(--danger)" : "var(--text-primary)", flex: 1 }}>{label}</span>
      {hint && <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{hint}</span>}
    </div>
  );
}