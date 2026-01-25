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
              height: "100vh",
              background: "#1e1e1e",
              padding: "24px",
              boxSizing: "border-box",
              overflowY: "auto"
            }}
    >
        <div style={{
                width: "100%",
                maxWidth: "1400px",
                padding: "24px",
                display: "flex",
                flexDirection: "column"

            }}>
          <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px"
              }}
            >
              <h2 style={{ margin: 0, color: "#fff" }}>Roles</h2>
          
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  window.location.reload();
                }}
                style={{
                  padding: "6px 12px",
                  background: "#2a2a2a",
                  color: "#fff",
                  border: "1px solid #444",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                Logout
              </button>
            </div>


      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button
            onClick={() => setStatusFilter("open")}
            style={{
              padding: "6px 12px",
              background: statusFilter === "open" ? "#333" : "#2a2a2a",
              color: statusFilter === "open" ? "#fff" : "#aaa",
              border: "1px solid #444",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            Open
          </button>
        
          <button
            onClick={() => setStatusFilter("closed")}
            style={{
              padding: "6px 12px",
              background: statusFilter === "closed" ? "#333" : "#2a2a2a",
              color: statusFilter === "closed" ? "#fff" : "#aaa",
              border: "1px solid #444",
              borderRadius: "6px",
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
          <div style={{ color: "#777" }}>No roles in this state yet</div>
        )}

        <div
          style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "12px",
              
            }}
        >
          {roles.map((role) => (
            <div
              key={role.id}
              onClick={() => onRoleSelect(role)}
              style={{
                border: "1px solid #444",
                borderRadius: "8px",
                padding: "12px",
                cursor: "pointer",
                background: "#1f1f1f"
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "6px", color: "#fff" }}>
                {role.title}
              </div>
              <div style={{ fontSize: "12px", color: "#aaa" }}>
                Client: {role.client}
              </div>
              <div style={{ fontSize: "11px", color: "#777" }}>
                Status: {role.status}
              </div>
            </div>
          ))}
        </div>


      </div>
    </div>
  );
}

export default RolesPage;
