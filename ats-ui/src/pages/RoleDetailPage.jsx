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
        height: "100vh",
        display: "flex",
        overflow: "hidden",
        flexDirection: "column"
     }}>
      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <button onClick={onBack}>← Back</button>
        <h2 style={{ marginTop: "8px" }}>{role.title}</h2>
        <div style={{ color: "#555" }}>
          Client: {role.client}
        </div>
        <div style={{ fontSize: "12px", color: "#777" }}>
          Status: {role.status}
        </div>
      </div>

      {/* Applications */}
      {loading && <div>Loading applications...</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}
      <div style={{ 
        display: "flex", 
        gap: "12px",
        flex: 1,
        overflowX: "auto",
        overflowY: "hidden",
        alignItems:"stretch" 
        }}>
        {STAGES.map((stage) => (
          <div
            key={stage}
            style={{
                minWidth: "300px",
                flexShrink: 0,
                background: "#c7c3c3",
                borderRadius: "8px",
                padding: "10px",
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
                scrollbarWidth: "thin"
            }}
          >
            <div
              style={{
                position: "sticky",
                top: 0,
                background: "#c7c3c3",
                paddingBottom: "8px",
                marginBottom: "8px",
                // zIndex: 1,
                borderBottom: "1px solid #aaa"

              }}
            >
              <div
                style={{
                  fontWeight: "600",
                  textTransform: "capitalize",
                  fontSize: "14px",
                  color: "#333"
                }}
              >
                {stage}
              </div>
            </div>
            

            {groupedApplications[stage].length === 0 && (
              <div style={{ fontSize: "12px", color: "#777" }}>
                No candidates
              </div>
            )}

            {groupedApplications[stage].map((app) => (
              <div
                key={app.application_id}
                style={{
                    background: "#3e3d3d",
                    borderRadius: "6px",
                    padding: "8px",
                    marginBottom: "8px",
                    cursor: "pointer"
                }}
                onClick={() => setSelectedCandidate(app)}
              >
                <div style={{ fontWeight: "500" }}>{app.candidate_name}</div>
                <div style={{ fontSize: "12px", color: "#c2bfbf" }}>
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

