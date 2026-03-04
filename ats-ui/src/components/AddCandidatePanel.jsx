// src/components/AddCandidatePanel.jsx
import { useState } from "react";
import { createCandidate, createApplication } from "../api";

function AddCandidatePanel({ role, onClose, onCandidateAdded, onViewApplication }) {
  const [name,          setName]          = useState("");
  const [email,         setEmail]         = useState("");
  const [phone,         setPhone]         = useState("");
  const [resume,        setResume]        = useState(null);
  const [linkedinUrl,   setLinkedinUrl]   = useState("");
  const [saving,        setSaving]        = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  const hasChanges = name || email || phone || resume || linkedinUrl;

  const closeAfterOpen = (applicationId) => {
    onCandidateAdded(applicationId);
    onClose();
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("full_name", name);
      formData.append("email", email);
      if (phone) formData.append("phone", phone);
      if (linkedinUrl) formData.append("linkedin_url", linkedinUrl);
      formData.append("role_id", role.id);
      formData.append("resume", resume);

      const result = await createCandidate(formData);

      if (result.status === "created") {
        // Pass resume filename so the backend can log resume_uploaded event
        const application = await createApplication(
          result.id,
          role.id,
          resume.name,
        );
        closeAfterOpen(application.id);
        return;
      }
      if (result.status === "email_exists") {
        setDuplicateInfo({
          candidate_id:   result.candidate_id,
          application_id: result.application_id,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, right: 0,
      width: "380px", height: "100vh",
      background: "var(--bg-surface)",
      borderLeft: "1px solid var(--border-subtle)",
      boxShadow: "var(--shadow-lg)",
      zIndex: 1100, overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "18px 20px 16px",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        flexShrink: 0,
      }}>
        <div>
          <h3 style={{ margin: "0 0 3px", fontSize: "15px", fontWeight: 700 }}>
            Add candidate
          </h3>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {role.title}
          </div>
        </div>
        <button
          onClick={() => {
            if (hasChanges && !window.confirm("Discard unsaved candidate?")) return;
            onClose();
          }}
          style={{
            background: "transparent", border: "none",
            color: "var(--text-muted)", fontSize: "20px",
            lineHeight: 1, padding: "2px 4px", borderRadius: "4px",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
        >×</button>
      </div>

      {/* Form */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        <Field label="Full name *">
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith" style={inputStyle} />
        </Field>
        <Field label="Email *">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@company.com" style={inputStyle} />
        </Field>
        <Field label="Phone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210" style={inputStyle} />
        </Field>

        <Field label="LinkedIn">
          <input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/username" style={inputStyle} />
        </Field>

        <Field label="Resume *">
          <div
            onClick={() => document.getElementById("resumeInput").click()}
            style={{
              border: `2px dashed ${resume ? "var(--accent)" : "var(--border-default)"}`,
              borderRadius: "var(--radius-md)",
              padding: "20px",
              textAlign: "center",
              cursor: "pointer",
              background: resume ? "var(--accent-muted)" : "var(--bg-raised)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
            onMouseLeave={(e) => {
              if (!resume) e.currentTarget.style.borderColor = "var(--border-default)";
            }}
          >
            <div style={{ fontSize: "20px", marginBottom: "6px" }}>
              {resume ? "📄" : "⬆️"}
            </div>
            <div style={{ fontSize: "13px", color: resume ? "var(--accent)" : "var(--text-muted)", fontWeight: 500 }}>
              {resume ? resume.name : "Click to upload PDF"}
            </div>
            {!resume && (
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                PDF only · max 10 MB
              </div>
            )}
            <input id="resumeInput" type="file" accept=".pdf" hidden
              onChange={(e) => setResume(e.target.files[0])} />
          </div>
        </Field>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: "1px solid var(--border-subtle)",
        padding: "14px 20px 20px",
        flexShrink: 0,
      }}>
        {!duplicateInfo ? (
          <button
            disabled={!name || !email || !resume || saving}
            onClick={handleSubmit}
            style={{
              width: "100%", padding: "10px",
              background: (!name || !email || !resume || saving)
                ? "var(--bg-overlay)" : "var(--accent)",
              color: (!name || !email || !resume || saving)
                ? "var(--text-muted)" : "#fff",
              border: "none", borderRadius: "var(--radius-md)",
              fontSize: "14px", fontWeight: 600,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              if (name && email && resume && !saving)
                e.currentTarget.style.background = "var(--accent-hover)";
            }}
            onMouseLeave={(e) => {
              if (name && email && resume && !saving)
                e.currentTarget.style.background = "var(--accent)";
            }}
          >
            {saving ? "Adding…" : "Add candidate"}
          </button>
        ) : (
          <div style={{
            background: "var(--bg-raised)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            padding: "14px",
          }}>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "12px" }}>
              This candidate already exists in the system.
            </div>
            {duplicateInfo.application_id ? (
              <button
                onClick={() => onViewApplication?.(duplicateInfo.application_id)}
                style={actionBtnStyle("#fff", "var(--accent)")}
              >
                View existing application →
              </button>
            ) : (
              <button
                disabled={saving}
                onClick={async () => {
                  try {
                    setSaving(true);
                    const app = await createApplication(duplicateInfo.candidate_id, role.id);
                    closeAfterOpen(app.id);
                  } finally { setSaving(false); }
                }}
                style={actionBtnStyle("#fff", "var(--accent)")}
              >
                {saving ? "Adding…" : "Apply to this role"}
              </button>
            )}
            <button
              onClick={() => setDuplicateInfo(null)}
              style={actionBtnStyle("var(--text-muted)", "transparent", "var(--border-default)")}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{
        display: "block", fontSize: "12px", fontWeight: 600,
        color: "var(--text-secondary)", marginBottom: "6px",
        letterSpacing: "0.02em",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const inputStyle = {
  display: "block", width: "100%",
  padding: "9px 12px",
  background: "var(--bg-raised)", color: "var(--text-primary)",
  border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
  fontSize: "14px", outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

function actionBtnStyle(color, bg, border = "none") {
  return {
    display: "block", width: "100%",
    padding: "9px", marginBottom: "8px",
    background: bg, color,
    border: border === "none" ? "none" : `1px solid ${border}`,
    borderRadius: "var(--radius-md)",
    fontSize: "13px", fontWeight: 600,
    cursor: "pointer", textAlign: "center",
  };
}

export default AddCandidatePanel;