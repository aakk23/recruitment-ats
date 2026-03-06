// src/pages/RolesPage.jsx  — enterprise table layout, visibility as canonical status
import { useState, useEffect, useCallback } from "react";
import { fetchRoles } from "../api";
import CreateJobPanel from "../components/CreateJobPanel";
import { useAuth } from "../useAuth";


const VIS_TABS = [
  { key: "",          label: "All"       },
  { key: "published", label: "Published" },
  { key: "internal",  label: "Internal"  },
  { key: "closed",    label: "Closed"    },
];
const VIS_COLOR = { published: "#22c55e", internal: "#2563eb", closed: "#6b7280" };
const VIS_LABEL = { published: "Published", internal: "Internal", closed: "Closed" };

function initials(title = "") {
  return title.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

export default function RolesPage({ onRoleSelect }) {
  const user = useAuth();
  const isAdmin = user?.is_admin===true;
  const [vis,         setVis]         = useState("");
  const [roles,       setRoles]       = useState([]);
  const [nextCursor,  setNextCursor]  = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState(null);
  const [showCreate,  setShowCreate]  = useState(false);

  const load = useCallback((visibility, cursor = null, append = false) => {
    cursor ? setLoadingMore(true) : (setLoading(true), setError(null));
    fetchRoles(null, 50, cursor, visibility || null)
      .then(data => {
        setRoles(prev => append ? [...prev, ...data.items] : data.items);
        setNextCursor(data.next_cursor);
      })
      .catch(() => setError("Could not load jobs"))
      .finally(() => { setLoading(false); setLoadingMore(false); });
  }, []);

  useEffect(() => { setRoles([]); setNextCursor(null); load(vis); }, [vis, load]);

  return (
    <div style={{ minHeight: "calc(100vh - 52px)", background: "var(--bg-base)", padding: "28px 32px" }}>
      <div style={{ maxWidth: "1080px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <h1 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Jobs</h1>
            <p style={{ margin: "3px 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
              {roles.length > 0 ? `${roles.length}${nextCursor ? "+" : ""} positions` : "Manage your open positions"}
            </p>
          </div>
          {/* Only admins see the create button */}
          {isAdmin && (
          <button onClick={() => setShowCreate(true)} style={primaryBtn}>+ New Job</button>
          )}
          </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)", marginBottom: "0" }}>
          {VIS_TABS.map(t => (
            <button key={t.key} onClick={() => setVis(t.key)} style={{
              padding: "8px 16px", fontSize: "13px", background: "transparent", border: "none",
              fontWeight: vis === t.key ? 600 : 400,
              color: vis === t.key ? "var(--text-primary)" : "var(--text-muted)",
              borderBottom: vis === t.key ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: "-1px", transition: "color 0.15s, border-color 0.15s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* Table container */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)", borderTop: "none",
          borderRadius: "0 0 var(--radius-lg) var(--radius-lg)", overflow: "hidden",
        }}>
          {/* Table header */}
          <div style={theadStyle}>
            <div style={{ ...thStyle, flex: "0 0 40px" }} />
            <div style={{ ...thStyle, flex: "1 1 240px" }}>Job Title</div>
            <div style={{ ...thStyle, flex: "0 0 160px" }}>Client</div>
            <div style={{ ...thStyle, flex: "0 0 130px" }}>Department</div>
            <div style={{ ...thStyle, flex: "0 0 110px" }}>Type</div>
            <div style={{ ...thStyle, flex: "0 0 120px" }}>Status</div>
            <div style={{ ...thStyle, flex: "0 0 36px" }} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: "14px 20px", color: "var(--danger)", fontSize: "13px", borderBottom: "1px solid var(--border-subtle)" }}>
              {error}
            </div>
          )}

          {/* Loading skeleton rows */}
          {loading && [1,2,3,4,5].map(i => (
            <div key={i} style={trowBase}>
              <div style={{ ...tdStyle, flex: "0 0 40px" }}><Skel w={26} h={26} r={6}/></div>
              <div style={{ ...tdStyle, flex: "1 1 240px", gap: 5, flexDirection: "column", alignItems: "flex-start" }}>
                <Skel w={160} h={12} r={3}/><Skel w={90} h={10} r={3}/>
              </div>
              <div style={{ ...tdStyle, flex: "0 0 160px" }}><Skel w={90} h={12} r={3}/></div>
              <div style={{ ...tdStyle, flex: "0 0 130px" }}><Skel w={70} h={12} r={3}/></div>
              <div style={{ ...tdStyle, flex: "0 0 110px" }}><Skel w={60} h={12} r={3}/></div>
              <div style={{ ...tdStyle, flex: "0 0 120px" }}><Skel w={72} h={18} r={999}/></div>
              <div style={{ ...tdStyle, flex: "0 0 36px" }}/>
            </div>
          ))}

          {/* Empty */}
          {!loading && roles.length === 0 && (
            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
              <div style={{ fontSize: "24px", marginBottom: "8px", opacity: 0.4 }}>📋</div>
              <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>No jobs found</div>
              {!vis && isAdmin &&(<button onClick={() => setShowCreate(true)} style={{ fontSize: "13px", color: "var(--accent)", background: "transparent", border: "none" }}>Create your first job →</button>)}
            </div>
          )}

          {/* Rows */}
          {!loading && roles.map((role, i) => (
            <RoleRow key={role.id} role={role} last={i === roles.length - 1 && !nextCursor} onClick={() => onRoleSelect(role)} />
          ))}

          {/* Load more */}
          {nextCursor && (
            <div style={{ textAlign: "center", padding: "12px", borderTop: "1px solid var(--border-subtle)" }}>
              <button onClick={() => load(vis, nextCursor, true)} disabled={loadingMore}
                style={{ fontSize: "13px", color: "var(--text-muted)", background: "transparent", border: "none", opacity: loadingMore ? 0.5 : 1 }}>
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      </div>

      {isAdmin && showCreate && (
        <CreateJobPanel
          onClose={() => setShowCreate(false)}
          onCreated={role => setRoles(prev => [role, ...prev])}
        />
      )}
    </div>
  );
}

function RoleRow({ role, last, onClick }) {
  const [hov, setHov] = useState(false);
  const v = role.visibility || "internal";
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...trowBase,
        background: hov ? "var(--bg-raised)" : "transparent",
        borderBottom: last ? "none" : "1px solid var(--border-subtle)",
        cursor: "pointer", transition: "background 0.12s",
      }}
    >
      {/* Monogram */}
      <div style={{ ...tdStyle, flex: "0 0 40px" }}>
        <div style={{
          width: "26px", height: "26px", borderRadius: "5px",
          background: "var(--bg-overlay)", border: "1px solid var(--border-default)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "9px", fontWeight: 700, color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
        }}>{initials(role.title)}</div>
      </div>

      {/* Title + skills */}
      <div style={{ ...tdStyle, flex: "1 1 240px", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
          {role.title}
        </span>
        {role.skills?.length > 0 && (
          <div style={{ display: "flex", gap: 4, overflow: "hidden" }}>
            {role.skills.slice(0, 3).map(s => (
              <span key={s} style={{
                fontSize: "10px", color: "var(--text-muted)",
                background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
                borderRadius: "3px", padding: "0 5px", lineHeight: "16px", whiteSpace: "nowrap",
              }}>{s}</span>
            ))}
            {role.skills.length > 3 && <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>+{role.skills.length - 3}</span>}
          </div>
        )}
      </div>

      {/* Client */}
      <div style={{ ...tdStyle, flex: "0 0 160px" }}>
        <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{role.client || "—"}</span>
      </div>

      {/* Department */}
      <div style={{ ...tdStyle, flex: "0 0 130px" }}>
        <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{role.department || "—"}</span>
      </div>

      {/* Job type */}
      <div style={{ ...tdStyle, flex: "0 0 110px" }}>
        <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "capitalize" }}>{role.job_type || "—"}</span>
      </div>

      {/* Visibility */}
      <div style={{ ...tdStyle, flex: "0 0 120px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "12px", color: "var(--text-secondary)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: VIS_COLOR[v] || "#6b7280", flexShrink: 0 }} />
          {VIS_LABEL[v] || v}
        </span>
      </div>

      {/* Arrow */}
      <div style={{ ...tdStyle, flex: "0 0 36px", justifyContent: "center" }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ color: hov ? "var(--text-muted)" : "transparent", transition: "color 0.15s" }}>
          <path d="M4 2.5l3.5 3.5L4 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

function Skel({ w, h, r = 4 }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "var(--bg-overlay)" }} />;
}

// Styles
const primaryBtn = {
  padding: "7px 16px", background: "var(--accent)", color: "#fff",
  border: "none", borderRadius: "var(--radius-md)", fontSize: "13px", fontWeight: 600,
};
const theadStyle = {
  display: "flex", alignItems: "center", height: "36px",
  padding: "0 12px", borderBottom: "1px solid var(--border-subtle)",
  background: "var(--bg-raised)",
};
const thStyle = {
  display: "flex", alignItems: "center", padding: "0 8px",
  fontSize: "11px", fontWeight: 600, color: "var(--text-muted)",
  textTransform: "uppercase", letterSpacing: "0.06em",
};
const trowBase = {
  display: "flex", alignItems: "center", height: "52px", padding: "0 12px",
};
const tdStyle = {
  display: "flex", alignItems: "center", padding: "0 8px", overflow: "hidden",
};
