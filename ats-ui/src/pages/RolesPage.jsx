// src/pages/RolesPage.jsx
import { useState, useEffect, useCallback } from "react";
import { fetchRoles } from "../api";
import CreateJobPanel from "../components/CreateJobPanel";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(title) {
  return title.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function titleHue(title) {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) % 360;
  return h;
}

const VIS_CFG = {
  published: { color: "var(--success)", bg: "var(--success-muted)", label: "Published" },
  internal:  { color: "var(--accent)",  bg: "var(--accent-muted)",  label: "Internal"  },
  closed:    { color: "var(--danger)",  bg: "var(--danger-muted)",  label: "Closed"    },
};

// ─────────────────────────────────────────────────────────────────────────────

export default function RolesPage({ onRoleSelect }) {
  const [statusFilter,  setStatusFilter]  = useState("open");
  const [roles,         setRoles]         = useState([]);
  const [nextCursor,    setNextCursor]    = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [error,         setError]         = useState(null);
  const [showCreate,    setShowCreate]    = useState(false);

  const loadRoles = useCallback((status, cursor = null, append = false) => {
    if (!cursor) { setLoading(true); setError(null); }
    else           setLoadingMore(true);

    fetchRoles(status, 50, cursor)
      .then((data) => {
        setRoles((prev) => append ? [...prev, ...data.items] : data.items);
        setNextCursor(data.next_cursor);
      })
      .catch(() => setError("Could not load roles"))
      .finally(() => { setLoading(false); setLoadingMore(false); });
  }, []);

  useEffect(() => {
    setRoles([]);
    setNextCursor(null);
    loadRoles(statusFilter);
  }, [statusFilter, loadRoles]);

  const loadMore = () => {
    if (!nextCursor || loadingMore) return;
    loadRoles(statusFilter, nextCursor, true);
  };

  const handleJobCreated = (newRole) => {
    // Optimistic prepend — reload so counts / ordering are correct
    setRoles((prev) => [newRole, ...prev]);
  };

  return (
    <div style={{ minHeight: "calc(100vh - 52px)", background: "var(--bg-base)", padding: "32px 24px" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>

        {/* ── Page header ── */}
        <div style={{
          display: "flex", alignItems: "flex-end",
          justifyContent: "space-between", marginBottom: "28px", gap: "16px",
          flexWrap: "wrap",
        }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
              Roles
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
              {roles.length > 0 ? `${roles.length}${nextCursor ? "+" : ""} ${statusFilter} positions` : ""}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Status filter tabs */}
            <div style={{
              display: "flex", background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)", padding: "3px", gap: "2px",
            }}>
              {["open", "closed"].map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)} style={{
                  padding: "5px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 500,
                  background: statusFilter === s ? "var(--bg-raised)" : "transparent",
                  color: statusFilter === s ? "var(--text-primary)" : "var(--text-muted)",
                  border: statusFilter === s ? "1px solid var(--border-default)" : "1px solid transparent",
                  transition: "all 0.15s", textTransform: "capitalize",
                }}>{s}</button>
              ))}
            </div>

            {/* Create Job */}
            <button
              onClick={() => setShowCreate(true)}
              style={{
                padding: "8px 18px",
                background: "var(--accent)", color: "#fff",
                border: "none", borderRadius: "var(--radius-md)",
                fontSize: "13px", fontWeight: 600,
                boxShadow: "0 0 18px rgba(37,99,235,0.2)",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--accent)"}
            >
              + Create Job
            </button>
          </div>
        </div>

        {/* ── Loading / Error ── */}
        {loading && (
          <div style={{ color: "var(--text-muted)", padding: "60px 0", textAlign: "center", fontSize: "13px" }}>
            Loading roles…
          </div>
        )}
        {error && (
          <div style={{
            padding: "12px 16px", background: "var(--danger-muted)",
            border: "1px solid var(--danger)", borderRadius: "var(--radius-md)",
            color: "var(--danger)", fontSize: "13px", marginBottom: "16px",
          }}>{error}</div>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && roles.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📋</div>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
              No {statusFilter} roles
            </div>
            <div style={{ fontSize: "13px" }}>
              {statusFilter === "open"
                ? <span>No open roles yet. <button onClick={() => setShowCreate(true)} style={{ color: "var(--accent)", background: "transparent", border: "none", fontSize: "13px", cursor: "pointer" }}>Create the first one →</button></span>
                : "Closed roles will appear here."
              }
            </div>
          </div>
        )}

        {/* ── Role cards grid ── */}
        {!loading && roles.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "14px",
          }}>
            {roles.map((role) => <RoleCard key={role.id} role={role} onClick={() => onRoleSelect(role)} />)}
          </div>
        )}

        {/* ── Load more ── */}
        {nextCursor && (
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{
                padding: "8px 24px", background: "var(--bg-surface)",
                color: loadingMore ? "var(--text-muted)" : "var(--text-secondary)",
                border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
                fontSize: "13px", fontWeight: 500, transition: "all 0.15s",
              }}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>

      {/* ── Create Job panel ── */}
      {showCreate && (
        <CreateJobPanel
          onClose={() => setShowCreate(false)}
          onCreated={handleJobCreated}
        />
      )}
    </div>
  );
}

