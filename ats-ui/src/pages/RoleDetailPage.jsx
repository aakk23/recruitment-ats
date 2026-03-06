// src/pages/RoleDetailPage.jsx
// Freshteam-style: Stage tabs (pipeline steps) + Substage Kanban columns (drag-and-drop)
import { useState, useEffect, useRef, useCallback } from "react";
import { fetchApplications, updateApplicationStage, fetchStages, updateVisibility } from "../api";
import CandidatePanel    from "../components/CandidatePanel";
import AddCandidatePanel from "../components/AddCandidatePanel";
import JobPanel          from "../components/JobPanel";
import { useToast }      from "../toast/ToastContext";
import { useAuth } from "../useAuth";

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGE_COLOR = {
  new:       "#64748b",
  screening: "#3b82f6",
  interview: "#8b5cf6",
  offered:   "#f59e0b",
  hired:     "#22c55e",
  rejected:  "#ef4444",
};
const stageColor = (name) => STAGE_COLOR[name?.toLowerCase()] ?? "#94a3b8";

const VIS = {
  published: { label: "Published", color: "#22c55e", bg: "rgba(34,197,94,0.10)"   },
  internal:  { label: "Internal",  color: "#2563eb", bg: "rgba(37,99,235,0.12)"   },
  closed:    { label: "Closed",    color: "#6b7280", bg: "rgba(107,114,128,0.10)" },
};

// Sentinel — "no column is being dragged over" (avoids null/undefined collision
// with the unassigned column whose id IS null)
const DRAG_NONE = Symbol("DRAG_NONE");

// ── Main component ────────────────────────────────────────────────────────────

export default function RoleDetailPage({ role: roleProp, onBack }) {
  const user = useAuth();
  const isAdmin = user?.is_admin === true;
  const [role,             setRole]             = useState(roleProp);
  const [apps,             setApps]             = useState([]);
  const [stages,           setStages]           = useState([]);
  const [activeStage,      setActiveStage]      = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);
  const [selectedApp,      setSelectedApp]      = useState(null);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [showJobPanel,     setShowJobPanel]     = useState(false);
  const [search,           setSearch]           = useState("");
  const [debouncedSearch,  setDebouncedSearch]  = useState("");

  const searchTimer = useRef(null);
  // Keep apps in a ref so handleStageChange never closes over stale state
  const appsRef     = useRef(apps);
  useEffect(() => { appsRef.current = apps; }, [apps]);

  const { showToast } = useToast();

  useEffect(() => { setRole(roleProp); }, [roleProp]);

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  // Load stages once, set first tab active
  useEffect(() => {
    fetchStages(role.id).then(data => {
      const list = data || [];
      setStages(list);
      if (list.length) setActiveStage(list[0].name);
    }).catch(() => {});
  }, [role.id]);

  // Reload apps whenever search changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchApplications(role.id, { search: debouncedSearch || undefined })
      .then(d => setApps(d.items ?? []))
      .catch(() => setError("Could not load candidates"))
      .finally(() => setLoading(false));
  }, [role.id, debouncedSearch]);

  const reloadApps = useCallback((openAfterId = null) => {
    fetchApplications(role.id).then(d => {
      const items = d.items ?? [];
      setApps(items);
      if (openAfterId) {
        const app = items.find(a => a.application_id === openAfterId);
        if (app) showToast({
          type: "success", message: "Candidate added",
          action: { label: "View", onClick: () => setSelectedApp(app) },
        });
      }
    }).catch(() => {});
  }, [role.id, showToast]);

  // Optimistic move — works for both drag-drop and CandidatePanel stage picker
  const handleStageChange = useCallback((applicationId, newStage, substageId = null) => {
    const snap = appsRef.current;
    const next = snap.map(a =>
      a.application_id === applicationId
        ? { ...a, stage: newStage, substage_id: substageId ?? null }
        : a
    );
    setApps(next);
    setSelectedApp(prev =>
      prev?.application_id === applicationId
        ? { ...prev, stage: newStage, substage_id: substageId ?? null }
        : prev
    );
    updateApplicationStage(applicationId, newStage, substageId).catch(() => {
      setApps(snap);
      showToast({ type: "error", message: "Move failed — please try again" });
    });
  }, [showToast]);

  const handleVisibilityChange = (vis) => {
    const prev = role.visibility;
    setRole(r => ({ ...r, visibility: vis }));
    updateVisibility(role.id, vis)
      .then(u => { if (u) setRole(u); })
      .catch(() => {
        setRole(r => ({ ...r, visibility: prev }));
        showToast({ type: "error", message: "Failed to update visibility" });
      });
  };

  // Derived
  const activeStageObj = stages.find(s => s.name === activeStage) ?? null;
  const substages      = activeStageObj?.substages ?? [];
  const stageApps      = apps.filter(a => a.stage === activeStage);
  const countByStage   = stages.reduce((acc, s) => {
    acc[s.name] = apps.filter(a => a.stage === s.name).length;
    return acc;
  }, {});

  return (
    <div style={{
      height: "calc(100vh - 52px)",
      background: "var(--bg-base)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-subtle)",
        flexShrink: 0,
      }}>

        {/* Row 1 — breadcrumb + toolbar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "0 20px", height: 52,
        }}>
          <BackButton onClick={onBack} />

          <svg width="6" height="10" viewBox="0 0 6 10" fill="none" style={{ flexShrink: 0 }}>
            <path d="M1 1l4 4-4 4" stroke="var(--border-strong)" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              color: "var(--text-primary)",
            }}>
              {role.title}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
              {[role.client, role.department].filter(Boolean).join(" · ")}
            </div>
          </div>

          {/* Toolbar */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <SearchBox value={search} onChange={setSearch} />
            <GhostBtn onClick={() => setShowJobPanel(true)}>Job Details</GhostBtn>
            <VisToggle visibility={role.visibility} onChange={handleVisibilityChange} />
            <button onClick={() => setShowAddCandidate(true)} style={css.primaryBtn}>
              + Add Candidate
            </button>
          </div>
        </div>

        {/* Row 2 — stage pipeline tabs */}
        <StageTabs
          stages={stages}
          active={activeStage}
          counts={countByStage}
          onSelect={setActiveStage}
        />
      </div>

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          margin: "12px 20px 0", flexShrink: 0,
          padding: "9px 14px", borderRadius: "var(--radius-md)",
          background: "rgba(239,68,68,0.07)", border: "1px solid #ef4444",
          color: "#ef4444", fontSize: 13,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>{error}</span>
          <button onClick={() => { setError(null); reloadApps(); }}
            style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: 12 }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Kanban board ────────────────────────────────────────────────────── */}
      <KanbanBoard
        substages={substages}
        stageApps={stageApps}
        stageName={activeStage}
        search={debouncedSearch}
        loading={loading}
        selectedApp={selectedApp}
        onSelect={setSelectedApp}
        onMove={(appId, substageId) => handleStageChange(appId, activeStage, substageId)}
      />

      {/* ── Side panels ─────────────────────────────────────────────────────── */}
      <CandidatePanel
        application={selectedApp}
        roleId={role.id}
        onClose={() => setSelectedApp(null)}
        onStageChange={handleStageChange}
      />
      {showAddCandidate && (
        <AddCandidatePanel
          role={role}
          onClose={() => setShowAddCandidate(false)}
          onCandidateAdded={reloadApps}
          onViewApplication={appId => {
            const app = apps.find(a => a.application_id === appId);
            if (app) { setSelectedApp(app); setShowAddCandidate(false); }
          }}
        />
      )}
      {showJobPanel && (
        <JobPanel
          role={role}
          onClose={() => setShowJobPanel(false)}
          onSaved={updated => setRole(updated)}
        />
      )}
    </div>
  );
}

