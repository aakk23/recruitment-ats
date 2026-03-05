// candidate/shared.jsx
// Shared constants, helpers, and primitive UI components used across
// all CandidatePanel sub-components. Nothing here has local state.
// ── Date formatter ────────────────────────────────────────────────────────────

export function fmt(raw) {
  if (!raw) return "";
  return new Date(raw).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

// ── Stage colour lookup ───────────────────────────────────────────────────────

const STAGE_COLOURS = {
  new:       "var(--stage-new)",
  screening: "var(--stage-screening)",
  interview: "var(--stage-interview)",
  offered:   "var(--stage-offered)",
  hired:     "var(--stage-hired)",
  rejected:  "var(--stage-rejected)",
};

export const sc = (n) => STAGE_COLOURS[n?.toLowerCase()] ?? "var(--text-muted)";

// ── @mention text helpers ─────────────────────────────────────────────────────

// Given textarea value + cursor position, find the active @-mention token.
// Returns { query, start, end } or null.
export function getActiveMention(text, cursor) {
  let i = cursor - 1;
  while (i >= 0 && text[i] !== "@" && text[i] !== "\n" && !/\s/.test(text[i])) i--;
  if (i >= 0 && text[i] === "@") {
    const query = text.slice(i + 1, cursor);
    if (!/\s/.test(query)) return { query, start: i, end: cursor };
  }
  return null;
}

// Extract all @Name tokens from comment text, return matching recruiter ids.
export function extractTaggedIds(text, recruiters) {
  const mentions = [...text.matchAll(/@([\w .'-]+)/g)].map(m => m[1].trim());
  const ids = [];
  for (const m of mentions) {
    const r = recruiters.find(r => r.name.toLowerCase() === m.toLowerCase());
    if (r && !ids.includes(r.id)) ids.push(r.id);
  }
  return ids;
}

// ── LockIcon SVG ──────────────────────────────────────────────────────────────

export function LockIcon({ size = 14, locked = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      {locked ? (
        <>
          <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="7" cy="9.25" r="1" fill="currentColor" />
        </>
      ) : (
        <>
          <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M4.5 6V4a2.5 2.5 0 014.5 2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="7" cy="9.25" r="1" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

// ── Layout primitives ─────────────────────────────────────────────────────────

export function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{
        fontSize: "10px", fontWeight: 700, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "9px",
      }}>
        {title}
      </div>
      <div style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "10px 14px",
      }}>
        {children}
      </div>
    </div>
  );
}

export function Row({ label, children }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "5px 0", borderBottom: "1px solid var(--border-subtle)",
    }}>
      <span style={{ fontSize: "12px", color: "var(--text-muted)", flexShrink: 0, minWidth: "110px" }}>
        {label}
      </span>
      <span style={{ fontSize: "12px", color: "var(--text-secondary)", textAlign: "right" }}>
        {children}
      </span>
    </div>
  );
}

export function SmallSelect({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <label style={{
        fontSize: "11px", fontWeight: 600, color: "var(--text-muted)",
        display: "block", marginBottom: "4px",
      }}>
        {label}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
        <option value="">— unchanged —</option>
        {options.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
    </div>
  );
}

export function Btn({ children, onClick, disabled, variant = "primary", style: s = {}, size = "md" }) {
  const primary = variant === "primary";
  const pad     = size === "sm" ? "5px 14px" : "8px 18px";
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: pad, fontSize: "13px", fontWeight: 600,
        background: disabled ? "var(--bg-overlay)" : primary ? "var(--accent)" : "var(--bg-raised)",
        color:      disabled ? "var(--text-muted)"  : primary ? "#fff"          : "var(--text-secondary)",
        border: primary ? "none" : "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)", transition: "background 0.15s", ...s,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = primary ? "var(--accent-hover)" : "var(--bg-overlay)"; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = primary ? "var(--accent)" : "var(--bg-raised)"; }}
    >
      {children}
    </button>
  );
}

export function CentredMsg({ children }) {
  return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "13px", color: "var(--text-muted)",
    }}>
      {children}
    </div>
  );
}

export function EmptyMsg({ children }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: "13px" }}>
      {children}
    </div>
  );
}

export const selectStyle = {
  width: "100%", padding: "6px 10px",
  background: "var(--bg-overlay)", color: "var(--text-primary)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  fontSize: "13px", outline: "none", cursor: "pointer",
};