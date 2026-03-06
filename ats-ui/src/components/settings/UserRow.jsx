function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

export default function UserRow({ user, canManage, onEdit, onToggleStatus, onResetPassword, onDelete }) {
  return (
    <div style={rowStyle}>
      <div style={{ ...cell, flex: "1 1 180px" }}>{user.name}</div>
      <div style={{ ...cell, flex: "1 1 220px" }}>{user.email}</div>
      <div style={{ ...cell, flex: "0 0 150px" }}>{user.role || "-"}</div>
      <div style={{ ...cell, flex: "0 0 100px", textTransform: "capitalize" }}>{user.status || "active"}</div>
      <div style={{ ...cell, flex: "0 0 120px" }}>{fmtDate(user.last_login)}</div>
      <div style={{ ...cell, flex: "0 0 120px" }}>{fmtDate(user.created_at)}</div>
      <div style={{ ...cell, flex: "0 0 230px", justifyContent: "flex-end", gap: "6px" }}>
        {canManage ? (
          <>
            <button onClick={() => onEdit(user)} style={ghostBtn}>Edit</button>
            <button onClick={() => onToggleStatus(user)} style={ghostBtn}>
              {user.status === "disabled" ? "Enable" : "Disable"}
            </button>
            <button onClick={() => onResetPassword(user)} style={ghostBtn}>Reset Password</button>
            <button onClick={() => onDelete(user)} style={dangerBtn}>Delete</button>
          </>
        ) : (
          <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>View only</span>
        )}
      </div>
    </div>
  );
}

const rowStyle = {
  display: "flex",
  alignItems: "center",
  minHeight: "46px",
  borderBottom: "1px solid var(--border-subtle)",
  padding: "0 10px",
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
