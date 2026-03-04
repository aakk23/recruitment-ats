import { useState, useEffect } from "react";
import { fetchComments, addComment, fetchStages, fetchCandidate } from "../api";

// ── Timestamp helper ──────────────────────────────────────────────────────────
function formatTimestamp(raw) {
  if (!raw) return "";
  const d = new Date(raw);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Stage colour map ──────────────────────────────────────────────────────────
const STAGE_COLOURS = {
  new:       "#6b7280",
  screening: "#3b82f6",
  interview: "#8b5cf6",
  offered:   "#f59e0b",
  hired:     "#22c55e",
  rejected:  "#ef4444",
};
function stageColour(name) {
  return STAGE_COLOURS[name?.toLowerCase()] ?? "#555";
}

// ─────────────────────────────────────────────────────────────────────────────

function CandidatePanel({ application, roleId, onClose, onStageChange }) {
  const [comments,   setComments]   = useState([]);
  const [stages,     setStages]     = useState([]);
  const [candidate,  setCandidate]  = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [newComment, setNewComment] = useState("");
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState(null);

  useEffect(() => {
    if (!application) return;
    setLoading(true);
    setError(null);
    setCandidate(null);
    setStages([]);

    Promise.all([
      fetchComments(application.application_id),
      fetchStages(roleId),
      fetchCandidate(application.candidate_id),
    ])
      .then(([commentData, stageData, candidateData]) => {
        setComments(commentData);
        setStages(stageData);
        setCandidate(candidateData);
      })
      .catch(() => setError("Could not load candidate details"))
      .finally(() => setLoading(false));
  }, [application, roleId]);

  if (!application) return null;

  const phone     = candidate?.phone      ?? null;
  const resumeUrl = candidate?.resume_url ?? null;

  return (
    <div style={{
      position: "fixed", top: 0, right: 0,
      width: "380px", height: "100vh",
      background: "#1e1e1e",
      borderLeft: "1px solid #333",
      boxShadow: "-4px 0 16px rgba(0,0,0,0.5)",
      zIndex: 1000,
    }}>
      <div style={{
        display: "flex", flexDirection: "column",
        height: "100%", overflow: "hidden", padding: "16px",
      }}>

        {/* ── Header ── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid #333",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: "0 0 4px 0", color: "#fff" }}>
              {application.candidate_name}
            </h3>
            <div style={{ fontSize: "13px", color: "#ccc", marginBottom: "2px" }}>
              {application.email}
            </div>
            {phone && (
              <div style={{ fontSize: "12px", color: "#aaa", marginBottom: "2px" }}>
                📞 {phone}
              </div>
            )}
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "8px" }}>
              Owner: {application.recruiter}
            </div>
            {resumeUrl && (
              <a
                href={resumeUrl} target="_blank" rel="noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  fontSize: "12px", color: "#4CAF50", textDecoration: "none",
                  padding: "3px 8px", border: "1px solid #4CAF50", borderRadius: "4px",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#4CAF5022"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                ↓ Resume
              </a>
            )}
          </div>

          <button
            onClick={() => {
              if (newComment.trim() && !window.confirm("You have an unsaved comment. Close anyway?")) return;
              onClose();
            }}
            style={{
              border: "none", background: "transparent", fontSize: "20px",
              cursor: "pointer", color: "#999", padding: "4px",
              borderRadius: "4px", flexShrink: 0,
            }}
          >×</button>
        </div>

        {/* ── Stage selector ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          marginBottom: "20px", padding: "12px",
          background: "#2a2a2a", borderRadius: "8px",
        }}>
          <div style={{ fontSize: "14px", color: "#fff", fontWeight: "500", flexShrink: 0 }}>
            Stage
          </div>
          <span style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: stageColour(application.stage), flexShrink: 0,
          }} />
          <select
            disabled={saving || stages.length === 0}
            value={application.stage}
            onChange={(e) => onStageChange(application.application_id, e.target.value)}
            style={{
              padding: "6px 12px", background: "#333", color: "#fff",
              border: "1px solid #555", borderRadius: "6px",
              fontSize: "14px", flex: 1,
            }}
          >
            {stages.length === 0
              ? <option value={application.stage}>{application.stage}</option>
              : stages.map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))
            }
          </select>
        </div>

        {/* ── Comments list ── */}
        <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px", marginBottom: "12px" }}>
          <div style={{ fontWeight: "600", marginBottom: "12px", color: "#fff", fontSize: "16px" }}>
            Comments
          </div>

          {loading && <div style={{ color: "#ccc" }}>Loading...</div>}
          {error   && <div style={{ color: "#f44336" }}>{error}</div>}
          {!loading && comments.length === 0 && (
            <div style={{ fontSize: "14px", color: "#777", textAlign: "center", padding: "20px" }}>
              Be the first to add a comment!
            </div>
          )}

          {comments.map((c) => (
            <div key={c.id} style={{
              background: "#2a2a2a", borderRadius: "8px",
              padding: "12px", marginBottom: "12px", border: "1px solid #333",
            }}>
              <div style={{ fontSize: "14px", color: "#fff", marginBottom: "6px" }}>
                {c.comment}
              </div>
              <div style={{ fontSize: "11px", color: "#999" }}>
                {c.recruiter} · {formatTimestamp(c.created_at)}
              </div>
            </div>
          ))}
        </div>

        {/* ── Add comment ── */}
        <div style={{
          marginTop: "auto", background: "#1e1e1e",
          borderTop: "1px solid #333", paddingTop: "16px", paddingBottom: "20px",
        }}>
          <textarea
            placeholder="Add a comment…"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            style={{
              width: "100%", minHeight: "80px", padding: "12px",
              resize: "none", background: "#2a2a2a", color: "#fff",
              border: "1px solid #555", borderRadius: "8px",
              fontSize: "14px", fontFamily: "inherit", boxSizing: "border-box",
            }}
          />
          <div style={{ textAlign: "right", marginTop: "12px" }}>
            <button
              disabled={!newComment.trim() || saving}
              onClick={() => {
                if (saving) return;
                setSaveError(null);
                setSaving(true);
                addComment(application.application_id, newComment)
                  .then(() => { setNewComment(""); return fetchComments(application.application_id); })
                  .then(setComments)
                  .catch(() => setSaveError("Could not add comment. Try again."))
                  .finally(() => setSaving(false));
              }}
              style={{
                padding: "8px 16px",
                background: newComment.trim() && !saving ? "#4CAF50" : "#333",
                color: "#fff", border: "none", borderRadius: "6px",
                cursor: newComment.trim() && !saving ? "pointer" : "not-allowed",
                fontSize: "14px", fontWeight: "500",
              }}
            >
              {saving ? "Saving..." : "Add Comment"}
            </button>
          </div>
          {saveError && (
            <div style={{ color: "#f44336", fontSize: "12px", marginTop: "8px" }}>
              {saveError}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default CandidatePanel;