// ══ Stage pipeline tabs ═══════════════════════════════════════════════════════
//  New  2  ›  Screening  5  ›  Interview  1  ›  Offered  0  ›  Hired  0  ›  Rejected  0
//  Active tab gets a coloured bottom border + count badge tinted in stage colour.

function StageTabs({ stages, active, counts, onSelect }) {
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

// ══ Kanban board ══════════════════════════════════════════════════════════════
//  When a stage has substages  → one column per substage + "Unassigned" first
//  When a stage has no substages → single full-width "All Candidates" column
//  Cards are draggable between columns.

function KanbanBoard({ substages, stageApps, stageName, search, loading, selectedApp, onSelect, onMove }) {
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
    setDraggedId(appId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

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
          />
        ))}
      </div>
    </div>
  );
}

// ══ Kanban column ═════════════════════════════════════════════════════════════

function KanbanColumn({
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

// ══ Kanban card ═══════════════════════════════════════════════════════════════

function KanbanCard({ app, isSelected, isDragging, stageColor, onSelect, onDragStart, onDragEnd }) {
  const [hov, setHov] = useState(false);
  const ini = (app.candidate_name || "?")
    .split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, app.application_id)}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(app)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: isSelected ? "var(--accent-muted)" : hov ? "var(--bg-overlay)" : "var(--bg-raised)",
        border: isSelected ? "1px solid var(--accent)" : `1px solid ${hov ? "var(--border-default)" : "var(--border-subtle)"}`,
        borderRadius: "var(--radius-md)",
        padding: "10px 12px", marginBottom: 6,
        cursor: isDragging ? "grabbing" : "grab",
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

// ══ Visibility toggle ═════════════════════════════════════════════════════════

function VisToggle({ visibility, onChange }) {
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

function SearchBox({ value, onChange }) {
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

function GhostBtn({ children, onClick }) {
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

function BackButton({ onClick }) {
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

// ══ Shared style objects ══════════════════════════════════════════════════════

const css = {
  ghostBtn: {
    padding: "5px 12px",
    background: "transparent", color: "var(--text-muted)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    fontSize: 13, fontWeight: 500,
    transition: "color 0.15s, border-color 0.15s",
  },
  primaryBtn: {
    padding: "6px 15px",
    background: "var(--accent)", color: "#fff",
    border: "none", borderRadius: "var(--radius-md)",
    fontSize: 13, fontWeight: 600,
  },
};