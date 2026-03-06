// /Users/aakk/Documents/Projects/Build ATS/ATS/ats-ui/src/components/KanbanBoard.jsx
import { useState, useCallback } from "react";
import KanbanColumn from "./KanbanColumn";
import { stageColor } from "./StageTabs";

// Sentinel — "no column is being dragged over" (avoids null/undefined collision
// with the unassigned column whose id IS null)
const DRAG_NONE = Symbol("DRAG_NONE");


// ══ Kanban board ══════════════════════════════════════════════════════════════
//  When a stage has substages  → one column per substage + "Unassigned" first
//  When a stage has no substages → single full-width "All Candidates" column
//  Cards are draggable between columns.

export default function KanbanBoard({ substages, stageApps, stageName, search, loading, selectedApp, onSelect, onMove }) {
  // Use symbol sentinel so null (= unassigned column id) is unambiguous
  const [draggedId,   setDraggedId]   = useState(null);
  const [dragOverCol, setDragOverCol] = useState(DRAG_NONE);

  const hasSubstages = substages.length > 0;

  // Column definitions
  const columns = hasSubstages
    ? [
        { id: null,  label: "Unassigned" },
        ...substages.map(ss => ({ id: ss.id, label: ss.name })),
      ]
    : [{ id: null, label: "All Candidates" }];

  // Cards per column
  const appsForCol = (colId) => {
    if (!hasSubstages) return stageApps;
    return colId === null
      ? stageApps.filter(a => !a.substage_id)
      : stageApps.filter(a => a.substage_id === colId);
  };

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e, appId) => {
    if (!onMove) return;
    setDraggedId(appId);
    e.dataTransfer.effectAllowed = "move";
  }, [onMove]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverCol(DRAG_NONE);
  }, []);

  // onDragLeave fires for every child element — only clear when truly leaving the column.
  // We compare relatedTarget (where the cursor went) against the column element.
  const makeColHandlers = (colId, colRef) => ({
    onDragOver: (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverCol(colId);
    },
    onDragLeave: (e) => {
      // If the cursor is still inside the column element, ignore
      if (colRef.current && colRef.current.contains(e.relatedTarget)) return;
      setDragOverCol(DRAG_NONE);
    },
    onDrop: (e) => {
      e.preventDefault();
      if (!onMove) return;
      if (draggedId == null) return;
      const app = stageApps.find(a => a.application_id === draggedId);
      const currentColId = hasSubstages ? (app?.substage_id ?? null) : null;
      if (currentColId !== colId) onMove(draggedId, colId);
      setDraggedId(null);
      setDragOverCol(DRAG_NONE);
    },
  });

  const color = stageColor(stageName);

  return (
    <div style={{
      flex: 1,
      // Outer wrapper scrolls horizontally when there are many substage columns
      overflowX: "auto", overflowY: "hidden",
      opacity: loading ? 0.45 : 1,
      transition: "opacity 0.2s",
      pointerEvents: loading ? "none" : "auto",
    }}>
      {/* Inner flex row — min-content width so horizontal scroll works */}
      <div style={{
        display: "flex", gap: 12,
        padding: "16px 20px 20px",
        height: "100%",
        minWidth: hasSubstages ? "max-content" : undefined,
        boxSizing: "border-box",
      }}>
        {columns.map(col => (
          <KanbanColumn
            key={col.id ?? "__unassigned__"}
            col={col}
            apps={appsForCol(col.id)}
            stageColor={color}
            hasSubstages={hasSubstages}
            search={search}
            selectedApp={selectedApp}
            isDragOver={dragOverCol === col.id}
            draggedId={draggedId}
            onSelect={onSelect}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            makeColHandlers={makeColHandlers}
            canDrag={Boolean(onMove)}
          />
        ))}
      </div>
    </div>
  );
}
