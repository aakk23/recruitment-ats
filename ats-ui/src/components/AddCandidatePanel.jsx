import { useState } from "react";
import { createCandidate, createApplication } from "../api";

function AddCandidatePanel({ role, onClose, onCandidateAdded }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [resume, setResume] = useState(null);
  const [saving, setSaving] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);


  const hasChanges = name || email || phone || resume;
  const closeAfterOpen = (applicationId) => {
      onCandidateAdded(applicationId);
      onClose();
    };

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
        zIndex: 1100,
        overflow: "hidden"
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: "16px"
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "16px"
          }}
        >
          <div>
            <h3 style={{ margin: 0 }}>Add candidate</h3>
            <div style={{ fontSize: "12px", color: "#aaa" }}>
              For role: {role.title}
            </div>
          </div>

          <button
            onClick={() => {
              if (hasChanges) {
                const ok = window.confirm("Discard unsaved candidate?");
                if (!ok) return;
              }
              onClose();
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#999",
              fontSize: "20px",
              cursor: "pointer"
            }}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <label>Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />

          <label>Email *</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />

          <label>Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={inputStyle}
          />

          <label>Resume *</label>
          <div
            style={{
              border: "2px dashed #444",
              borderRadius: "8px",
              padding: "20px",
              textAlign: "center",
              color: "#aaa",
              cursor: "pointer",
              marginBottom: "16px"
            }}
            onClick={() =>
              document.getElementById("resumeInput").click()
            }
          >
            {resume ? resume.name : "Drag & drop or click to upload"}
            <input
              id="resumeInput"
              type="file"
              accept=".pdf"
              hidden
              onChange={(e) => setResume(e.target.files[0])}
            />
          </div>
        </div>

       {/* Footer */}
        <div
          style={{
            borderTop: "1px solid #333",
            paddingTop: "12px",
            paddingBottom: "16px"
          }}
        >
          {!duplicateInfo && (
            <button
              disabled={!name || !email || !resume || saving}
              onClick={async () => {
                try {
                  setSaving(true);
                
                  const formData = new FormData();
                  formData.append("full_name", name);
                  formData.append("email", email);
                  if (phone) formData.append("phone", phone);
                  formData.append("role_id", role.id);
                  formData.append("resume", resume);
                
                  const result = await createCandidate(formData);
                
                  if (result.status === "created") {
                    const application = await createApplication(
                      result.id,
                      role.id
                    );
                    closeAfterOpen(application.id);
                    return;
                  }
              
                  if (result.status === "email_exists") {
                    setDuplicateInfo({
                      candidate_id: result.candidate_id,
                      application_id: result.application_id
                    });
                    return;
                  }
                } finally {
                    
                  setSaving(false);
                    
                }
              }}
              style={{
                width: "100%",
                padding: "10px",
                background:
                  !name || !email || !resume || saving
                    ? "#333"
                    : "#4CAF50",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor:
                  !name || !email || !resume || saving
                    ? "not-allowed"
                    : "pointer"
              }}
            >
              {saving ? "Adding..." : "Add candidate"}
            </button>
          )}
          {duplicateInfo && (
              <div
                style={{
                  background: "#2a2a2a",
                  border: "1px solid #444",
                  borderRadius: "8px",
                  padding: "12px"
                }}
              >
                <div style={{ marginBottom: "12px", color: "#ccc", fontSize: "14px" }}>
                  This candidate already exists in the system.
                </div>
            
                {duplicateInfo.application_id ? (
                  <button
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "#4CAF50",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      marginBottom: "8px"
                    }}
                    onClick={() => {
                      closeAfterOpen(duplicateInfo.application_id);
                    }}
                  >
                    View profile
                  </button>
                ) : (
                  <button
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "#4CAF50",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: saving ? "not-allowed" : "pointer",
                      marginBottom: "8px"
                    }}
                    disabled={saving}
                    onClick={async () => {
                      try {
                        setSaving(true);
                        const app = await createApplication(
                          duplicateInfo.candidate_id,
                          role.id
                        );
                        closeAfterOpen(app.id);
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    Apply to this role
                  </button>
                )}
            
                <button
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "transparent",
                    color: "#aaa",
                    border: "1px solid #444",
                    borderRadius: "6px",
                    cursor: "pointer"
                  }}
                  onClick={() => setDuplicateInfo(null)}
                >
                  Cancel
                </button>
              </div>
            )}
        </div>

      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "8px",
  marginBottom: "12px",
  background: "#2a2a2a",
  color: "#fff",
  border: "1px solid #555",
  borderRadius: "6px",
  boxSizing: "border-box"
};

export default AddCandidatePanel;
