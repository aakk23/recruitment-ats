// src/pages/RoleDetailPage.jsx
// Freshteam-style: Stage tabs (pipeline steps) + Substage Kanban columns (drag-and-drop)
import { useState, useEffect, useRef, useCallback } from "react";
import { fetchApplications, updateApplicationStage, fetchStages, updateVisibility } from "../api";
import CandidatePanel    from "../components/CandidatePanel";
import AddCandidatePanel from "../components/AddCandidatePanel";
import JobPanel          from "../components/JobPanel";
import { useToast }      from "../toast/ToastContext";
import { useAuth } from "../useAuth";
import StageTabs from "../components/StageTabs";
import KanbanBoard from "../components/KanbanBoard";
import { VisToggle, SearchBox, GhostBtn, BackButton } from "../components/RoleDetailMisc";
import { css } from "../components/styles";

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