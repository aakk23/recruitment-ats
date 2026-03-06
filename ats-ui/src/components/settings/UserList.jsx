import { useMemo, useState } from "react";
import UserRow from "./UserRow";

export default function UserList({ users, roles, canManage, onCreate, onEdit, onToggleStatus, onResetPassword, onDelete }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const filtered = useMemo(() => {
    let items = users.filter((u) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
      const matchesRole = !roleFilter || String(u.role_id || "") === roleFilter;
      const matchesStatus = !statusFilter || (u.status || "active") === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });

    items = [...items].sort((a, b) => {
      if (sortBy === "created_at") {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    return items;
  }, [users, search, roleFilter, statusFilter, sortBy]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", gap: "8px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <input placeholder="Search users" value={search} onChange={(e) => setSearch(e.target.value)} style={filterInput} />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={filterInput}>
            <option value="">All roles</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={filterInput}>
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={filterInput}>
            <option value="name">Sort: Name</option>
            <option value="created_at">Sort: Created Date</option>
          </select>
        </div>
        {canManage && <button onClick={onCreate} style={primaryBtn}>+ Create User</button>}
      </div>

      <div style={tableWrap}>
        <div style={headerRow}>
          <div style={{ ...th, flex: "1 1 180px" }}>Name</div>
          <div style={{ ...th, flex: "1 1 220px" }}>Email</div>
          <div style={{ ...th, flex: "0 0 150px" }}>Role</div>
          <div style={{ ...th, flex: "0 0 100px" }}>Status</div>
          <div style={{ ...th, flex: "0 0 120px" }}>Last Login</div>
          <div style={{ ...th, flex: "0 0 120px" }}>Created Date</div>
          <div style={{ ...th, flex: "0 0 230px", textAlign: "right" }}>Actions</div>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: "22px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>No users found.</div>
        ) : (
          filtered.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              canManage={canManage}
              onEdit={onEdit}
              onToggleStatus={onToggleStatus}
              onResetPassword={onResetPassword}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}

const filterInput = {
  padding: "6px 9px",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-sm)",
  fontSize: "12px",
};

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

const th = {
  padding: "0 8px",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--text-muted)",
  fontWeight: 600,
};
