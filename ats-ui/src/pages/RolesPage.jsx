import { useState } from "react";
import { roles } from "../mock/roles";

function RolesPage({onRoleSelect}) {
  const [statusFilter, setStatusFilter] = useState("open");

  const filteredRoles = roles.filter(
    (role) => role.status === statusFilter
  );

  const handleRoleClick = (role) => {
    onRoleSelect(role);
    
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Roles</h2>

      {/* Filters */}
      <div style={{ marginBottom: "16px" }}>
        <button
          onClick={() => setStatusFilter("open")}
          style={{
            marginRight: "8px",
            padding: "6px 12px",
            background:
              statusFilter === "open" ? "#333" : "#eee",
            color:
              statusFilter === "open" ? "#fff" : "#000",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Open
        </button>

        <button
          onClick={() => setStatusFilter("closed")}
          style={{
            padding: "6px 12px",
            background:
              statusFilter === "closed" ? "#333" : "#eee",
            color:
              statusFilter === "closed" ? "#fff" : "#000",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Closed
        </button>
      </div>

      {/* Roles List */}
      <div>
        {filteredRoles.length === 0 && (
          <div style={{ color: "#777" }}>
            No roles found
          </div>
        )}

        {filteredRoles.map((role) => (
          <div
            key={role.id}
            onClick={() => handleRoleClick(role)}
            style={{
              border: "1px solid #ddd",
              borderRadius: "6px",
              padding: "12px",
              marginBottom: "10px",
              cursor: "pointer"
            }}
          >
            <div style={{ fontWeight: "600" }}>
              {role.title}
            </div>
            <div style={{ fontSize: "14px", color: "#555" }}>
              Client: {role.client}
            </div>
            <div style={{ fontSize: "12px", color: "#777" }}>
              Status: {role.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RolesPage;
