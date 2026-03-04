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
      padding: "20px",
      minHeight: "100vh",
      background: "#1e1e1e",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
    }}>

      {/* ── Header ── */}
      <div style={{
        marginBottom: "24px",
        padding: "24px",
        background: "#2a2a2a",
        borderRadius: "12px",
        border: "1px solid #3d3d3d",
      }}>
        <button
          onClick={onBack}
          style={{
            padding: "6px 12px",
            background: "transparent",
            color: "#aaa",
            border: "1px solid #444",
            borderRadius: "6px",
            cursor: "pointer",
            marginBottom: "20px",
            fontSize: "13px",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseOut={(e) => (e.currentTarget.style.color = "#aaa")}
        >
          ← Back to List
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h2 style={{ margin: "0 0 6px 0", color: "#fff", fontSize: "24px" }}>{role.title}</h2>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <span style={{ color: "#ccc", fontSize: "14px" }}>
                <strong>Client:</strong> {role.client}
              </span>
              <span style={{ fontSize: "12px", color: "#999", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: role.status === "open" ? "#4CAF50" : "#f44336",
                }} />
                Status:{" "}
                <span style={{
                  color: role.status === "open" ? "#4CAF50" : "#f44336",
                  fontWeight: "600",
                  textTransform: "capitalize",
                }}>
                  {role.status}
                </span>
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowAddCandidate(true)}
            style={{
              padding: "10px 20px",
              background: "#4CAF50",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              boxShadow: "0 2px 8px rgba(76, 175, 80, 0.3)",
            }}
          >
            + Add Candidate
          </button>
        </div>
      </div>

      {/* ── States ── */}
      {loading && (
        <div style={{ color: "#ccc", textAlign: "center", padding: "40px" }}>
          Loading board...
        </div>
      )}
      {error && (
        <div style={{ color: "#f44336", textAlign: "center", padding: "40px", background: "#2a2a2a", borderRadius: "8px", margin: "20px 0" }}>
          {error}
        </div>
      )}

      {/* ── Kanban Board ── */}
      {!loading && !error && (
        <>
          <div style={{
            display: "flex",
            gap: "16px",
            flex: 1,
            overflowX: "auto",
            overflowY: "hidden",
            paddingBottom: "20px",
          }}>
            {stages.map((s) => {
              const columnApps = groupedApplications[s.name] || [];
              return (
                <div
                  key={s.name}
                  style={{
                    minWidth: "320px",
                    flexShrink: 0,
                    background: "#2a2a2a",
                    borderRadius: "12px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    overflowY: "auto",
                    scrollbarWidth: "thin",
                    border: "1px solid #444",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}
                >
                  {/* Column header */}
                  <div style={{
                    fontWeight: "700",
                    fontSize: "13px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#aaa",
                    marginBottom: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                    <span>{s.name}</span>
                    <span style={{
                      background: "#3a3a3a",
                      borderRadius: "12px",
                      padding: "2px 8px",
                      fontSize: "11px",
                      color: "#777",
                    }}>
                      {/* Show count+  when a next page exists — loaded count may undercount */}
                      {columnApps.length}{nextCursor ? "+" : ""}
                    </span>
                  </div>

                  {/* Candidate cards */}
                  {columnApps.map((app) => (
                    <div
                      key={app.application_id}
                      style={{
                        background: "#1e1e1e",
                        borderRadius: "8px",
                        padding: "12px",
                        marginBottom: "8px",
                        cursor: "pointer",
                        border: "1px solid #444",
                        transition: "all 0.2s ease",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
                      }}
                      onClick={() => setSelectedCandidate(app)}
                    >
                      <div style={{ fontWeight: "600", marginBottom: "4px", color: "#fff" }}>
                        {app.candidate_name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#ccc", marginBottom: "8px" }}>
                        {app.email}
                      </div>
                      <div style={{ fontSize: "11px", color: "#999" }}>
                        Owner: {app.recruiter}
                      </div>
                    </div>
                  ))}
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