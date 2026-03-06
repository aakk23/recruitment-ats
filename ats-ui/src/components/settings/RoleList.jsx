function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

export default function RoleList({ roles, canManage, onCreate, onEdit, onDelete }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{roles.length} roles</div>
        {canManage && <button onClick={onCreate} style={primaryBtn}>+ Create Role</button>}
      </div>

      <div style={tableWrap}>
        <div style={headerRow}>
          <div style={{ ...th, flex: "0 0 180px" }}>Role Name</div>
          <div style={{ ...th, flex: "1 1 260px" }}>Description</div>
          <div style={{ ...th, flex: "0 0 130px" }}>Permissions</div>
          <div style={{ ...th, flex: "0 0 120px" }}>Created</div>
          <div style={{ ...th, flex: "0 0 170px", textAlign: "right" }}>Actions</div>
        </div>

        {roles.length === 0 ? (
          <div style={{ padding: "22px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>No roles configured.</div>
        ) : (
          roles.map((role) => (
            <div key={role.id} style={rowStyle}>
              <div style={{ ...cell, flex: "0 0 180px", fontWeight: 600 }}>{role.name}</div>
              <div style={{ ...cell, flex: "1 1 260px" }}>{role.description || "-"}</div>
              <div style={{ ...cell, flex: "0 0 130px" }}>{(role.permissions || []).length}</div>
              <div style={{ ...cell, flex: "0 0 120px" }}>{fmtDate(role.created_at)}</div>
              <div style={{ ...cell, flex: "0 0 170px", justifyContent: "flex-end", gap: "6px" }}>
                {canManage ? (
                  <>
                    <button onClick={() => onEdit(role)} style={ghostBtn}>Edit</button>
                    <button onClick={() => onDelete(role)} style={dangerBtn}>Delete</button>
                  </>
                ) : (
                  <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>View only</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const primaryBtn = {
  padding: "6px 12px",
  border: "none",
  borderRadius: "var(--radius-sm)",
  background: "var(--accent)",
  color: "#fff",
  fontSize: "13px",
  fontWeight: 600,
};

const tableWrap = {
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-md)",
  overflow: "hidden",
  background: "var(--bg-surface)",
};

const headerRow = {
  display: "flex",
  minHeight: "36px",
  alignItems: "center",
  padding: "0 10px",
  background: "var(--bg-raised)",
  borderBottom: "1px solid var(--border-subtle)",
};

const rowStyle = {
  display: "flex",
  alignItems: "center",
  minHeight: "44px",
  padding: "0 10px",
  borderBottom: "1px solid var(--border-subtle)",
};

const th = {
  padding: "0 8px",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--text-muted)",
  fontWeight: 600,
};

const cell = {
  padding: "8px",
  fontSize: "13px",
  color: "var(--text-primary)",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

const ghostBtn = {
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-sm)",
  padding: "4px 8px",
  fontSize: "12px",
  color: "var(--text-secondary)",
};

const dangerBtn = {
  border: "1px solid rgba(239,68,68,0.4)",
  borderRadius: "var(--radius-sm)",
  padding: "4px 8px",
  fontSize: "12px",
  color: "var(--danger)",
};
