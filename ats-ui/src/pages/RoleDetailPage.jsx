// import { applications } from "../mock/applications";
import { useState, useEffect } from "react";

import { fetchApplications, updateApplicationStage } from "../api";

import CandidatePanel from "../components/CandidatePanel";


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
    const groupedApplications = STAGES.reduce((acc, stage) => {
        acc[stage] = apps.filter((app) => app.stage === stage);
        return acc;
    }, {});
    useEffect(() => {
          setLoading(true);
          setError(null);

          fetchApplications(role.id)
            .then(setApps)
            .catch(() => setError("Could not load applications"))
            .finally(() => setLoading(false));
        }, [role.id]);


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
        alert("Failed to update stage. Please try again.");
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
      <div style={{ marginBottom: "24px", padding: "20px", background: "#2a2a2a", borderRadius: "8px" }}>
        <button 
          onClick={onBack}
          style={{
            padding: "8px 16px",
            background: "#444",
            color: "#fff",
            border: "1px solid #555",
            borderRadius: "6px",
            cursor: "pointer",
            marginBottom: "12px"
          }}
        >← Back</button>
        <h2 style={{ margin: "0 0 8px 0", color: "#fff" }}>{role.title}</h2>
        <div style={{ color: "#ccc", fontSize: "14px" }}>
          Client: {role.client}
        </div>
        <div style={{ fontSize: "12px", color: "#999" }}>
          Status: <span style={{ 
            color: role.status === 'open' ? '#4CAF50' : '#f44336',
            fontWeight: '500'
          }}>{role.status}</span>
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
    </div>
  );
  
}



export default RoleDetailPage;

