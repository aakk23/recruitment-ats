import { useState, useEffect } from "react";
// import { roles } from "../mock/roles";
import { fetchRoles } from "../api";

function RolesPage({onRoleSelect}) {
    const [statusFilter, setStatusFilter] = useState("open");
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
      setLoading(true);
      setError(null);

      fetchRoles(statusFilter)
        .then(setRoles)
        .catch(() => setError("Could not load roles"))
        .finally(() => setLoading(false));
    }, [statusFilter]);


  const handleRoleClick = (role) => {
    onRoleSelect(role);
    
  };

  return (
    <div style={{ 
        padding: "20px" ,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
        }}>
      {/* <h2>Roles</h2> */}

      {/* Filters */}
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ marginBottom: "12px" }} >Roles</h2>
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
      {loading && (
          <div style={{ color: "#777" }}>
            Loading roles…
          </div>
        )}
        {error && <div style={{ color: "red" }}>{error}</div>}
          
        {!loading && !error && roles.length === 0 && (
          <div>No roles in this state yet</div>
        )}

        {roles.map((role) => (
          <div
            key={role.id}
            onClick={() => onRoleSelect(role)}
            style={{
              border: "1px solid #ddd",
              borderRadius: "6px",
              padding: "12px",
              marginBottom: "10px",
              cursor: "pointer"
            }}
          >
            <div style={{ fontWeight: "600" }}>{role.title}</div>
            <div style={{ fontSize: "14px", color: "#555" }}>
              Client: {role.client}
            </div>
            <div style={{ fontSize: "12px", color: "#777" }}>
              Status: {role.status}
            </div>
          </div>
        ))}

      
    </div>
  );
}

export default RolesPage;
