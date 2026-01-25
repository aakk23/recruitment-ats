import { useState, useEffect } from "react";
import { fetchComments, addComment } from "../api";




function CandidatePanel({ application, onClose, onStageChange }) {




    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [newComment, setNewComment] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);


    useEffect(() => {
      if (!application) return;

      setLoading(true);
      setError(null);

      fetchComments(application.application_id)
        .then(setComments)
        .catch(() => setError("Could not load comments"))
        .finally(() => setLoading(false));
    }, [application]);
    if(!application) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "380px",
        height: "100vh",
        background: "#1e1e1e",
        borderLeft: "1px solid #333",
        boxShadow: "-4px 0 16px rgba(0,0,0,0.5)",
        zIndex: 1000
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
            marginBottom: "20px",
            paddingBottom: "16px",
            borderBottom: "1px solid #333"
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 4px 0", color: "#fff" }}>
              {application.candidate_name}
            </h3>
            <div style={{ fontSize: "13px", color: "#ccc" }}>
              {application.email}
            </div>
            <div style={{ fontSize: "12px", color: "#999" }}>
              Owner: {application.recruiter}
            </div>
          </div>

          <button
            onClick={() => {
                if (newComment.trim()) {
                  const confirmClose = window.confirm(
                    "You have an unsaved comment. Close anyway?"
                  );
                  if (!confirmClose) return;
                }
                onClose();
            }}

            style={{
              border: "none",
              background: "transparent",
              fontSize: "20px",
              cursor: "pointer",
              color: "#999",
              padding: "4px",
              borderRadius: "4px"
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
            gap: "12px",
            marginBottom: "20px",
            padding: "12px",
            background: "#2a2a2a",
            borderRadius: "8px"
          }}
        >
          <div style={{ fontSize: "14px", color: "#fff", fontWeight: "500" }}>
            Stage
          </div>
          <select
            disabled={saving}
            value={application.stage}
             onChange={(e) =>
               onStageChange(application.application_id, e.target.value)
             }
             style={{ 
               padding: "6px 12px",
               background: "#333",
               color: "#fff",
               border: "1px solid #555",
               borderRadius: "6px",
               fontSize: "14px"
             }}
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
              marginBottom: "12px",
              color: "#fff",
              fontSize: "16px"
            }}
          >
            Comments
          </div>
            {loading && <div style={{ color: "#ccc" }}>Loading comments...</div>}
            {error && <div style={{ color: "#f44336" }}>{error}</div>}
          
          {!loading && comments.length === 0 && (
              <div style={{ fontSize: "14px", color: "#777", textAlign: "center", padding: "20px" }}>
                Be the first to add comment!
              </div>
            )}

          {comments.map((c) => (
            <div
              key={c.id}
              style={{
                background: "#2a2a2a",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "12px",
                border: "1px solid #333"
              }}
            >
              <div style={{ fontSize: "14px", color: "#fff", marginBottom: "6px" }}>
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
            marginTop: "auto",
            background: "#1e1e1e",
            borderTop: "1px solid #333",
            paddingTop: "16px",
            paddingBottom: "20px"
          }}
        >
          <textarea
            placeholder="Add a comment…"
            value={newComment}
            onChange={(e)=> setNewComment(e.target.value)}
            style={{
              width: "100%",
              minHeight: "80px",
              padding: "12px",
              resize: "none",
              background: "#2a2a2a",
              color: "#fff",
              border: "1px solid #555",
              borderRadius: "8px",
              fontSize: "14px",
              fontFamily: "inherit"
            }}
          />
          <div style={{ textAlign: "right", marginTop: "12px" }}>
            <button
                disabled={!newComment.trim() || loading}
                onClick={() => {
                    if (saving) return;
                    setSaveError(null);
                    setSaving(true);
                  addComment(application.application_id, 1, newComment)
                    .then(() => {
                      setNewComment("");
                      return fetchComments(application.application_id);
                    })
                    .then(setComments)
                    .catch(() => {
                      setSaveError("Could not add comment. Try again.");
                    }).finally(() => { setSaving(false)        
                    });
                }}
              style={{
                padding: "8px 16px",
                background: newComment.trim() ? "#4CAF50" : "#333",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: newComment.trim() && !saving ? "pointer" : "not-allowed",
                fontSize: "14px",
                fontWeight: "500"
              }}
            >
              {saving ? "Saving..." : "Add Comment"}
            </button>
            {saveError && (
                  <div style={{ color: "#f44336", fontSize: "12px", marginTop: "8px" }}>
                    {saveError}
                  </div>
                )}
          </div>
        </div>




      </div>
    </div>
  );
}

export default CandidatePanel;
