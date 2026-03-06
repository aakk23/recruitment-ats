import { useEffect, useState } from "react";
import PermissionToggleGroup from "./PermissionToggleGroup";
import { PERMISSION_GROUPS } from "./permissionCatalog";

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "9px 10px",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  background: "var(--bg-raised)",
  color: "var(--text-primary)",
};

export default function RolePanel({ open, mode, initialData, submitting, onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    if (!open) return;
    setName(initialData?.name || "");
    setDescription(initialData?.description || "");
    setPermissions(initialData?.permissions || []);
  }, [open, initialData]);

  const toggle = (key) => {
    setPermissions((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  };

  if (!open) return null;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <h3 style={{ margin: "0 0 2px", fontSize: "15px", fontWeight: 700 }}>
            {mode === "edit" ? "Edit Role" : "Create Role"}
          </h3>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Configure permissions for this role.
          </div>
        </div>
        <button onClick={onClose} style={closeBtn}>x</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
        <div style={{ marginBottom: "14px" }}>
          <label style={labelStyle}>Role Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: "14px" }}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        <div style={{ marginBottom: "8px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>
          Permissions
        </div>
        <PermissionToggleGroup groups={PERMISSION_GROUPS} selected={permissions} onToggle={toggle} />
      </div>

      <div style={footerStyle}>
        <button onClick={onClose} style={ghostBtn}>Cancel</button>
        <button
          onClick={() => onSubmit({ name: name.trim(), description: description.trim() || null, permissions })}
          disabled={!name.trim() || submitting}
          style={primaryBtn}
        >
          {submitting ? "Saving..." : mode === "edit" ? "Save Role" : "Create Role"}
        </button>
      </div>
    </div>
  );
}

const panelStyle = {
  position: "fixed",
  top: 0,
  right: 0,
  width: "430px",
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

const closeBtn = {
  fontSize: "18px",
  color: "var(--text-muted)",
  background: "transparent",
  border: "none",
};

const labelStyle = {
  display: "block",
  marginBottom: "5px",
  fontSize: "12px",
  color: "var(--text-secondary)",
  fontWeight: 600,
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
