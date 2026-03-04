// src/components/JobPanel.jsx
// Slide-over with View mode and Edit mode for job details
import { useState, useEffect } from "react";
import { updateRole, fetchClients, fetchRecruiters } from "../api";

const JOB_TYPES = ["full-time", "part-time", "contract", "freelance", "internship"];
const VIS_OPTIONS = [
  { value: "internal",  label: "Internal",  desc: "Visible only to your team" },
  { value: "published", label: "Published", desc: "Visible on public job board" },
  { value: "closed",    label: "Closed",    desc: "Not accepting applications" },
];
const VIS_COLOR = { published: "#22c55e", internal: "#2563eb", closed: "#6b7280" };

export default function JobPanel({ role, onClose, onSaved }) {
  const [mode, setMode] = useState("view"); // "view" | "edit"

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1050,
      display: "flex", justifyContent: "flex-end",
    }}>
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} onClick={onClose} />

      {/* Panel */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "500px", maxWidth: "100vw",
        background: "var(--bg-surface)", borderLeft: "1px solid var(--border-subtle)",
        boxShadow: "var(--shadow-lg)", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 22px 14px", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0,
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}>
          <div>
            <h2 style={{ margin: "0 0 3px", fontSize: "16px", fontWeight: 700, letterSpacing: "-0.01em" }}>
              {role.title}
            </h2>
            <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{role.client}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, marginLeft: 12 }}>
            {/* Mode toggle */}
            <div style={{
              display: "flex", background: "var(--bg-raised)",
              border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "2px", gap: "2px",
            }}>
              {["view", "edit"].map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: "4px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 500,
                  background: mode === m ? "var(--bg-overlay)" : "transparent",
                  color: mode === m ? "var(--text-primary)" : "var(--text-muted)",
                  border: mode === m ? "1px solid var(--border-default)" : "1px solid transparent",
                  transition: "all 0.15s", textTransform: "capitalize",
                }}>{m === "view" ? "View" : "Edit"}</button>
              ))}
            </div>
            <CloseBtn onClick={onClose} />
          </div>
        </div>

        {mode === "view"
          ? <ViewBody role={role} />
          : <EditBody role={role} onSaved={(r) => { onSaved(r); setMode("view"); }} onCancel={() => setMode("view")} />
        }
      </div>
    </div>
  );
}

// ── View mode ─────────────────────────────────────────────────────────────────

function ViewBody({ role }) {
  const salary =
    role.min_salary && role.max_salary ? `₹${role.min_salary.toLocaleString("en-IN")} – ₹${role.max_salary.toLocaleString("en-IN")}`
    : role.min_salary ? `From ₹${role.min_salary.toLocaleString("en-IN")}`
    : role.max_salary ? `Up to ₹${role.max_salary.toLocaleString("en-IN")}`
    : null;

  const exp =
    role.min_exp != null && role.max_exp != null ? `${role.min_exp}–${role.max_exp} yrs`
    : role.min_exp != null ? `${role.min_exp}+ yrs`
    : role.max_exp != null ? `Up to ${role.max_exp} yrs`
    : null;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
      {/* Status pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        <VisBadge visibility={role.visibility} />
        {role.job_type && <Pill>{role.job_type}</Pill>}
        {role.department && <Pill>{role.department}</Pill>}
        {exp && <Pill>{exp}</Pill>}
        {salary && <Pill>{salary}</Pill>}
      </div>

      {/* Meta grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px", marginBottom: 24 }}>
        {[
          ["Client", role.client],
          ["Company", role.company_name],
          ["Department", role.department],
          ["Job Type", role.job_type],
          ["Experience", exp],
          ["Salary", salary],
          ["Team Owner", role.team_name],
        ].filter(([, v]) => v).map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{k}</div>
            <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Skills */}
      {role.skills?.length > 0 && (
        <ViewSection title="Skills">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {role.skills.map(s => (
              <span key={s} style={{
                padding: "3px 10px", fontSize: "12px",
                background: "var(--bg-raised)", color: "var(--text-secondary)",
                border: "1px solid var(--border-default)", borderRadius: "999px",
              }}>{s}</span>
            ))}
          </div>
        </ViewSection>
      )}

      {role.description && (
        <ViewSection title="Job Description">
          <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{role.description}</div>
        </ViewSection>
      )}
      {role.about_company && (
        <ViewSection title="About Company">
          <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{role.about_company}</div>
        </ViewSection>
      )}
    </div>
  );
}

