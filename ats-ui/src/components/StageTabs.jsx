// /Users/aakk/Documents/Projects/Build ATS/ATS/ats-ui/src/components/StageTabs.jsx
import { useState } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGE_COLOR = {
  new:       "#64748b",
  screening: "#3b82f6",
  interview: "#8b5cf6",
  offered:   "#f59e0b",
  hired:     "#22c55e",
  rejected:  "#ef4444",
};
export const stageColor = (name) => STAGE_COLOR[name?.toLowerCase()] ?? "#94a3b8";


// ══ Stage pipeline tabs ═══════════════════════════════════════════════════════
//  New  2  ›  Screening  5  ›  Interview  1  ›  Offered  0  ›  Hired  0  ›  Rejected  0
//  Active tab gets a coloured bottom border + count badge tinted in stage colour.

export default function StageTabs({ stages, active, counts, onSelect }) {
  return (
    <div style={{
      display: "flex", alignItems: "stretch",
      overflowX: "auto", padding: "0 20px",
      // hide scrollbar visually
      scrollbarWidth: "none", msOverflowStyle: "none",
    }}>
      {stages.map((s, i) => {
        const isActive = s.name === active;
        const color    = stageColor(s.name);
        const count    = counts[s.name] ?? 0;
        const isLast   = i === stages.length - 1;

        return (
          <div key={s.name} style={{ display: "flex", alignItems: "stretch", flexShrink: 0 }}>
            <StageTab
              name={s.name}
              color={color}
              count={count}
              isActive={isActive}
              onClick={() => onSelect(s.name)}
            />
            {/* Pipeline arrow connector */}
            {!isLast && (
              <div style={{
                display: "flex", alignItems: "center", padding: "0 2px", paddingBottom: 2,
              }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M3 1.5l3.5 3.5L3 8.5"
                    stroke="var(--border-strong)" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StageTab({ name, color, count, isActive, onClick }) {
  const [hov, setHov] = useState(false);
  const show = isActive || hov;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "10px 16px 8px",
        background: "transparent", border: "none",
        // Bottom border: active = solid colour, hover = faint colour, inactive = none
        borderBottom: isActive
          ? `2px solid ${color}`
          : hov
            ? `2px solid ${color}44`
            : "2px solid transparent",
        cursor: "pointer",
        transition: "border-color 0.15s",
      }}
    >
      {/* Stage dot */}
      <span style={{
        width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
        background: show ? color : "var(--border-strong)",
        boxShadow: isActive ? `0 0 0 3px ${color}20` : "none",
        transition: "background 0.15s, box-shadow 0.15s",
      }} />

      {/* Stage name */}
      <span style={{
        fontSize: 13, fontWeight: isActive ? 600 : 400,
        color: isActive ? "var(--text-primary)" : hov ? "var(--text-secondary)" : "var(--text-muted)",
        textTransform: "capitalize",
        transition: "color 0.15s",
        letterSpacing: isActive ? "-0.01em" : 0,
      }}>
        {name}
      </span>

      {/* Count badge */}
      <span style={{
        minWidth: 18, padding: "0 5px", borderRadius: 999,
        fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)",
        lineHeight: "18px", textAlign: "center",
        background: isActive ? `${color}22` : "var(--bg-overlay)",
        color: isActive ? color : "var(--text-muted)",
        transition: "background 0.15s, color 0.15s",
      }}>
        {count}
      </span>
    </button>
  );
}