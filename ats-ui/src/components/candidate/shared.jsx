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

// Walk backwards from cursor to find an active @token being typed right now.
// Returns { query, start, end } or null.
//
// Only returns a result while the user is mid-token — i.e. no whitespace
// between the '@' and the cursor. Once they type a space (confirming or
// dismissing the mention), the query would contain a space and we return null.
export function getActiveMention(text, cursor) {
  let i = cursor - 1;
  while (i >= 0 && text[i] !== "@" && text[i] !== "\n" && !/\s/.test(text[i])) i--;
  if (i >= 0 && text[i] === "@") {
    const query = text.slice(i + 1, cursor);
    // Active only while the user hasn't yet typed a space past the token.
    if (!/\s/.test(query)) return { query, start: i, end: cursor };
  }
  return null;
}

// Extract recruiter ids for every @Name token found in comment text.
//
// Bug fixed: the old regex /@([\w .'-]+)/g allowed spaces inside the token,
// so "@raj please check" was parsed as one mention: "raj please check".
// Since no recruiter name matches that string, tagging silently broke.
//
// New approach: scan for each '@', then try every known recruiter name at that
// position (longest first so "Raj Kumar" wins over "Raj"). Accept the match
// only if it ends at a word boundary — space, punctuation, or end-of-string.
export function extractTaggedIds(text, recruiters) {
  const ids   = [];
  // Sort descending by name length so longer names are tried first.
  const byLen = [...recruiters].sort((a, b) => b.name.length - a.name.length);

  let i = 0;
  while (i < text.length) {
    if (text[i] !== "@") { i++; continue; }

    const rest = text.slice(i + 1);
    for (const r of byLen) {
      if (rest.toLowerCase().startsWith(r.name.toLowerCase())) {
        // Must be followed by a non-name character (or end of string).
        const charAfter = rest[r.name.length];
        if (charAfter === undefined || /[\s,.\-!?;:()\n]/.test(charAfter)) {
          if (!ids.includes(r.id)) ids.push(r.id);
          break; // only one match per '@'
        }
      }
    }
    i++;
  }
  return ids;
}

// Split comment text into alternating plain/mention segments for rendering.
// Returns an array of { type: "text"|"mention", value: string }.
//
// Uses the same longest-first exact-match strategy as extractTaggedIds so that
// "@Raj Kumar please check" yields [mention:"@Raj Kumar", text:" please check"]
// instead of highlighting the whole sentence as one blue chip.
//
// recruiterNames is string[] — just the names, no ids needed here.
export function splitMentions(text, recruiterNames) {
  if (!text) return [{ type: "text", value: "" }];

  // Sort descending by length so "Raj Kumar" is tried before "Raj".
  const byLen = [...recruiterNames].sort((a, b) => b.length - a.length);
  const parts = [];
  let pos = 0;

  while (pos < text.length) {
    const atIdx = text.indexOf("@", pos);
    if (atIdx === -1) {
      // No more @ — remainder is plain text.
      parts.push({ type: "text", value: text.slice(pos) });
      break;
    }

    // Plain text before this '@'
    if (atIdx > pos) parts.push({ type: "text", value: text.slice(pos, atIdx) });

    // Try to match a known recruiter name at atIdx+1
    const rest = text.slice(atIdx + 1);
    let matched = null;
    for (const name of byLen) {
      if (rest.toLowerCase().startsWith(name.toLowerCase())) {
        const charAfter = rest[name.length];
        if (charAfter === undefined || /[\s,.\-!?;:()\n]/.test(charAfter)) {
          matched = name;
          break;
        }
      }
    }

    if (matched) {
      parts.push({ type: "mention", value: "@" + text.slice(atIdx + 1, atIdx + 1 + matched.length) });
      pos = atIdx + 1 + matched.length;
    } else {
      // '@' with no matching name — treat it as plain text
      parts.push({ type: "text", value: "@" });
      pos = atIdx + 1;
    }
  }

  return parts.length ? parts : [{ type: "text", value: text }];
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