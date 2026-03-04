// src/pages/RoleDetailPage.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { fetchApplications, updateApplicationStage, fetchStages, updateVisibility, fetchRole } from "../api";
import CandidatePanel from "../components/CandidatePanel";
import AddCandidatePanel from "../components/AddCandidatePanel";
import JobDetailPanel from "../components/JobDetailPanel";
import { useToast } from "../toast/ToastContext";

// ── Visibility config ─────────────────────────────────────────────────────────
const VIS_CFG = {
  published: { label: "Published", color: "var(--success)",  bg: "var(--success-muted)" },
  internal:  { label: "Internal",  color: "var(--accent)",   bg: "var(--accent-muted)"  },
  closed:    { label: "Closed",    color: "var(--danger)",   bg: "var(--danger-muted)"  },
};
const VIS_ORDER = ["published", "internal", "closed"];

export default function RoleDetailPage({ role: roleProp, onBack }) {
  const [role,             setRole]             = useState(roleProp);
  const [apps,             setApps]             = useState([]);
  const [stages,           setStages]           = useState([]);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState(null);
  const [nextCursor,       setNextCursor]       = useState(null);
  const [selectedCandidate,setSelectedCandidate]= useState(null);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [showJobDetail,    setShowJobDetail]    = useState(false);
  const [expandedStage,    setExpandedStage]    = useState(null);  // stage name with open swimlanes
  const [searchQuery,      setSearchQuery]      = useState("");
  const [debouncedSearch,  setDebouncedSearch]  = useState("");
  const searchTimer = useRef(null);
  const { showToast } = useToast();

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery]);

  // Load stages once
  useEffect(() => {
    fetchStages(role.id).then(setStages).catch(() => {});
  }, [role.id]);

  // Load applications (re-runs on search)
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchApplications(role.id, { search: debouncedSearch || undefined })
      .then((data) => { setApps(data.items); setNextCursor(data.next_cursor); })
      .catch(() => setError("Could not load applications"))
      .finally(() => setLoading(false));
  }, [role.id, debouncedSearch]);

  const loadApplications = (openAfterId = null) => {
    setLoading(true);
    setError(null);
    fetchApplications(role.id)
      .then((data) => {
        setApps(data.items);
        setNextCursor(data.next_cursor);
        if (openAfterId) {
          const app = data.items.find((a) => a.application_id === openAfterId);
          if (app) {
            showToast({
              type: "success",
              message: "Candidate added",
              action: { label: "View", onClick: () => setSelectedCandidate(app) },
            });
          }
        }
      })
      .catch(() => setError("Could not load applications"))
      .finally(() => setLoading(false));
  };

  const handleStageChange = (applicationId, newStage, substageId = null) => {
    const previousApps = apps;
    setApps((prev) => prev.map((a) =>
      a.application_id === applicationId
        ? { ...a, stage: newStage, substage_id: substageId }
        : a
    ));
    setSelectedCandidate((prev) =>
      prev ? { ...prev, stage: newStage, substage_id: substageId } : prev
    );
    updateApplicationStage(applicationId, newStage, substageId).catch(() => {
      setApps(previousApps);
      showToast({ type: "error", message: "Failed to update stage. Please try again." });
    });
  };

  const handleVisibilityChange = (vis) => {
    updateVisibility(role.id, vis)
      .then((updated) => setRole(updated))
      .catch(() => showToast({ type: "error", message: "Failed to update visibility" }));
  };

  // Group apps by stage name
  const grouped = stages.reduce((acc, s) => {
    acc[s.name] = apps.filter((a) => a.stage === s.name);
    return acc;
  }, {});

  return (
    <div style={{
      padding: "20px 24px",
      minHeight: "calc(100vh - 52px)",
      background: "var(--bg-base)",
      color: "var(--text-primary)",
      display: "flex", flexDirection: "column",
    }}>

      {/* ── Board Header ── */}
      <div style={{
        marginBottom: "18px",
        padding: "16px 20px",
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-subtle)",
      }}>
        {/* Row 1: Back + title + main actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <button onClick={onBack} style={ghostBtn}>← Roles</button>
          <span style={{ color: "var(--border-strong)" }}>›</span>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              {role.title}
            </h2>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{role.client}</span>
          </div>

          {/* Toolbar */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>

            {/* Search */}
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)",
                fontSize: "13px", color: "var(--text-muted)", pointerEvents: "none",
              }}>🔍</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates…"
                style={{
                  paddingLeft: "30px", paddingRight: "10px", paddingTop: "6px", paddingBottom: "6px",
                  background: "var(--bg-raised)", color: "var(--text-primary)",
                  border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
                  fontSize: "13px", outline: "none", width: "200px",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "var(--shadow-accent)"; }}
                onBlur={(e)  => { e.target.style.borderColor = "var(--border-default)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {/* View Job */}
            <button onClick={() => setShowJobDetail(true)} style={ghostBtn}>
              📋 View Job
            </button>

            {/* Visibility toggle */}
            <VisibilityToggle visibility={role.visibility} onChange={handleVisibilityChange} />

            {/* Add Candidate */}
            <button
              onClick={() => setShowAddCandidate(true)}
              style={{
                padding: "7px 16px",
                background: "var(--accent)", color: "#fff", border: "none",
                borderRadius: "var(--radius-md)", fontSize: "13px", fontWeight: 600,
                boxShadow: "0 0 18px rgba(37,99,235,0.2)", transition: "background 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--accent)"}
            >
              + Add Candidate
            </button>
          </div>
        </div>
      </div>

      {/* ── States ── */}
      {loading && <LoadMsg>Loading board…</LoadMsg>}
      {error && (
        <div style={{
          padding: "12px 16px", background: "var(--danger-muted)",
          border: "1px solid var(--danger)", borderRadius: "var(--radius-md)",
          color: "var(--danger)", fontSize: "13px", marginBottom: "16px",
        }}>{error}</div>
      )}

      {/* ── Kanban Board ── */}
      {!loading && !error && (
        <div style={{
          display: "flex", gap: "12px", flex: 1,
          overflowX: "auto", overflowY: "hidden", paddingBottom: "20px",
        }}>
          {stages.map((stage) => {
            const columnApps  = grouped[stage.name] || [];
            const stageColor  = `var(--stage-${stage.name}, var(--text-muted))`;
            const isExpanded  = expandedStage === stage.name;
            const hasSubstages = stage.substages?.length > 0;

            return (
              <div key={stage.name} style={{
                minWidth: "290px", flexShrink: 0,
                background: "var(--bg-surface)",
                borderRadius: "var(--radius-lg)",
                display: "flex", flexDirection: "column",
                border: "1px solid var(--border-subtle)",
                overflow: "hidden",
              }}>
                {/* Stage accent strip */}
                <div style={{ height: "3px", background: stageColor, flexShrink: 0 }} />

                {/* Column header */}
                <div style={{
                  padding: "12px 14px 10px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  borderBottom: "1px solid var(--border-subtle)", flexShrink: 0,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: stageColor, flexShrink: 0 }} />
                    <span style={{
                      fontWeight: 600, fontSize: "12px", textTransform: "uppercase",
                      letterSpacing: "0.07em", color: "var(--text-secondary)",
                    }}>{stage.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="badge badge-count mono">
                      {columnApps.length}{nextCursor ? "+" : ""}
                    </span>
                    {/* Substage toggle */}
                    {hasSubstages && (
                      <button
                        onClick={() => setExpandedStage(isExpanded ? null : stage.name)}
                        title={isExpanded ? "Collapse substages" : "Expand substages"}
                        style={{
                          background: isExpanded ? "var(--accent-muted)" : "transparent",
                          border: "1px solid " + (isExpanded ? "var(--accent)" : "var(--border-default)"),
                          color: isExpanded ? "var(--accent)" : "var(--text-muted)",
                          borderRadius: "var(--radius-sm)", padding: "2px 7px",
                          fontSize: "10px", fontWeight: 600, cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {isExpanded ? "▲ Subs" : "▼ Subs"}
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Swimlane view (substages expanded) ── */}
                {isExpanded && hasSubstages ? (
                  <div style={{ flex: 1, overflowY: "auto", padding: "0" }}>
                    {/* "No substage" lane */}
                    {(() => {
                      const noSubApps = columnApps.filter((a) => !a.substage_id);
                      return (
                        <Swimlane
                          label="No substage"
                          apps={noSubApps}
                          color={stageColor}
                          onSelect={setSelectedCandidate}
                        />
                      );
                    })()}
                    {stage.substages.map((ss) => {
                      const ssApps = columnApps.filter((a) => a.substage_id === ss.id);
                      return (
                        <Swimlane
                          key={ss.id}
                          label={ss.name}
                          apps={ssApps}
                          color={stageColor}
                          onSelect={setSelectedCandidate}
                        />
                      );
                    })}
                  </div>
                ) : (
                  /* ── Normal card list ── */
                  <div style={{ padding: "10px", overflowY: "auto", flex: 1 }}>
                    {columnApps.map((app) => <KanbanCard key={app.application_id} app={app} onSelect={setSelectedCandidate} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Panels */}
      <CandidatePanel
        application={selectedCandidate}
        roleId={role.id}
        onClose={() => setSelectedCandidate(null)}
        onStageChange={handleStageChange}
      />

      {showAddCandidate && (
        <AddCandidatePanel
          role={role}
          onClose={() => setShowAddCandidate(false)}
          onCandidateAdded={(appId) => { loadApplications(appId); }}
          onViewApplication={(appId) => {
            const app = apps.find((a) => a.application_id === appId);
            if (app) { setSelectedCandidate(app); setShowAddCandidate(false); }
          }}
        />
      )}

      {showJobDetail && (
        <JobDetailPanel role={role} onClose={() => setShowJobDetail(false)} />
      )}
    </div>
  );
}

// ── Kanban card ───────────────────────────────────────────────────────────────

function KanbanCard({ app, onSelect }) {
  const initials = app.candidate_name
    .split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return (
    <div
      onClick={() => onSelect(app)}
      style={{
        background: "var(--bg-raised)", borderRadius: "var(--radius-md)",
        padding: "12px", marginBottom: "8px", cursor: "pointer",
        border: "1px solid var(--border-subtle)",
        transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-subtle)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "7px" }}>
        <div style={{
          width: "28px", height: "28px", borderRadius: "50%",
          background: "var(--accent-muted)", border: "1px solid var(--accent-glow)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "10px", fontWeight: 700, color: "var(--accent)", flexShrink: 0,
          fontFamily: "var(--font-mono)",
        }}>{initials}</div>
        <div style={{
          fontWeight: 600, fontSize: "13px", color: "var(--text-primary)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{app.candidate_name}</div>
      </div>
      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {app.email}
      </div>
      {app.substage_name && (
        <div style={{
          fontSize: "10px", fontWeight: 600, color: "var(--text-muted)",
          background: "var(--bg-overlay)", borderRadius: "999px",
          padding: "1px 7px", display: "inline-block", marginBottom: "4px",
        }}>{app.substage_name}</div>
      )}
      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
        <span style={{ opacity: 0.6 }}>↳</span> {app.recruiter}
      </div>
    </div>
  );
}

// ── Swimlane row ──────────────────────────────────────────────────────────────

function Swimlane({ label, apps, color, onSelect }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      {/* Swimlane header */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "7px 14px", cursor: "pointer",
          background: "var(--bg-overlay)",
          borderLeft: `3px solid ${color}`,
        }}
      >
        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{collapsed ? "▶" : "▼"}</span>
        <span style={{ flex: 1, fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "capitalize" }}>
          {label}
        </span>
        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{apps.length}</span>
      </div>

      {/* Cards inside swimlane */}
      {!collapsed && (
        <div style={{ padding: "8px 10px" }}>
          {apps.length === 0
            ? <div style={{ fontSize: "11px", color: "var(--text-muted)", padding: "6px 4px", textAlign: "center" }}>—</div>
            : apps.map((app) => <KanbanCard key={app.application_id} app={app} onSelect={onSelect} />)
          }
        </div>
      )}
    </div>
  );
}

// ── Visibility toggle ─────────────────────────────────────────────────────────

function VisibilityToggle({ visibility, onChange }) {
  const [open, setOpen] = useState(false);
  const cfg = VIS_CFG[visibility] || VIS_CFG.internal;
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: "5px 12px",
          background: cfg.bg, color: cfg.color,
          border: `1px solid ${cfg.color}44`,
          borderRadius: "var(--radius-md)", fontSize: "12px", fontWeight: 600,
          cursor: "pointer", transition: "all 0.15s",
        }}
      >
        {cfg.label} ▾
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: "var(--bg-overlay)", border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)", overflow: "hidden",
          boxShadow: "var(--shadow-md)", zIndex: 100, minWidth: "150px",
        }}>
          {VIS_ORDER.map((v) => {
            const c = VIS_CFG[v];
            return (
              <div
                key={v}
                onClick={() => { onChange(v); setOpen(false); }}
                style={{
                  padding: "9px 14px", cursor: "pointer", fontSize: "13px",
                  color: v === visibility ? c.color : "var(--text-primary)",
                  background: v === visibility ? c.bg : "transparent",
                  fontWeight: v === visibility ? 600 : 400,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { if (v !== visibility) e.currentTarget.style.background = "var(--bg-raised)"; }}
                onMouseLeave={(e) => { if (v !== visibility) e.currentTarget.style.background = "transparent"; }}
              >
                {c.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Misc ──────────────────────────────────────────────────────────────────────

function LoadMsg({ children }) {
  return <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "60px", fontSize: "13px" }}>{children}</div>;
}

const ghostBtn = {
  padding: "5px 12px",
  background: "transparent", color: "var(--text-muted)",
  border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
  fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
};