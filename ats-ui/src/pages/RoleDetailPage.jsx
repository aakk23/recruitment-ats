import { useState, useEffect, useCallback } from "react";
import { fetchApplications, fetchStages, updateApplicationStage } from "../api";
import CandidatePanel from "../components/CandidatePanel";
import { useToast } from "../toast/ToastContext";
import AddCandidatePanel from "../components/AddCandidatePanel";

function RoleDetailPage({ role, onBack }) {
  const [apps, setApps] = useState([]);
  const [stages, setStages] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);   // global next cursor for the board
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const { showToast } = useToast();

  // Group apps by stage name for the Kanban columns
  const groupedApplications = stages.reduce((acc, s) => {
    acc[s.name] = apps.filter((app) => app.stage === s.name);
    return acc;
  }, {});

  // Initial load: stages + first page of applications in parallel
  useEffect(() => {
    setLoading(true);
    setError(null);
    setApps([]);
    setNextCursor(null);

    Promise.all([fetchStages(role.id), fetchApplications(role.id)])
      .then(([stageData, pageData]) => {
        setStages(stageData);
        setApps(pageData.items);
        setNextCursor(pageData.next_cursor);
      })
      .catch(() => setError("Could not load board data"))
      .finally(() => setLoading(false));
  }, [role.id]);

  // Append next page of applications (cursor-based)
  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);

    fetchApplications(role.id, 200, nextCursor)
      .then((pageData) => {
        setApps((prev) => [...prev, ...pageData.items]);
        setNextCursor(pageData.next_cursor);
      })
      .catch(() => showToast({ type: "error", message: "Failed to load more candidates." }))
      .finally(() => setLoadingMore(false));
  }, [role.id, nextCursor, loadingMore, showToast]);

  // Re-fetch applications (e.g. after adding a candidate)
  const reloadApplications = useCallback((openAfterId = null) => {
    fetchApplications(role.id)
      .then((pageData) => {
        setApps(pageData.items);
        setNextCursor(pageData.next_cursor);

        if (openAfterId) {
          const app = pageData.items.find((a) => a.application_id === openAfterId);
          if (app) {
            showToast({
              type: "success",
              message: "Candidate added successfully",
              action: {
                label: "View profile",
                onClick: () => setSelectedCandidate(app),
              },
            });
          }
        }
      })
      .catch(() => setError("Could not reload applications"));
  }, [role.id, showToast]);

  const handleStageChange = (applicationId, newStage) => {
    const previousApps = apps;

    setApps((prev) =>
      prev.map((app) =>
        app.application_id === applicationId ? { ...app, stage: newStage } : app
      )
    );
    setSelectedCandidate((prev) => (prev ? { ...prev, stage: newStage } : prev));

    updateApplicationStage(applicationId, newStage).catch(() => {
      setApps(previousApps);
      showToast({ type: "error", message: "Failed to update stage. Please try again." });
    });
  };

  return (
    <div style={{
      padding: "24px",
      minHeight: "calc(100vh - 52px)",
      background: "var(--bg-base)",
      color: "var(--text-primary)",
      display: "flex",
      flexDirection: "column",
    }}>

      {/* ── Header ── */}
      <div style={{
        marginBottom: "20px",
        padding: "20px 24px",
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        flexWrap: "wrap",
      }}>
        {/* Back */}
        <button
          onClick={onBack}
          style={{
            padding: "6px 12px",
            background: "transparent",
            color: "var(--text-muted)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
            fontWeight: 500,
            transition: "all 0.15s",
            flexShrink: 0,
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
            e.currentTarget.style.borderColor = "var(--border-strong)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = "var(--text-muted)";
            e.currentTarget.style.borderColor = "var(--border-default)";
          }}
        >
          ← Roles
        </button>

        {/* Divider */}
        <span style={{ color: "var(--border-strong)", flexShrink: 0 }}>›</span>

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: 700, letterSpacing: "-0.02em" }}>
            {role.title}
          </h2>
          <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              {role.client}
            </span>
            <span className={`badge ${role.status === "open" ? "badge-open" : "badge-closed"}`}>
              <span className="dot" style={{
                background: role.status === "open" ? "var(--success)" : "var(--danger)",
              }} />
              {role.status}
            </span>
          </div>
        </div>

        {/* Add candidate */}
        <button
          onClick={() => setShowAddCandidate(true)}
          style={{
            padding: "9px 18px",
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
            fontWeight: 600,
            boxShadow: "0 0 20px rgba(37,99,235,0.25)",
            transition: "background 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-hover)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "var(--accent)"}
        >
          + Add Candidate
        </button>
      </div>

      {/* ── States ── */}
      {loading && (
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "60px", fontSize: "13px" }}>
          Loading board…
        </div>
      )}
      {error && (
        <div style={{
          color: "var(--danger)", textAlign: "center", padding: "16px",
          background: "var(--danger-muted)", borderRadius: "var(--radius-md)",
          border: "1px solid var(--danger)", margin: "0 0 20px",
          fontSize: "13px",
        }}>
          {error}
        </div>
      )}

      {/* ── Kanban Board ── */}
      {!loading && !error && (
        <>
          <div style={{
            display: "flex",
            gap: "12px",
            flex: 1,
            overflowX: "auto",
            overflowY: "hidden",
            paddingBottom: "20px",
          }}>
            {stages.map((s) => {
              const columnApps = groupedApplications[s.name] || [];
              const stageVar = `var(--stage-${s.name}, var(--text-muted))`;
              return (
                <div
                  key={s.name}
                  style={{
                    minWidth: "300px",
                    flexShrink: 0,
                    background: "var(--bg-surface)",
                    borderRadius: "var(--radius-lg)",
                    display: "flex",
                    flexDirection: "column",
                    overflowY: "auto",
                    scrollbarWidth: "thin",
                    border: "1px solid var(--border-subtle)",
                    overflow: "hidden",
                  }}
                >
                  {/* Stage accent strip */}
                  <div style={{ height: "3px", background: stageVar, flexShrink: 0 }} />

                  {/* Column header */}
                  <div style={{
                    padding: "14px 16px 10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--border-subtle)",
                    flexShrink: 0,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{
                        width: "8px", height: "8px", borderRadius: "50%",
                        background: stageVar, flexShrink: 0,
                      }} />
                      <span style={{
                        fontWeight: 600,
                        fontSize: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: "var(--text-secondary)",
                      }}>
                        {s.name}
                      </span>
                    </div>
                    <span className="badge badge-count mono">
                      {columnApps.length}{nextCursor ? "+" : ""}
                    </span>
                  </div>

                  {/* Cards */}
                  <div style={{ padding: "10px", overflowY: "auto", flex: 1 }}>
                    {columnApps.map((app) => {
                      const initials = app.candidate_name
                        .split(" ").slice(0, 2)
                        .map((w) => w[0]?.toUpperCase() ?? "").join("");
                      return (
                        <div
                          key={app.application_id}
                          style={{
                            background: "var(--bg-raised)",
                            borderRadius: "var(--radius-md)",
                            padding: "12px",
                            marginBottom: "8px",
                            cursor: "pointer",
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
                          onClick={() => setSelectedCandidate(app)}
                        >
                          {/* Avatar + name row */}
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                            <div style={{
                              width: "30px", height: "30px",
                              borderRadius: "50%",
                              background: "var(--accent-muted)",
                              border: "1px solid var(--accent-glow)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "var(--accent)",
                              flexShrink: 0,
                              fontFamily: "var(--font-mono)",
                            }}>
                              {initials}
                            </div>
                            <div style={{
                              fontWeight: 600,
                              fontSize: "13px",
                              color: "var(--text-primary)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}>
                              {app.candidate_name}
                            </div>
                          </div>

                          {/* Email */}
                          <div style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            marginBottom: "6px",
                          }}>
                            {app.email}
                          </div>

                          {/* Owner */}
                          <div style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}>
                            <span style={{ opacity: 0.6 }}>↳</span> {app.recruiter}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Load More (shown when there's a next page) ── */}
          {nextCursor && (
            <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  padding: "8px 24px",
                  background: loadingMore ? "#333" : "#2a2a2a",
                  color: loadingMore ? "#666" : "#aaa",
                  border: "1px solid #444",
                  borderRadius: "8px",
                  cursor: loadingMore ? "default" : "pointer",
                  fontSize: "13px",
                  transition: "all 0.2s",
                }}
              >
                {loadingMore ? "Loading…" : "Load more candidates"}
              </button>
            </div>
          )}
        </>
      )}

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
          onCandidateAdded={(applicationId) => reloadApplications(applicationId)}
          onViewApplication={(applicationId) => {
            const app = apps.find((a) => a.application_id === applicationId);
            if (app) {
              setSelectedCandidate(app);
              setShowAddCandidate(false);
            }
          }}
        />
      )}
    </div>
  );
}

export default RoleDetailPage;