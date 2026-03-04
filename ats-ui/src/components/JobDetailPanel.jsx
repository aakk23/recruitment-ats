// src/components/JobDetailPanel.jsx
// Read-only slide-over showing full job details. Triggered by "View Job" on board header.
export default function JobDetailPanel({ role, onClose }) {
  if (!role) return null;

  const salary =
    role.min_salary && role.max_salary
      ? `₹${role.min_salary.toLocaleString("en-IN")} – ₹${role.max_salary.toLocaleString("en-IN")}`
      : role.min_salary ? `From ₹${role.min_salary.toLocaleString("en-IN")}`
      : role.max_salary ? `Up to ₹${role.max_salary.toLocaleString("en-IN")}`
      : null;

  const exp =
    role.min_exp != null && role.max_exp != null
      ? `${role.min_exp}–${role.max_exp} yrs`
      : role.min_exp != null ? `${role.min_exp}+ yrs`
      : role.max_exp != null ? `Up to ${role.max_exp} yrs`
      : null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1050,
      display: "flex", alignItems: "stretch", justifyContent: "flex-end",
    }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={onClose} />
      <div style={{
        position: "relative", zIndex: 1,
        width: "480px", maxWidth: "100vw",
        background: "var(--bg-surface)",
        borderLeft: "1px solid var(--border-subtle)",
        boxShadow: "var(--shadow-lg)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px 18px",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em" }}>
                {role.title}
              </h2>
              <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{role.client}</div>
            </div>
            <CloseBtn onClick={onClose} />
          </div>

          {/* Pills row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "14px" }}>
            <VisBadge visibility={role.visibility} />
            {role.job_type && <Pill>{role.job_type}</Pill>}
            {role.department && <Pill>🏢 {role.department}</Pill>}
            {exp && <Pill>⏱ {exp}</Pill>}
            {salary && <Pill>💰 {salary}</Pill>}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {/* Meta grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "24px" }}>
            {[
              ["Client",     role.client],
              ["Company",    role.company_name],
              ["Department", role.department],
              ["Job Type",   role.job_type],
              ["Experience", exp],
              ["Salary",     salary],
              ["Team Owner", role.team_name],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>{k}</div>
                <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Skills */}
          {role.skills?.length > 0 && (
            <Section title="Skills">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {role.skills.map((s) => (
                  <span key={s} style={{
                    padding: "3px 10px",
                    background: "var(--accent-muted)", color: "var(--accent)",
                    border: "1px solid var(--accent)44",
                    borderRadius: "999px", fontSize: "12px", fontWeight: 500,
                  }}>{s}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Description */}
          {role.description && (
            <Section title="Job Description">
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {role.description}
              </div>
            </Section>
          )}

          {/* About Company */}
          {role.about_company && (
            <Section title="About Company">
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {role.about_company}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{
        fontSize: "11px", fontWeight: 700, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px",
      }}>{title}</div>
      {children}
    </div>
  );
}

function Pill({ children }) {
  return (
    <span style={{
      padding: "3px 10px",
      background: "var(--bg-raised)", color: "var(--text-secondary)",
      border: "1px solid var(--border-default)", borderRadius: "999px",
      fontSize: "12px", fontWeight: 500,
    }}>{children}</span>
  );
}

function VisBadge({ visibility }) {
  const map = {
    published: { bg: "var(--success-muted)", color: "var(--success)", label: "Published" },
    internal:  { bg: "var(--accent-muted)",  color: "var(--accent)",  label: "Internal"  },
    closed:    { bg: "var(--danger-muted)",  color: "var(--danger)",  label: "Closed"    },
  };
  const cfg = map[visibility] || map.internal;
  return (
    <span style={{
      padding: "3px 10px",
      background: cfg.bg, color: cfg.color,
      borderRadius: "999px", fontSize: "12px", fontWeight: 600,
    }}>{cfg.label}</span>
  );
}

function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      background: "transparent", border: "none", fontSize: "20px",
      color: "var(--text-muted)", cursor: "pointer", padding: "2px 4px", flexShrink: 0,
    }}
      onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
      onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
    >×</button>
  );
}