// ── Edit mode ─────────────────────────────────────────────────────────────────

function EditBody({ role, onSaved, onCancel }) {
  const [clients,    setClients]    = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState(null);

  // Form state — seeded from role
  const [title,        setTitle]        = useState(role.title || "");
  const [description,  setDescription]  = useState(role.description || "");
  const [department,   setDepartment]   = useState(role.department || "");
  const [jobType,      setJobType]      = useState(role.job_type || "");
  const [minExp,       setMinExp]       = useState(role.min_exp ?? "");
  const [maxExp,       setMaxExp]       = useState(role.max_exp ?? "");
  const [minSalary,    setMinSalary]    = useState(role.min_salary ?? "");
  const [maxSalary,    setMaxSalary]    = useState(role.max_salary ?? "");
  const [companyName,  setCompanyName]  = useState(role.company_name || "");
  const [aboutCompany, setAboutCompany] = useState(role.about_company || "");
  const [visibility,   setVisibility]   = useState(role.visibility || "internal");
  const [skills,       setSkills]       = useState(role.skills || []);
  const [skillInput,   setSkillInput]   = useState("");

  useEffect(() => {
    fetchClients().then(setClients).catch(() => {});
    fetchRecruiters().then(setRecruiters).catch(() => {});
  }, []);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s]);
    setSkillInput("");
  };

  const handleSave = async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true); setError(null);
    try {
      const updated = await updateRole(role.id, {
        title: title.trim(),
        description:   description   || null,
        department:    department    || null,
        job_type:      jobType       || null,
        min_exp:       minExp !== "" ? parseFloat(minExp)   : null,
        max_exp:       maxExp !== "" ? parseFloat(maxExp)   : null,
        min_salary:    minSalary !== "" ? parseInt(minSalary) : null,
        max_salary:    maxSalary !== "" ? parseInt(maxSalary) : null,
        company_name:  companyName   || null,
        about_company: aboutCompany  || null,
        visibility,
        skills: skills.length ? skills : null,
      });
      onSaved(updated);
    } catch (e) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
        {error && <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid var(--danger)", borderRadius: "var(--radius-md)", color: "var(--danger)", fontSize: "12px", marginBottom: 16 }}>{error}</div>}

        <EField label="Job Title *">
          <input value={title} onChange={e => setTitle(e.target.value)} style={inp} />
        </EField>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 14px" }}>
          <EField label="Department">
            <input value={department} onChange={e => setDepartment(e.target.value)} style={inp} />
          </EField>
          <EField label="Job Type">
            <select value={jobType} onChange={e => setJobType(e.target.value)} style={inp}>
              <option value="">— none —</option>
              {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </EField>
          <EField label="Min Experience (yrs)">
            <input type="number" value={minExp} onChange={e => setMinExp(e.target.value)} min="0" max="50" style={inp} />
          </EField>
          <EField label="Max Experience (yrs)">
            <input type="number" value={maxExp} onChange={e => setMaxExp(e.target.value)} min="0" max="50" style={inp} />
          </EField>
          <EField label="Min Salary">
            <input type="number" value={minSalary} onChange={e => setMinSalary(e.target.value)} min="0" style={inp} />
          </EField>
          <EField label="Max Salary">
            <input type="number" value={maxSalary} onChange={e => setMaxSalary(e.target.value)} min="0" style={inp} />
          </EField>
        </div>

        <EField label="Company Name">
          <input value={companyName} onChange={e => setCompanyName(e.target.value)} style={inp} />
        </EField>

        {/* Skills */}
        <EField label="Skills">
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            {skills.map(s => (
              <span key={s} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "2px 8px", fontSize: "12px",
                background: "var(--bg-overlay)", border: "1px solid var(--border-default)",
                borderRadius: "999px", color: "var(--text-secondary)",
              }}>
                {s}
                <button onClick={() => setSkills(prev => prev.filter(x => x !== s))} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 13, lineHeight: 1, padding: "0 1px" }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={skillInput} onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); }}}
              placeholder="Type skill and press Enter"
              style={{ ...inp, flex: 1 }}
            />
            <button onClick={addSkill} style={{ padding: "6px 12px", background: "var(--bg-overlay)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontSize: 12, color: "var(--text-secondary)" }}>Add</button>
          </div>
        </EField>

        {/* Visibility */}
        <EField label="Visibility">
          <div style={{ display: "flex", gap: 8 }}>
            {VIS_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setVisibility(o.value)} style={{
                flex: 1, padding: "8px 6px", fontSize: "12px", fontWeight: visibility === o.value ? 600 : 400,
                background: visibility === o.value ? "var(--bg-overlay)" : "transparent",
                border: visibility === o.value ? `1px solid ${VIS_COLOR[o.value]}` : "1px solid var(--border-default)",
                color: visibility === o.value ? VIS_COLOR[o.value] : "var(--text-muted)",
                borderRadius: "var(--radius-md)", transition: "all 0.15s",
              }}>{o.label}</button>
            ))}
          </div>
        </EField>

        <EField label="Job Description">
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            rows={5} style={{ ...inp, resize: "vertical", minHeight: 80 }} />
        </EField>

        <EField label="About Company">
          <textarea value={aboutCompany} onChange={e => setAboutCompany(e.target.value)}
            rows={4} style={{ ...inp, resize: "vertical", minHeight: 60 }} />
        </EField>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: "1px solid var(--border-subtle)", padding: "12px 22px",
        display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0,
      }}>
        <button onClick={onCancel} style={ghostBtnS}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{
          padding: "7px 18px", background: saving ? "var(--bg-overlay)" : "var(--accent)",
          color: saving ? "var(--text-muted)" : "#fff", border: "none",
          borderRadius: "var(--radius-md)", fontSize: "13px", fontWeight: 600,
        }}>{saving ? "Saving…" : "Save Changes"}</button>
      </div>
    </>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function ViewSection({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function EField({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: 5, letterSpacing: "0.03em" }}>{label}</label>
      {children}
    </div>
  );
}

