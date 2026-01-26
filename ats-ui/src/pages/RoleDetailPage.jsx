
import { useState, useEffect } from "react";

import { fetchApplications, updateApplicationStage } from "../api";

import CandidatePanel from "../components/CandidatePanel";
import { useToast } from "../toast/ToastContext";
import AddCandidatePanel from "../components/AddCandidatePanel";




const STAGES = [
  "new",
  "screening",
  "interview",
  "offered",
  "hired",
  "rejected"
];

function RoleDetailPage({ role, onBack }) {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [showAddCandidate, setShowAddCandidate] = useState(false);
    const { showToast } = useToast();
    const groupedApplications = STAGES.reduce((acc, stage) => {
        acc[stage] = apps.filter((app) => app.stage === stage);
        return acc;
    }, {});
    useEffect(() => {
        loadApplications();
        }, [role.id]);

    const loadApplications = (openAfterId=null) => {
        
      setLoading(true);
      setError(null);

      fetchApplications(role.id)
        .then((data) => {
          setApps(data);

          // if we’re waiting to open a candidate
          if (openAfterId) {
            const app = data.find(
              (a) => a.application_id === openAfterId
            );

            if (app) {
              showToast({
                type: "success",
                message: "Candidate added successfully",
                action: {
                  label: "View profile",
                  onClick: () => setSelectedCandidate(app)
                }
              });
            }
          }
        })
        .catch(() => setError("Could not load applications"))
        .finally(() => setLoading(false));
    };












    const handleStageChange = (applicationId, newStage) => {
      // store previous state for rollback
      const previousApps = apps;

      // optimistic UI update
      setApps((prevApps) =>
        prevApps.map((app) =>
          app.application_id === applicationId
            ? { ...app, stage: newStage }
            : app
        )
      );

      setSelectedCandidate((prev) =>
        prev ? { ...prev, stage: newStage } : prev
      );

      // backend update
      updateApplicationStage(applicationId, newStage).catch(() => {
        // rollback on failure
        setApps(previousApps);
        showToast({
              type: "error",
              message: "Failed to update stage. Please try again."
            });
      });
    };
    

  return (
    <div style={{ 
        padding: "20px",
        minHeight: "100vh",
        background: "#1e1e1e",
        color: "#fff",
        display: "flex",
        flexDirection: "column"
     }}>
      {/* Header */}
      <div style={{ 
          marginBottom: "24px", 
          padding: "24px", 
          background: "#2a2a2a", 
          borderRadius: "12px",
          border: "1px solid #3d3d3d" 
        }}>
          {/* Top Row: Navigation */}
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
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.color = "#fff"}
            onMouseOut={(e) => e.currentTarget.style.color = "#aaa"}
          >
            ← Back to List
          </button>
        
          {/* Main Row: Title Info + Action Button */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "flex-end" // Aligns button to the bottom of the text block
          }}>
            <div>
              <h2 style={{ margin: "0 0 6px 0", color: "#fff", fontSize: "24px" }}>
                {role.title}
              </h2>
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <span style={{ color: "#ccc", fontSize: "14px" }}>
                  <strong>Client:</strong> {role.client}
                </span>
                <span style={{ fontSize: "12px", color: "#999", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ 
                    width: "8px", 
                    height: "8px", 
                    borderRadius: "50%", 
                    background: role.status === 'open' ? '#4CAF50' : '#f44336' 
                  }} />
                  Status: <span style={{ 
                    color: role.status === 'open' ? '#4CAF50' : '#f44336',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>{role.status}</span>
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
                boxShadow: "0 2px 8px rgba(76, 175, 80, 0.3)"
              }}
            >
              + Add Candidate
            </button>
          </div>
        </div>

      {/* Applications */}
      {loading && <div style={{ color: "#ccc", textAlign: "center", padding: "40px" }}>Loading applications...</div>}
      {error && <div style={{ color: "#f44336", textAlign: "center", padding: "40px", background: "#2a2a2a", borderRadius: "8px", margin: "20px 0" }}>{error}</div>}
      <div style={{ 
        display: "flex", 
        gap: "16px",
        flex: 1,
        overflowX: "auto",
        overflowY: "hidden",
        paddingBottom: "20px"
        }}>
        {STAGES.map((stage) => (
          <div
            key={stage}
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
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
            }}
          >
            <div
              style={{
                position: "sticky",
                top: 0,
                background: "#2a2a2a",
                paddingBottom: "12px",
                marginBottom: "16px",
                borderBottom: "2px solid #444",
                borderRadius: "8px 8px 0 0"

              }}
            >
              <div
                style={{
                  fontWeight: "600",
                  textTransform: "capitalize",
                  fontSize: "16px",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                {stage}
                <span style={{
                  fontSize: "12px",
                  color: "#999",
                  background: "#1e1e1e",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontWeight: "400"
                }}>
                  {groupedApplications[stage].length}
                </span>
              </div>
            </div>
            

            {groupedApplications[stage].length === 0 && (
              <div style={{ 
                fontSize: "14px", 
                color: "#777", 
                textAlign: "center",
                padding: "40px 20px",
                background: "#1e1e1e",
                borderRadius: "8px",
                border: "2px dashed #444"
              }}>
                No candidates
              </div>
            )}

            {groupedApplications[stage].map((app) => (
              <div
                key={app.application_id}
                style={{
                    background: "#333",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "12px",
                    cursor: "pointer",
                    border: "1px solid #444",
                    transition: "all 0.2s ease",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
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
                <div style={{ fontWeight: "600", marginBottom: "4px", color: "#fff" }}>{app.candidate_name}</div>
                <div style={{ fontSize: "12px", color: "#ccc", marginBottom: "8px" }}>
                  {app.email}
                </div>
                <div style={{ fontSize: "11px", color: "#999" }}>
                  Owner: {app.recruiter}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <CandidatePanel
        application={selectedCandidate}
        onClose={() => setSelectedCandidate(null)} 
        onStageChange={handleStageChange}
      />
      {showAddCandidate && (
        <AddCandidatePanel
          role={role}
          onClose={() => setShowAddCandidate(false)}
          onCandidateAdded={(applicationId) => {
            loadApplications(applicationId); 
          }}
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

