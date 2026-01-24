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
            disabled={saving}
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
            {loading && <div>Loading comments...</div>}
            {error && <div style={{ color: "red" }}>{error}</div>}
          
          {!loading && comments.length === 0 && (
              <div style={{ fontSize: "12px", color: "#999" }}>
                Be the first to add comment!
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
            value={newComment}
            onChange={(e)=> setNewComment(e.target.value)}
            style={{
              width: "100%",
              minHeight: "60px",
              padding: "8px",
              resize: "none"
            }}
          />
          <div style={{ textAlign: "right", marginTop: "6px" }}>
            <button
                // disabled={newComment.trim() === ""}
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
                padding: "6px 12px",
                cursor: saving?"not-allowed": "pointer"
              }}
            >
              {saving ? "Saving..." : "Add Comment"}
            </button>
            {saveError && (
                  <div style={{ color: "red", fontSize: "12px", marginTop: "6px" }}>
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