function Pill({ children }) {
  return (
    <span style={{
      padding: "3px 10px", fontSize: "12px",
      background: "var(--bg-raised)", color: "var(--text-secondary)",
      border: "1px solid var(--border-default)", borderRadius: "999px",
    }}>{children}</span>
  );
}

function VisBadge({ visibility }) {
  const map = {
    published: { bg: "rgba(34,197,94,0.12)",  color: "#22c55e", label: "Published" },
    internal:  { bg: "rgba(37,99,235,0.12)",  color: "#2563eb", label: "Internal"  },
    closed:    { bg: "rgba(107,114,128,0.12)", color: "#6b7280", label: "Closed"    },
  };
  const c = map[visibility] || map.internal;
  return (
    <span style={{ padding: "3px 10px", fontSize: "12px", fontWeight: 600, background: c.bg, color: c.color, borderRadius: "999px" }}>
      {c.label}
    </span>
  );
}

function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ background: "transparent", border: "none", fontSize: "20px", color: "var(--text-muted)", padding: "2px 4px" }}
      onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
      onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
    >×</button>
  );
}

const inp = {
  display: "block", width: "100%", padding: "7px 10px",
  background: "var(--bg-raised)", color: "var(--text-primary)",
  border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
  fontSize: "13px", outline: "none", boxSizing: "border-box",
};
const ghostBtnS = {
  padding: "7px 16px", background: "transparent", color: "var(--text-secondary)",
  border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
  fontSize: "13px", fontWeight: 500,
};