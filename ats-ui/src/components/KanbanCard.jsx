// /Users/aakk/Documents/Projects/Build ATS/ATS/ats-ui/src/components/KanbanCard.jsx
import { useState } from "react";

// ══ Kanban card ═══════════════════════════════════════════════════════════════

export default function KanbanCard({ app, isSelected, isDragging, stageColor, onSelect, onDragStart, onDragEnd, canDrag = true }) {
  const [hov, setHov] = useState(false);
  const ini = (app.candidate_name || "?")
    .split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");

  return (
    <div
      draggable={canDrag}
      onDragStart={canDrag ? (e => onDragStart(e, app.application_id)) : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      onClick={() => onSelect(app)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: isSelected ? "var(--accent-muted)" : hov ? "var(--bg-overlay)" : "var(--bg-raised)",
        border: isSelected ? "1px solid var(--accent)" : `1px solid ${hov ? "var(--border-default)" : "var(--border-subtle)"}`,
        borderRadius: "var(--radius-md)",
        padding: "10px 12px", marginBottom: 6,
        cursor: canDrag ? (isDragging ? "grabbing" : "grab") : "pointer",
        opacity: isDragging ? 0.3 : 1,
        transform: isDragging ? "rotate(1.5deg) scale(0.96)" : hov && !isDragging ? "translateY(-1px)" : "none",
        boxShadow: hov && !isDragging ? "0 2px 8px rgba(0,0,0,0.4)" : "none",
        transition: isDragging
          ? "opacity 0.1s, transform 0.1s"
          : "border-color 0.12s, background 0.12s, transform 0.12s, box-shadow 0.12s",
        userSelect: "none",
        // Left accent in stage colour when not selected
        borderLeft: isSelected ? "3px solid var(--accent)" : `3px solid ${stageColor}55`,
      }}
    >
      {/* Name row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
        {/* Avatar */}
        <div style={{
          width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
          background: isSelected ? "rgba(37,99,235,0.18)" : "var(--bg-overlay)",
          border: `1px solid ${isSelected ? "rgba(37,99,235,0.4)" : "var(--border-default)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 700, fontFamily: "var(--font-mono)",
          color: isSelected ? "var(--accent)" : "var(--text-muted)",
        }}>
          {ini}
        </div>

        <span style={{
          fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
        }}>
          {app.candidate_name}
        </span>

        {/* Drag grip — appears on hover */}
        <span style={{
          fontSize: 12, color: "var(--text-muted)",
          opacity: hov ? 0.6 : 0, transition: "opacity 0.15s", flexShrink: 0,
          lineHeight: 1,
        }}>⠿</span>
      </div>

      {/* Email */}
      <div style={{
        fontSize: 11, color: "var(--text-muted)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        paddingLeft: 34, // align under name, past avatar
        marginBottom: app.assigned_recruiter_name ? 4 : 0,
      }}>
        {app.email}
      </div>

      {/* Assigned recruiter pill */}
      {app.assigned_recruiter_name && (
        <div style={{ paddingLeft: 34 }}>
          <span style={{
            fontSize: 10, color: "var(--text-muted)",
            display: "inline-flex", alignItems: "center", gap: 3,
          }}>
            <span style={{ opacity: 0.4, fontSize: 9 }}>▸</span>
            {app.assigned_recruiter_name}
          </span>
        </div>
      )}
    </div>
  );
}
