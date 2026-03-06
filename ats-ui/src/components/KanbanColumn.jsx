// /Users/aakk/Documents/Projects/Build ATS/ATS/ats-ui/src/components/KanbanColumn.jsx
import { useRef } from "react";
import KanbanCard from "./KanbanCard";

// ══ Kanban column ═════════════════════════════════════════════════════════════

export default function KanbanColumn({
  col, apps, stageColor, hasSubstages, search,
  selectedApp, isDragOver, draggedId,
  onSelect, onDragStart, onDragEnd, makeColHandlers,
}) {
  const colRef = useRef(null);
  const handlers = makeColHandlers(col.id, colRef);

  return (
    <div
      ref={colRef}
      {...handlers}
      style={{
        // Single-column (no substages): flex:1 fills width, capped at 380px
        // Multi-column: fixed 264px, board scrolls
        flex: hasSubstages ? "0 0 264px" : "1 1 auto",
        maxWidth: hasSubstages ? undefined : 380,
        minWidth: 0,
        display: "flex", flexDirection: "column",
        background: isDragOver ? "rgba(37,99,235,0.05)" : "var(--bg-surface)",
        border: isDragOver ? "1.5px solid var(--accent)" : "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        transition: "border-color 0.12s, background 0.12s",
      }}
    >
      {/* ── Column header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "11px 14px 10px",
        borderBottom: `2px solid ${isDragOver ? "var(--accent)" : stageColor + "33"}`,
        flexShrink: 0,
        transition: "border-color 0.12s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Vertical pip in stage colour */}
          <span style={{
            width: 3, height: 16, borderRadius: 2, flexShrink: 0,
            background: isDragOver ? "var(--accent)" : stageColor,
            transition: "background 0.12s",
          }} />
          <span style={{
            fontSize: 12, fontWeight: 600, textTransform: "capitalize",
            color: isDragOver ? "var(--accent)" : "var(--text-secondary)",
            transition: "color 0.12s",
          }}>
            {col.label}
          </span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)",
          background: "var(--bg-overlay)", color: "var(--text-muted)",
          borderRadius: 999, padding: "1px 8px", minWidth: 22, textAlign: "center",
        }}>
          {apps.length}
        </span>
      </div>

      {/* ── Cards area ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: 8, minHeight: 80 }}>
        {apps.length === 0 ? (
          <EmptyDropZone isDragOver={isDragOver} search={search} />
        ) : (
          apps.map(app => (
            <KanbanCard
              key={app.application_id}
              app={app}
              isSelected={selectedApp?.application_id === app.application_id}
              isDragging={draggedId === app.application_id}
              stageColor={stageColor}
              onSelect={onSelect}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Empty drop zone ───────────────────────────────────────────────────────────

function EmptyDropZone({ isDragOver, search }) {
  return (
    <div style={{
      height: "calc(100% - 8px)", minHeight: 64,
      margin: 4,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 6,
      border: `1.5px dashed ${isDragOver ? "var(--accent)" : "var(--border-subtle)"}`,
      borderRadius: "var(--radius-md)",
      color: isDragOver ? "var(--accent)" : "var(--text-muted)",
      fontSize: 12, transition: "border-color 0.12s, color 0.12s",
    }}>
      {isDragOver ? (
        <>
          <span style={{ fontSize: 18, opacity: 0.7 }}>↓</span>
          <span>Drop here</span>
        </>
      ) : (
        <span>{search ? "No matches" : "No candidates"}</span>
      )}
    </div>
  );
}