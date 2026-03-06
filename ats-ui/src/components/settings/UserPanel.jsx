import { useEffect, useState } from "react";

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "9px 10px",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  background: "var(--bg-raised)",
  color: "var(--text-primary)",
};

export default function UserPanel({
  open,
  mode,
  roles,
  initialData,
  onClose,
  onSubmit,
  submitting,
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role_id: "",
    department: "",
    status: "active",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: initialData?.name || "",
      email: initialData?.email || "",
      role_id: initialData?.role_id ? String(initialData.role_id) : "",
      department: initialData?.department || "",
      status: initialData?.status || "active",
    });
  }, [open, initialData]);

  if (!open) return null;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <h3 style={{ margin: "0 0 2px", fontSize: "15px", fontWeight: 700 }}>
            {mode === "edit" ? "Edit User" : "Create User"}
          </h3>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {mode === "edit" ? "Update profile and access" : "Add a new user to the workspace"}
          </div>
        </div>
        <button onClick={onClose} style={closeBtn}>x</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
        <Field label="Name">
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} />
        </Field>
        <Field label="Email">
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={inputStyle} />
        </Field>
        <Field label="Role">
          <select value={form.role_id} onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))} style={inputStyle}>
            <option value="">No role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Department">
          <input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} style={inputStyle} />
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} style={inputStyle}>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </Field>
      </div>

      <div style={footerStyle}>
        <button onClick={onClose} style={ghostBtn}>Cancel</button>
        <button
          onClick={() => onSubmit({
            name: form.name.trim(),
            email: form.email.trim(),
            role_id: form.role_id ? Number(form.role_id) : null,
            department: form.department.trim() || null,
            status: form.status,
          })}
          disabled={!form.name.trim() || !form.email.trim() || submitting}
          style={primaryBtn}
        >
          {submitting ? "Saving..." : mode === "edit" ? "Save Changes" : "Create User"}
        </button>
      </div>
    </div>
  );
}

const panelStyle = {
  position: "fixed",
  top: 0,
  right: 0,
  width: "390px",
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
