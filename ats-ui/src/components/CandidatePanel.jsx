import { useState } from "react";
import { commentsByApplication } from "../mock/comments";

function CandidatePanel({ application, onClose, onStageChange }) {
  if (!application) return null;

  const comments =
    commentsByApplication[application.application_id] || [];
//   const [stage, setStage] = useState(application.stage);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "360px",
        height: "100vh",
        background: "#ffffff",
        borderLeft: "1px solid #e0e0e0",
        // padding: "16px",
        boxShadow: "-2px 0 8px rgba(0,0,0,0.08)"
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          padding: "16px"

        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "16px"
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: "#222" }}>
              {application.candidate_name}
            </h3>
            <div style={{ fontSize: "13px", color: "#666" }}>
              {application.email}
            </div>
            <div style={{ fontSize: "12px", color: "#999" }}>
              Owner: {application.recruiter}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "18px",
              cursor: "pointer",
              color: "#666"
            }}
          >
            ×
          </button>
        </div>

        {/* Stage */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px"
          }}
        >
          <div style={{ fontSize: "13px", color: "#666" }}>
            Stage
          </div>
          <select
            value={application.stage}
             onChange={(e) =>
               onStageChange(application.application_id, e.target.value)
             }
             style={{ padding: "4px 8px" }}
          >
            <option value="new">new</option>
            <option value="screening">screening</option>
            <option value="interview">interview</option>
            <option value="offered">offered</option>
            <option value="hired">hired</option>
            <option value="rejected">rejected</option>
          </select>
        </div>

        {/* Comments */}
        <div style={{ flex: 1, 
                      overflowY: "auto",
                      paddingRight: "4px",
                      marginBottom: "12px" 
                      
                      }}>
          <div
            style={{
              fontWeight: "600",
              marginBottom: "8px",
              color: "#222"
            }}
          >
            Comments
          </div>

          {comments.length === 0 && (
            <div style={{ fontSize: "12px", color: "#999" }}>
              No comments yet
            </div>
          )}

          {comments.map((c) => (
            <div
              key={c.id}
              style={{
                background: "#f7f7f7",
                borderRadius: "6px",
                padding: "8px",
                marginBottom: "8px"
              }}
            >
              <div style={{ fontSize: "13px", color: "#222" }}>
                {c.comment}
              </div>
              <div style={{ fontSize: "11px", color: "#999" }}>
                {c.recruiter} ·{" "}
                {new Date(c.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>

        {/* Add comment */}
        <div
          style={{
            marginTop: "auto",   // ← THIS IS THE KEY
            background: "#ffffff",
            borderTop: "1px solid #e0e0e0",
            paddingTop: "8px",
            paddingBottom: "20px"
          }}
        >
          <textarea
            placeholder="Add a comment…"
            style={{
              width: "100%",
              minHeight: "60px",
              padding: "8px",
              resize: "none"
            }}
          />
          <div style={{ textAlign: "right", marginTop: "6px" }}>
            <button
              style={{
                padding: "6px 12px",
                cursor: "pointer"
              }}
            >
              Save
            </button>
          </div>
        </div>




      </div>
    </div>
  );
}

export default CandidatePanel;
