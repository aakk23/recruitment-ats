import { useMemo, useState } from "react";
import { changePassword } from "../api";
import { useToast } from "../toast/ToastContext";

export default function ChangePasswordPanel({ open, onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  const canSubmit = useMemo(() => {
    return (
      currentPassword.length > 0 &&
      newPassword.length >= 8 &&
      confirmPassword.length >= 8 &&
      newPassword === confirmPassword &&
      !saving
    );
  }, [currentPassword, newPassword, confirmPassword, saving]);

  const resetAndClose = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      showToast({ type: "success", message: "Password changed successfully" });
      resetAndClose();
    } catch (e) {
      setError(e.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <h3 style={{ margin: "0 0 2px", fontSize: "15px", fontWeight: 700 }}>Change Password</h3>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Update your account password.
          </div>
        </div>
        <button onClick={resetAndClose} style={closeBtn}>x</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
        <Field label="Current Password">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="New Password">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Confirm New Password">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={inputStyle}
          />
        </Field>
        {error && (
          <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--danger)" }}>
            {error}
          </div>
        )}
      </div>

      <div style={footerStyle}>
        <button onClick={resetAndClose} style={ghostBtn}>Cancel</button>
        <button onClick={handleSubmit} disabled={!canSubmit} style={primaryBtn}>
          {saving ? "Saving..." : "Update Password"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

const panelStyle = {
  position: "fixed",
  top: 0,
  right: 0,
  width: "380px",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  background: "var(--bg-surface)",
  borderLeft: "1px solid var(--border-subtle)",
  boxShadow: "var(--shadow-lg)",
  zIndex: 1100,
};

const headerStyle = {
  padding: "18px 20px 15px",
  borderBottom: "1px solid var(--border-subtle)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
};

const footerStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "8px",
  padding: "14px 20px",
  borderTop: "1px solid var(--border-subtle)",
};

const labelStyle = {
  display: "block",
  marginBottom: "5px",
  fontSize: "12px",
  color: "var(--text-secondary)",
  fontWeight: 600,
};

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "9px 10px",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  background: "var(--bg-raised)",
  color: "var(--text-primary)",
};

const closeBtn = {
  fontSize: "18px",
  color: "var(--text-muted)",
  background: "transparent",
  border: "none",
};

const ghostBtn = {
  padding: "7px 12px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-default)",
  color: "var(--text-secondary)",
  fontSize: "13px",
};

const primaryBtn = {
  padding: "7px 12px",
  borderRadius: "var(--radius-md)",
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  fontSize: "13px",
  fontWeight: 600,
};
