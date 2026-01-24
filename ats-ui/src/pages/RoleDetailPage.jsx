import { applications } from "../mock/applications";
import { useState } from "react";
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
    const [selectedCandidate, setSelectedCandidate] = useState(null);
  const groupedApplications = STAGES.reduce((acc, stage) => {
    acc[stage] = applications.filter(
      (app) => app.stage === stage
    );
    return acc;
  }, {});
   

  return (
    <div style={{ padding: "20px" }}>
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
      <div style={{ display: "flex", gap: "12px",alignItems:"flex-start" }}>
        {STAGES.map((stage) => (
          <div
            key={stage}
            style={{
                flex: 1,
                background: "#c7c3c3",
                borderRadius: "8px",
                padding: "10px",
                minHeight: "300px"
            }}
          >
            <div
              style={{
                fontWeight: "600",
                marginBottom: "10px",
                textTransform: "capitalize",
                fontSize: "14px",
                color: "#333"
              }}
            >
              {stage}
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
        />
    </div>
  );
  
}



export default RoleDetailPage;

