// candidate/PanelHeader.jsx
// Fixed header inside the 420px panel column.
// Renders: candidate identity, resume/close buttons, stage+substage selectors, tab nav.

import { sc, selectStyle } from "./shared";

const TABS = (events, comments) => [
  { key: "overview",  label: "Overview" },
  { key: "timeline",  label: `Timeline${events.length   ? ` (${events.length})`   : ""}` },
  { key: "comments",  label: `Comments${comments.length ? ` (${comments.length})` : ""}` },
];

export default function PanelHeader({
  application,
  candidate,
  stages,
  substages,
  localStage,
  localSubstage,
  showResume,
  tab,
  events,
  comments,
  onStageChange,
  onSubstageChange,
  onToggleResume,
  onClose,
  onTabChange,
}) {
  const tabs = TABS(events, comments);

  return (
    <div style={{ padding: "18px 20px 0", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>

      {/* ── Identity row ── */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: "12px",
      }}>
        {/* Name + contact */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: "0 0 3px", fontSize: "16px", fontWeight: 700,
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {application.candidate_name}
          </h3>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            {application.email}
          </div>
          {candidate?.phone && (
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
              📞 {candidate.phone}
            </div>
          )}
          {candidate?.linkedin_url && (
            <a
              href={candidate.linkedin_url}
              target="_blank" rel="noreferrer"
              style={{ fontSize: "12px", color: "var(--accent)", marginTop: "2px", display: "inline-block" }}
            >
              🔗 LinkedIn
            </a>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "6px", alignItems: "flex-start", flexShrink: 0, marginLeft: "10px" }}>
          {candidate?.resume_url && (
            <button
              onClick={onToggleResume}
              title={showResume ? "Hide resume" : "Preview resume"}
              style={{
                padding: "5px 10px", fontSize: "11px", fontWeight: 600,
                background: showResume ? "var(--accent)" : "var(--bg-raised)",
                color: showResume ? "#fff" : "var(--text-secondary)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { if (!showResume) e.currentTarget.style.borderColor = "var(--accent)"; }}
              onMouseLeave={(e) => { if (!showResume) e.currentTarget.style.borderColor = "var(--border-default)"; }}
            >
              {showResume ? "◀ Resume" : "📄 Resume"}
            </button>
          )}
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", fontSize: "20px", color: "var(--text-muted)", padding: "2px 4px" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
          >×</button>
        </div>
      </div>

      {/* ── Stage + substage selectors ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "9px 12px", marginBottom: "14px",
        background: "var(--bg-raised)", borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-subtle)", flexWrap: "wrap",
      }}>
        <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: sc(localStage), flexShrink: 0 }} />

        <select
          value={localStage ?? ""}
          onChange={(e) => onStageChange(e.target.value)}
          style={selectStyle}
        >
          {stages.length === 0
            ? <option value={localStage}>{localStage}</option>
            : stages.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)
          }
        </select>

        {substages.length > 0 && (
          <>
            <span style={{ color: "var(--border-strong)", fontSize: "12px", flexShrink: 0 }}>›</span>
            <select
              value={localSubstage ?? ""}
              onChange={(e) => onSubstageChange(e.target.value)}
              style={{ ...selectStyle, fontSize: "12px" }}
            >
              <option value="">No substage</option>
              {substages.map((ss) => <option key={ss.id} value={ss.id}>{ss.name}</option>)}
            </select>
          </>
        )}
      </div>

      {/* ── Tab nav ── */}
      <div style={{ display: "flex" }}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            style={{
              flex: 1, padding: "9px 0",
              background: "transparent", border: "none",
              borderBottom: tab === key ? "2px solid var(--accent)" : "2px solid transparent",
              color: tab === key ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: "12px", fontWeight: tab === key ? 600 : 400,
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}