// ── Role card ─────────────────────────────────────────────────────────────────

function RoleCard({ role, onClick }) {
  const hue    = titleHue(role.title);
  const isOpen = role.status === "open";
  const vis    = VIS_CFG[role.visibility] || VIS_CFG.internal;

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)", padding: "0",
        cursor: "pointer", overflow: "hidden",
        transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
        e.currentTarget.style.boxShadow   = "var(--shadow-md)";
        e.currentTarget.style.transform   = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-subtle)";
        e.currentTarget.style.boxShadow   = "none";
        e.currentTarget.style.transform   = "translateY(0)";
      }}
    >
      {/* Accent strip */}
      <div style={{ height: "3px", background: `hsl(${hue}, 65%, 55%)` }} />

      <div style={{ padding: "18px 20px 16px" }}>
        {/* Avatar + title */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "8px",
            background: `hsl(${hue}, 55%, 18%)`, border: `1px solid hsl(${hue}, 55%, 28%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "12px", fontWeight: 700, color: `hsl(${hue}, 65%, 65%)`,
            flexShrink: 0, fontFamily: "var(--font-mono)", letterSpacing: "0.02em",
          }}>
            {getInitials(role.title)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontWeight: 600, fontSize: "14px", color: "var(--text-primary)",
              lineHeight: 1.3, marginBottom: "3px",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{role.title}</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{role.client}</div>
          </div>
        </div>

        {/* Meta row — department, job_type */}
        {(role.department || role.job_type) && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
            {role.department && (
              <span style={metaChip}>🏢 {role.department}</span>
            )}
            {role.job_type && (
              <span style={metaChip}>{role.job_type}</span>
            )}
          </div>
        )}

        {/* Skills (max 3 shown) */}
        {role.skills?.length > 0 && (
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "12px" }}>
            {role.skills.slice(0, 3).map((s) => (
              <span key={s} style={{
                padding: "2px 7px",
                background: "var(--accent-muted)", color: "var(--accent)",
                borderRadius: "999px", fontSize: "10px", fontWeight: 500,
                border: "1px solid var(--accent-glow)",
              }}>{s}</span>
            ))}
            {role.skills.length > 3 && (
              <span style={{ ...metaChip, color: "var(--text-muted)" }}>+{role.skills.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer: status + visibility */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className={`badge ${isOpen ? "badge-open" : "badge-closed"}`}>
            <span className="dot" style={{ background: isOpen ? "var(--success)" : "var(--danger)" }} />
            {role.status}
          </span>
          <span style={{
            fontSize: "10px", fontWeight: 600,
            color: vis.color, background: vis.bg,
            padding: "2px 8px", borderRadius: "999px",
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>{vis.label}</span>
        </div>
      </div>
    </div>
  );
}

const metaChip = {
  padding: "2px 7px",
  background: "var(--bg-raised)", color: "var(--text-muted)",
  border: "1px solid var(--border-subtle)", borderRadius: "999px",
  fontSize: "10px", fontWeight: 500,
};