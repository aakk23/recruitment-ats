function CandidatePanel({ application, onClose }) {
  if (!application) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "360px",
        height: "100vh",
        background: "#fff",
        borderLeft: "1px solid #ddd",
        padding: "16px",
        boxShadow: "-2px 0 8px rgba(0,0,0,0.1)"
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <button onClick={onClose}>✕</button>
      </div>

      {/* Candidate info */}
      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ marginBottom: "4px" }}>
          {application.candidate_name}
        </h3>
        <div style={{ fontSize: "14px", color: "#555" }}>
          {application.email}
        </div>
        <div style={{ fontSize: "12px", color: "#777" }}>
          Owner: {application.recruiter}
        </div>
      </div>

      {/* Stage */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontWeight: "600", marginBottom: "6px" }}>
          Stage
        </div>
        <select defaultValue={application.stage}>
          <option>new</option>
          <option>screening</option>
          <option>interview</option>
          <option>offered</option>
          <option>hired</option>
          <option>rejected</option>
        </select>
      </div>

      {/* Comments (mock) */}
      <div>
        <div style={{ fontWeight: "600", marginBottom: "8px" }}>
          Comments
        </div>

        <div style={{ fontSize: "14px", marginBottom: "6px" }}>
          Strong SQL skills
        </div>

        <textarea
          placeholder="Add a comment..."
          style={{ width: "100%", minHeight: "80px" }}
        />
        <button style={{ marginTop: "8px" }}>
          Save
        </button>
      </div>
    </div>
  );
}

export default CandidatePanel;
