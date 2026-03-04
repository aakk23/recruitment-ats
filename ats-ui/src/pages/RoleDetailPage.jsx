// src/pages/RoleDetailPage.jsx
import { useState, useEffect, useRef } from "react";
import { fetchApplications, updateApplicationStage, fetchStages, updateVisibility } from "../api";
import CandidatePanel    from "../components/CandidatePanel";
import AddCandidatePanel from "../components/AddCandidatePanel";
import JobDetailPanel    from "../components/JobDetailPanel";
import { useToast }      from "../toast/ToastContext";

const VIS_CFG = {
  published: { label: "Published", color: "var(--success)", bg: "rgba(34,197,94,0.12)"  },
  internal:  { label: "Internal",  color: "var(--accent)",  bg: "var(--accent-muted)"   },
  closed:    { label: "Closed",    color: "var(--danger)",  bg: "rgba(239,68,68,0.12)"  },
};
const VIS_ORDER = ["published", "internal", "closed"];

export default function RoleDetailPage({ role: roleProp, onBack }) {
  const [role,              setRole]              = useState(roleProp);
  const [apps,              setApps]              = useState([]);
  const [stages,            setStages]            = useState([]);
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showAddCandidate,  setShowAddCandidate]  = useState(false);
  const [showJobDetail,     setShowJobDetail]     = useState(false);
  const [expandedStage,     setExpandedStage]     = useState(null);
  const [searchQuery,       setSearchQuery]       = useState("");
  const [debouncedSearch,   setDebouncedSearch]   = useState("");
  const searchTimer = useRef(null);
  const { showToast } = useToast();

  // Keep role in sync if parent fetches full detail after mount
  useEffect(() => { setRole(roleProp); }, [roleProp]);

  // Debounce search input
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery]);

  // Load stages once per role
  useEffect(() => {
    fetchStages(role.id).then(setStages).catch(() => {});
  }, [role.id]);

  // Reload apps whenever search changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchApplications(role.id, { search: debouncedSearch || undefined })
      .then((data) => setApps(data.items ?? []))
      .catch(() => setError("Could not load applications"))
      .finally(() => setLoading(false));
  }, [role.id, debouncedSearch]);

  // Manual refresh (used after adding a candidate)
  const reloadApps = (openAfterId = null) => {
    fetchApplications(role.id)
      .then((data) => {
        const items = data.items ?? [];
        setApps(items);
        if (openAfterId) {
          const app = items.find((a) => a.application_id === openAfterId);
          if (app) {
            showToast({
              type: "success",
              message: "Candidate added",
              action: { label: "View", onClick: () => setSelectedCandidate(app) },
            });
          }
        }
      })
      .catch(() => {});
  };

  const handleStageChange = (applicationId, newStage, substageId = null) => {
    const prev = apps;
    setApps((a) => a.map((ap) =>
      ap.application_id === applicationId
        ? { ...ap, stage: newStage, substage_id: substageId }
        : ap
    ));
    updateApplicationStage(applicationId, newStage, substageId).catch(() => {
      setApps(prev);
      showToast({ type: "error", message: "Failed to update stage. Please try again." });
    });
  };

  const handleVisibilityChange = (vis) => {
    const prev = role.visibility;
    setRole((r) => ({ ...r, visibility: vis })); // optimistic
    updateVisibility(role.id, vis)
      .then((updated) => { if (updated) setRole(updated); })
      .catch(() => {
        setRole((r) => ({ ...r, visibility: prev })); // rollback
        showToast({ type: "error", message: "Failed to update visibility" });
      });
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
        padding: "14px 20px",
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-subtle)",
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          gap: "10px", flexWrap: "wrap",
        }}>
          {/* Back */}
          <button
            onClick={onBack}
            style={ghostBtnStyle}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-default)"; }}
          >← Roles</button>

          <span style={{ color: "var(--border-strong)", fontSize: "14px" }}>›</span>

          {/* Title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 700, fontSize: "15px",
              letterSpacing: "-0.02em", lineHeight: 1.2,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {role.title}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "1px" }}>
              {role.client}
              {role.department ? ` · ${role.department}` : ""}
            </div>
          </div>

          {/* Toolbar */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
            {/* Search */}
            <SearchInput value={searchQuery} onChange={setSearchQuery} />

            {/* View Job (only if description exists) */}
            <button
              onClick={() => setShowJobDetail(true)}
              style={ghostBtnStyle}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-default)"; }}
            >
              📋 View Job
            </button>

            {/* Visibility */}
            <VisibilityToggle
              visibility={role.visibility}
              onChange={handleVisibilityChange}
            />

            {/* Add Candidate */}
            <button
              onClick={() => setShowAddCandidate(true)}
              style={{
                padding: "7px 16px",
                background: "var(--accent)", color: "#fff",
                border: "none", borderRadius: "var(--radius-md)",
                fontSize: "13px", fontWeight: 600,
                boxShadow: "0 0 16px var(--accent-glow)",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--accent)"}
            >
              + Add Candidate
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          padding: "10px 16px", marginBottom: "14px",
          background: "rgba(239,68,68,0.08)",
          border: "1px solid var(--danger)",
          borderRadius: "var(--radius-md)",
          color: "var(--danger)", fontSize: "13px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>{error}</span>
          <button
            onClick={() => { setError(null); reloadApps(); }}
            style={{ fontSize: "12px", color: "var(--danger)", background: "transparent", border: "none" }}
          >Retry</button>
        </div>
      )}

      {/* ── Kanban Board ── */}
      <div style={{
        display: "flex", gap: "12px", flex: 1,
        overflowX: "auto", overflowY: "hidden",
        paddingBottom: "20px",
        opacity: loading ? 0.5 : 1,
        transition: "opacity 0.2s",
        pointerEvents: loading ? "none" : "auto",
      }}>
        {stages.map((stage) => {
          const colApps    = grouped[stage.name] || [];
          const stageColor = `var(--stage-${stage.name}, var(--text-muted))`;
          const isExpanded = expandedStage === stage.name;
          const hasSubs    = stage.substages?.length > 0;

          return (
            <div key={stage.name} style={{
              minWidth: "272px", width: "272px", flexShrink: 0,
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-subtle)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              // Fixed height so all columns align, internal scroll handles overflow
              maxHeight: "calc(100vh - 180px)",
            }}>
              {/* Stage accent strip */}
              <div style={{ height: "3px", background: stageColor, flexShrink: 0 }} />

              {/* Column header */}
              <div style={{
                padding: "10px 12px 8px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                borderBottom: "1px solid var(--border-subtle)", flexShrink: 0,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <span style={{
                    width: "7px", height: "7px", borderRadius: "50%",
                    background: stageColor, flexShrink: 0,
                  }} />
                  <span style={{
                    fontWeight: 700, fontSize: "11px",
                    textTransform: "uppercase", letterSpacing: "0.07em",
                    color: "var(--text-secondary)",
                  }}>{stage.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{
                    fontSize: "11px", fontWeight: 600,
                    color: "var(--text-muted)", fontFamily: "var(--font-mono)",
                    background: "var(--bg-overlay)", padding: "1px 6px",
                    borderRadius: "999px",
                  }}>
                    {colApps.length}
                  </span>
                  {hasSubs && (
                    <button
                      onClick={() => setExpandedStage(isExpanded ? null : stage.name)}
                      title={isExpanded ? "Collapse substages" : "Show by substage"}
                      style={{
                        fontSize: "10px", fontWeight: 600,
                        padding: "2px 7px",
                        background: isExpanded ? "var(--accent-muted)" : "transparent",
                        color: isExpanded ? "var(--accent)" : "var(--text-muted)",
                        border: `1px solid ${isExpanded ? "var(--accent)" : "var(--border-default)"}`,
                        borderRadius: "var(--radius-sm)",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.borderColor = "var(--accent)"; }}
                      onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.borderColor = "var(--border-default)"; }}
                    >
                      {isExpanded ? "▲" : "≡"}
                    </button>
                  )}
                </div>
              </div>

              {/* Column body */}
              {isExpanded && hasSubs ? (
                /* Substage swimlanes */
                <div style={{ flex: 1, overflowY: "auto" }}>
                  <Swimlane
                    label="No substage"
                    apps={colApps.filter((a) => !a.substage_id)}
                    color={stageColor}
                    onSelect={setSelectedCandidate}
                  />
                  {stage.substages.map((ss) => (
                    <Swimlane
                      key={ss.id}
                      label={ss.name}
                      apps={colApps.filter((a) => a.substage_id === ss.id)}
                      color={stageColor}
                      onSelect={setSelectedCandidate}
                    />
                  ))}
                </div>
              ) : (
                /* Flat card list */
                <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                  {colApps.length === 0 ? (
                    <div style={{
                      padding: "20px 0", textAlign: "center",
                      fontSize: "12px", color: "var(--text-muted)",
                      borderRadius: "var(--radius-md)",
                      border: "1px dashed var(--border-subtle)",
                      margin: "4px",
                    }}>
                      {debouncedSearch ? "No matches" : "No candidates"}
                    </div>
                  ) : (
                    colApps.map((app) => (
                      <KanbanCard
                        key={app.application_id}
                        app={app}
                        isSelected={selectedCandidate?.application_id === app.application_id}
                        onSelect={setSelectedCandidate}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Panels ── */}
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
          onCandidateAdded={(appId) => reloadApps(appId)}
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

function KanbanCard({ app, isSelected, onSelect }) {
  const initials = (app.candidate_name || "?")
    .split(" ").slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      onClick={() => onSelect(app)}
      style={{
        background: isSelected ? "var(--accent-muted)" : "var(--bg-raised)",
        borderRadius: "var(--radius-md)", padding: "10px 12px", marginBottom: "6px",
        cursor: "pointer",
        border: isSelected
          ? "1px solid var(--accent)"
          : "1px solid var(--border-subtle)",
        transition: "border-color 0.15s, box-shadow 0.15s, transform 0.1s",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = "var(--border-strong)";
          e.currentTarget.style.boxShadow   = "var(--shadow-sm)";
          e.currentTarget.style.transform   = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = "var(--border-subtle)";
          e.currentTarget.style.boxShadow   = "none";
          e.currentTarget.style.transform   = "translateY(0)";
        }
      }}
    >
      {/* Name + avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
        <div style={{
          width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0,
          background: "var(--accent-muted)", border: "1px solid var(--accent-glow)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "9px", fontWeight: 700, color: "var(--accent)",
          fontFamily: "var(--font-mono)",
        }}>{initials}</div>
        <span style={{
          fontWeight: 600, fontSize: "13px", color: "var(--text-primary)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{app.candidate_name}</span>
      </div>

      {/* Email */}
      <div style={{
        fontSize: "11px", color: "var(--text-muted)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        marginBottom: app.substage_name ? "5px" : "0",
      }}>{app.email}</div>

      {/* Substage chip */}
      {app.substage_name && (
        <span style={{
          display: "inline-block", marginTop: "2px",
          fontSize: "10px", fontWeight: 600,
          color: "var(--text-muted)", background: "var(--bg-overlay)",
          borderRadius: "999px", padding: "1px 7px",
        }}>{app.substage_name}</span>
      )}
    </div>
  );
}

// ── Swimlane ──────────────────────────────────────────────────────────────────

function Swimlane({ label, apps, color, onSelect }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "6px 12px", cursor: "pointer",
          background: "var(--bg-overlay)",
          borderLeft: `3px solid ${color}`,
        }}
      >
        <span style={{ fontSize: "9px", color: "var(--text-muted)", width: "10px" }}>
          {collapsed ? "▶" : "▼"}
        </span>
        <span style={{
          flex: 1, fontSize: "11px", fontWeight: 600,
          color: "var(--text-secondary)", textTransform: "capitalize",
        }}>{label}</span>
        <span style={{
          fontSize: "10px", color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
        }}>{apps.length}</span>
      </div>
      {!collapsed && (
        <div style={{ padding: "6px 8px" }}>
          {apps.length === 0 ? (
            <div style={{
              fontSize: "11px", color: "var(--text-muted)",
              textAlign: "center", padding: "8px 0",
            }}>—</div>
          ) : (
            apps.map((app) => (
              <KanbanCard key={app.application_id} app={app} onSelect={onSelect} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Visibility toggle ─────────────────────────────────────────────────────────

function VisibilityToggle({ visibility, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cfg = VIS_CFG[visibility] || VIS_CFG.internal;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: "5px 12px",
          background: cfg.bg, color: cfg.color,
          border: `1px solid ${cfg.color}55`,
          borderRadius: "var(--radius-md)",
          fontSize: "12px", fontWeight: 600,
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
        onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
      >
        {cfg.label} ▾
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: "var(--bg-overlay)", border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)", overflow: "hidden",
          boxShadow: "var(--shadow-md)", zIndex: 200, minWidth: "150px",
        }}>
          {VIS_ORDER.map((v) => {
            const c       = VIS_CFG[v];
            const current = v === visibility;
            return (
              <div
                key={v}
                onClick={() => { onChange(v); setOpen(false); }}
                style={{
                  padding: "9px 14px", cursor: "pointer", fontSize: "13px",
                  color:      current ? c.color            : "var(--text-primary)",
                  background: current ? c.bg               : "transparent",
                  fontWeight: current ? 600                : 400,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { if (!current) e.currentTarget.style.background = "var(--bg-raised)"; }}
                onMouseLeave={(e) => { if (!current) e.currentTarget.style.background = "transparent"; }}
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

// ── Search input ──────────────────────────────────────────────────────────────

function SearchInput({ value, onChange }) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{
        position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)",
        fontSize: "12px", color: "var(--text-muted)", pointerEvents: "none",
      }}>🔍</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search candidates…"
        style={{
          paddingLeft: "28px", paddingRight: value ? "28px" : "10px",
          paddingTop: "6px", paddingBottom: "6px",
          background: "var(--bg-raised)", color: "var(--text-primary)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          fontSize: "13px", outline: "none", width: "190px",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
        onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "var(--shadow-accent)"; }}
        onBlur={(e)  => { e.target.style.borderColor = "var(--border-default)"; e.target.style.boxShadow = "none"; }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          style={{
            position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)",
            background: "transparent", border: "none",
            fontSize: "14px", color: "var(--text-muted)", lineHeight: 1,
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
        >×</button>
      )}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const ghostBtnStyle = {
  padding: "5px 12px",
  background: "transparent", color: "var(--text-muted)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  fontSize: "13px", fontWeight: 500,
  transition: "color 0.15s, border-color 0.15s",
};