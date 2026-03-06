// /Users/aakk/Documents/Projects/Build ATS/ATS/ats-ui/src/components/RoleDetailMisc.jsx
import { useState, useEffect, useRef } from "react";
import { css } from "./styles";

// ══ Visibility toggle ═════════════════════════════════════════════════════════

const VIS = {
  published: { label: "Published", color: "#22c55e", bg: "rgba(34,197,94,0.10)"   },
  internal:  { label: "Internal",  color: "#2563eb", bg: "rgba(37,99,235,0.12)"   },
  closed:    { label: "Closed",    color: "#6b7280", bg: "rgba(107,114,128,0.10)" },
};

export function VisToggle({ visibility, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cfg = VIS[visibility] || VIS.internal;

  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        ...css.ghostBtn,
        color: cfg.color, background: cfg.bg, borderColor: cfg.color + "55",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
        {cfg.label}
        <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 5px)", right: 0, zIndex: 400,
          background: "var(--bg-overlay)", border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-md)",
          minWidth: 148, overflow: "hidden",
        }}>
          {Object.entries(VIS).map(([k, c]) => (
            <div key={k} onClick={() => { onChange(k); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "9px 14px", cursor: "pointer", fontSize: 13,
                background: k === visibility ? c.bg : "transparent",
                color: k === visibility ? c.color : "var(--text-primary)",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => { if (k !== visibility) e.currentTarget.style.background = "var(--bg-raised)"; }}
              onMouseLeave={e => { if (k !== visibility) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
              {c.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══ Search box ════════════════════════════════════════════════════════════════

export function SearchBox({ value, onChange }) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{
        position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)",
        fontSize: 14, color: "var(--text-muted)", pointerEvents: "none",
        lineHeight: 1,
      }}>⌕</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search candidates…"
        style={{
          paddingLeft: 27, paddingRight: value ? 26 : 10,
          paddingTop: 6, paddingBottom: 6,
          background: "var(--bg-raised)", color: "var(--text-primary)",
          border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
          fontSize: 13, outline: "none", width: 180,
        }}
        onFocus={e => e.target.style.borderColor = "var(--accent)"}
        onBlur={e => e.target.style.borderColor = "var(--border-default)"}
      />
      {value && (
        <button onClick={() => onChange("")} style={{
          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
          background: "transparent", border: "none",
          fontSize: 15, color: "var(--text-muted)", lineHeight: 1,
        }}>×</button>
      )}
    </div>
  );
}

// ══ Ghost button ══════════════════════════════════════════════════════════════

export function GhostBtn({ children, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...css.ghostBtn,
        color: hov ? "var(--text-primary)" : "var(--text-muted)",
        borderColor: hov ? "var(--border-strong)" : "var(--border-default)",
      }}
    >{children}</button>
  );
}

export function BackButton({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...css.ghostBtn,
        color: hov ? "var(--text-primary)" : "var(--text-muted)",
        borderColor: hov ? "var(--border-strong)" : "var(--border-default)",
        display: "flex", alignItems: "center", gap: 5,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Jobs
    </button>
  );
}