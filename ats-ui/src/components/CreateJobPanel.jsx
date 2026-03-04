// src/components/CreateJobPanel.jsx
// Multi-step slide-over panel for creating a job with full details + custom stages/substages.
import { useState, useEffect } from "react";
import { createRole, createStage, createSubstage, deleteSubstage, fetchClients, fetchRecruiters } from "../api";

const STEPS = ["Job Details", "Posting Info", "Stages"];
const JOB_TYPES = ["full-time", "part-time", "contract", "freelance", "internship"];
const VISIBILITY_OPTIONS = [
  { value: "internal",  label: "Internal",  desc: "Only visible to your team" },
  { value: "published", label: "Published", desc: "Visible on public career page" },
  { value: "closed",    label: "Closed",    desc: "Not accepting applications" },
];

// ── Default stages seeded for every new role ─────────────────────────────────
const DEFAULT_STAGES = [
  { name: "new",        position: 1, substages: [] },
  { name: "screening",  position: 2, substages: [] },
  { name: "interview",  position: 3, substages: [] },
  { name: "offered",    position: 4, substages: [] },
  { name: "hired",      position: 5, substages: [] },
  { name: "rejected",   position: 6, substages: [] },
];

export default function CreateJobPanel({ onClose, onCreated }) {
  const [step,       setStep]       = useState(0);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState(null);
  const [clients,    setClients]    = useState([]);
  const [recruiters, setRecruiters] = useState([]);

  // Step 1 — Job Details
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [skills,      setSkills]      = useState([]);   // string[]
  const [skillInput,  setSkillInput]  = useState("");

  // Step 2 — Posting Info
  const [clientId,     setClientId]     = useState("");
  const [department,   setDepartment]   = useState("");
  const [minExp,       setMinExp]       = useState("");
  const [maxExp,       setMaxExp]       = useState("");
  const [minSalary,    setMinSalary]    = useState("");
  const [maxSalary,    setMaxSalary]    = useState("");
  const [jobType,      setJobType]      = useState("");
  const [teamId,       setTeamId]       = useState("");
  const [companyName,  setCompanyName]  = useState("");
  const [aboutCompany, setAboutCompany] = useState("");
  const [visibility,   setVisibility]   = useState("internal");

  // Step 3 — Stages
  const [stages,       setStages]       = useState(DEFAULT_STAGES);
  const [newStageName, setNewStageName] = useState("");

  useEffect(() => {
    fetchClients().then(setClients).catch(() => {});
    fetchRecruiters().then(setRecruiters).catch(() => {});
  }, []);

  // ── Skills tag input ────────────────────────────────────────────────────────
  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills([...skills, s]);
    setSkillInput("");
  };
  const removeSkill = (s) => setSkills(skills.filter((x) => x !== s));

  // ── Stage management (local only — saved after role created) ────────────────
  const addStage = () => {
    const name = newStageName.trim().toLowerCase();
    if (!name || stages.find((s) => s.name === name)) return;
    setStages([...stages, { name, position: stages.length + 1, substages: [], _new: true }]);
    setNewStageName("");
  };
  const removeStage = (name) => setStages(stages.filter((s) => s.name !== name));

  const addSubstage = (stageName, subName) => {
    const trimmed = subName.trim();
    if (!trimmed) return;
    setStages(stages.map((s) =>
      s.name === stageName
        ? { ...s, substages: [...(s.substages || []), { name: trimmed, position: (s.substages || []).length, _new: true }] }
        : s
    ));
  };
  const removeSubstage = (stageName, subName) => {
    setStages(stages.map((s) =>
      s.name === stageName
        ? { ...s, substages: s.substages.filter((ss) => ss.name !== subName) }
        : s
    ));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!title.trim() || !clientId) { setError("Title and Client are required"); return; }
    setSaving(true);
    setError(null);
    try {
      const role = await createRole({
        title: title.trim(),
        client_id: parseInt(clientId),
        description:   description || null,
        department:    department   || null,
        min_exp:       minExp       ? parseFloat(minExp)   : null,
        max_exp:       maxExp       ? parseFloat(maxExp)   : null,
        min_salary:    minSalary    ? parseInt(minSalary)  : null,
        max_salary:    maxSalary    ? parseInt(maxSalary)  : null,
        job_type:      jobType      || null,
        company_name:  companyName  || null,
        about_company: aboutCompany || null,
        skills:        skills.length ? skills : null,
        visibility,
        team_id: teamId ? parseInt(teamId) : null,
      });

      // Create custom stages + substages
      for (const stage of stages) {
        let stageId = null;
        try {
          const created = await createStage(role.id, stage.name, stage.position);
          stageId = created.id;
        } catch { /* stage may already exist from defaults */ }

        if (stageId && stage.substages?.length) {
          for (const sub of stage.substages) {
            try { await createSubstage(stageId, sub.name, sub.position); } catch { /* ignore dup */ }
          }
        }
      }

      onCreated(role);
      onClose();
    } catch (e) {
      setError(e.message || "Failed to create job");
    } finally {
      setSaving(false);
    }
  };

  // Step 0→1: need title. Step 1→2: need client. Step 2→submit: always.
  const canAdvance = step === 0 ? title.trim().length > 0 : step === 1 ? !!clientId : true;
  const expValid = (!minExp || !maxExp) || parseFloat(minExp) <= parseFloat(maxExp);
  const salaryValid = (!minSalary || !maxSalary) || parseInt(minSalary) <= parseInt(maxSalary);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1200,
      display: "flex", alignItems: "stretch", justifyContent: "flex-end",
    }}>
      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "520px", maxWidth: "100vw",
        background: "var(--bg-surface)",
        borderLeft: "1px solid var(--border-subtle)",
        display: "flex", flexDirection: "column",
        boxShadow: "var(--shadow-lg)",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 24px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Create Job</h2>
            <CloseBtn onClick={onClose} />
          </div>
          {/* Step tabs */}
          <div style={{ display: "flex", gap: "0" }}>
            {STEPS.map((s, i) => (
              <button
                key={s}
                onClick={() => i < step || (i === step + 1 && canAdvance) ? setStep(i) : null}
                style={{
                  flex: 1, padding: "8px 4px", background: "transparent", border: "none",
                  borderBottom: step === i ? "2px solid var(--accent)" : "2px solid transparent",
                  color: step === i ? "var(--text-primary)" : i < step ? "var(--text-secondary)" : "var(--text-muted)",
                  fontSize: "13px", fontWeight: step === i ? 600 : 400,
                  transition: "all 0.15s",
                  cursor: i <= step ? "pointer" : "default",
                }}
              >
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: "18px", height: "18px", borderRadius: "50%", marginRight: "6px",
                  fontSize: "10px", fontWeight: 700,
                  background: i < step ? "var(--accent)" : i === step ? "var(--accent-muted)" : "var(--bg-overlay)",
                  color: i < step ? "#fff" : i === step ? "var(--accent)" : "var(--text-muted)",
                }}>
                  {i < step ? "✓" : i + 1}
                </span>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {step === 0 && <StepJobDetails
            title={title} setTitle={setTitle}
            description={description} setDescription={setDescription}
            skills={skills} skillInput={skillInput}
            setSkillInput={setSkillInput}
            addSkill={addSkill} removeSkill={removeSkill}
          />}
          {step === 1 && <StepPostingInfo
            clients={clients} recruiters={recruiters}
            clientId={clientId} setClientId={setClientId}
            department={department} setDepartment={setDepartment}
            minExp={minExp} setMinExp={setMinExp}
            maxExp={maxExp} setMaxExp={setMaxExp}
            minSalary={minSalary} setMinSalary={setMinSalary}
            maxSalary={maxSalary} setMaxSalary={setMaxSalary}
            jobType={jobType} setJobType={setJobType}
            teamId={teamId} setTeamId={setTeamId}
            companyName={companyName} setCompanyName={setCompanyName}
            aboutCompany={aboutCompany} setAboutCompany={setAboutCompany}
            visibility={visibility} setVisibility={setVisibility}
            expValid={expValid} salaryValid={salaryValid}
          />}
          {step === 2 && <StepStages
            stages={stages}
            newStageName={newStageName} setNewStageName={setNewStageName}
            addStage={addStage} removeStage={removeStage}
            addSubstage={addSubstage} removeSubstage={removeSubstage}
          />}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "14px 24px 20px",
          display: "flex", gap: "10px", justifyContent: "flex-end",
          flexShrink: 0,
        }}>
          {error && <span style={{ flex: 1, fontSize: "12px", color: "var(--danger)", alignSelf: "center" }}>{error}</span>}
          {step > 0 && (
            <Btn variant="ghost" onClick={() => setStep(step - 1)}>← Back</Btn>
          )}
          {step < STEPS.length - 1 ? (
            <Btn disabled={!canAdvance} onClick={() => setStep(step + 1)}>Next →</Btn>
          ) : (
            <Btn disabled={saving || !title.trim() || !clientId} onClick={handleCreate}>
              {saving ? "Creating…" : "Create Job"}
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Job Details ───────────────────────────────────────────────────────
function StepJobDetails({ title, setTitle, description, setDescription, skills, skillInput, setSkillInput, addSkill, removeSkill }) {
  return (
    <>
      <Field label="Job Title *">
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Senior Backend Engineer" style={inputStyle} autoFocus />
      </Field>
      <Field label="Job Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the role, responsibilities, and requirements…"
          style={{ ...inputStyle, minHeight: "160px", resize: "vertical" }} />
      </Field>
      <Field label="Skills">
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
            placeholder="Type a skill, press Enter"
            style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
          />
          <Btn onClick={addSkill} variant="ghost" style={{ flexShrink: 0 }}>Add</Btn>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {skills.map((s) => (
            <span key={s} style={skillChip}>
              {s}
              <button onClick={() => removeSkill(s)} style={chipX}>×</button>
            </span>
          ))}
        </div>
      </Field>
    </>
  );
}

// ── Step 2: Posting Info ──────────────────────────────────────────────────────
function StepPostingInfo({
  clients, recruiters,
  clientId, setClientId,
  department, setDepartment,
  minExp, setMinExp, maxExp, setMaxExp,
  minSalary, setMinSalary, maxSalary, setMaxSalary,
  jobType, setJobType,
  teamId, setTeamId,
  companyName, setCompanyName,
  aboutCompany, setAboutCompany,
  visibility, setVisibility,
  expValid, salaryValid,
}) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="Client *">
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={selectStyle}>
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Department">
          <input value={department} onChange={(e) => setDepartment(e.target.value)}
            placeholder="e.g. Engineering" style={inputStyle} />
        </Field>
        <Field label="Min Exp (yrs)">
          <input type="number" value={minExp} onChange={(e) => setMinExp(e.target.value)}
            placeholder="0" min="0" max="50" style={inputStyle} />
        </Field>
        <Field label="Max Exp (yrs)">
          <input type="number" value={maxExp} onChange={(e) => setMaxExp(e.target.value)}
            placeholder="10" min="0" max="50" style={inputStyle} />
          {!expValid && <div style={{fontSize:"11px",color:"var(--danger)",marginTop:"4px"}}>Max must be ≥ Min</div>}
        </Field>
        <Field label="Min Salary">
          <input type="number" value={minSalary} onChange={(e) => setMinSalary(e.target.value)}
            placeholder="500000" min="0" style={inputStyle} />
        </Field>
        <Field label="Max Salary">
          <input type="number" value={maxSalary} onChange={(e) => setMaxSalary(e.target.value)}
            placeholder="1200000" min="0" style={inputStyle} />
          {!salaryValid && <div style={{fontSize:"11px",color:"var(--danger)",marginTop:"4px"}}>Max must be ≥ Min</div>}
        </Field>
        <Field label="Job Type">
          <select value={jobType} onChange={(e) => setJobType(e.target.value)} style={selectStyle}>
            <option value="">Select type…</option>
            {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Team / Role Owner">
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} style={selectStyle}>
            <option value="">Select recruiter…</option>
            {recruiters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Company Name">
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Corp" style={inputStyle} />
        </Field>
      </div>

      <Field label="About Company">
        <textarea value={aboutCompany} onChange={(e) => setAboutCompany(e.target.value)}
          placeholder="Brief description of the company…"
          style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} />
      </Field>

      <Field label="Visibility">
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {VISIBILITY_OPTIONS.map((opt) => (
            <label key={opt.value} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 12px",
              background: visibility === opt.value ? "var(--accent-muted)" : "var(--bg-raised)",
              border: `1px solid ${visibility === opt.value ? "var(--accent)" : "var(--border-default)"}`,
              borderRadius: "var(--radius-md)", cursor: "pointer",
              transition: "all 0.15s",
            }}>
              <input type="radio" name="visibility" value={opt.value}
                checked={visibility === opt.value}
                onChange={() => setVisibility(opt.value)}
                style={{ accentColor: "var(--accent)" }} />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600 }}>{opt.label}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </Field>
    </>
  );
}

// ── Step 3: Stages ────────────────────────────────────────────────────────────
function StepStages({ stages, newStageName, setNewStageName, addStage, removeStage, addSubstage, removeSubstage }) {
  const [expandedStage,  setExpandedStage]  = useState(null);
  const [subInputs,      setSubInputs]      = useState({});

  return (
    <>
      <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px", marginTop: 0 }}>
        Default stages are pre-loaded. Add custom stages and substages for this role.
      </p>

      {stages.map((stage) => (
        <div key={stage.name} style={{
          background: "var(--bg-raised)", border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)", marginBottom: "8px", overflow: "hidden",
        }}>
          {/* Stage header */}
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "10px 14px", cursor: "pointer",
          }} onClick={() => setExpandedStage(expandedStage === stage.name ? null : stage.name)}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", flex: 0, minWidth: "14px" }}>
              {expandedStage === stage.name ? "▼" : "▶"}
            </span>
            <span style={{ flex: 1, fontSize: "13px", fontWeight: 600, textTransform: "capitalize" }}>
              {stage.name}
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              {(stage.substages || []).length} substage{(stage.substages || []).length !== 1 ? "s" : ""}
            </span>
            {stage._new && (
              <button
                onClick={(e) => { e.stopPropagation(); removeStage(stage.name); }}
                style={{ background: "transparent", border: "none", color: "var(--danger)", fontSize: "16px", cursor: "pointer", padding: "0 2px" }}
              >×</button>
            )}
          </div>

          {/* Substage area */}
          {expandedStage === stage.name && (
            <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "12px 14px" }}>
              {(stage.substages || []).map((ss) => (
                <div key={ss.name} style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "5px 10px", marginBottom: "4px",
                  background: "var(--bg-overlay)", borderRadius: "var(--radius-sm)",
                }}>
                  <span style={{ flex: 1, fontSize: "12px" }}>{ss.name}</span>
                  <button
                    onClick={() => removeSubstage(stage.name, ss.name)}
                    style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "14px" }}
                  >×</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <input
                  value={subInputs[stage.name] || ""}
                  onChange={(e) => setSubInputs({ ...subInputs, [stage.name]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addSubstage(stage.name, subInputs[stage.name] || "");
                      setSubInputs({ ...subInputs, [stage.name]: "" });
                    }
                  }}
                  placeholder="Add substage, press Enter"
                  style={{ ...inputStyle, flex: 1, marginBottom: 0, fontSize: "12px", padding: "6px 10px" }}
                />
                <Btn variant="ghost" onClick={() => {
                  addSubstage(stage.name, subInputs[stage.name] || "");
                  setSubInputs({ ...subInputs, [stage.name]: "" });
                }} style={{ fontSize: "12px", padding: "6px 12px" }}>
                  + Add
                </Btn>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add custom stage */}
      <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
        <input
          value={newStageName}
          onChange={(e) => setNewStageName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addStage(); }}
          placeholder="New stage name…"
          style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
        />
        <Btn onClick={addStage} disabled={!newStageName.trim()}>+ Stage</Btn>
      </div>
    </>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{
        display: "block", fontSize: "12px", fontWeight: 600,
        color: "var(--text-secondary)", marginBottom: "6px", letterSpacing: "0.02em",
      }}>{label}</label>
      {children}
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = "primary", style: s = {} }) {
  const isPrimary = variant === "primary";
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "8px 18px",
        background: disabled ? "var(--bg-overlay)" : isPrimary ? "var(--accent)" : "var(--bg-raised)",
        color: disabled ? "var(--text-muted)" : isPrimary ? "#fff" : "var(--text-secondary)",
        border: isPrimary ? "none" : "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        fontSize: "13px", fontWeight: 600,
        transition: "background 0.15s",
        ...s,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = isPrimary ? "var(--accent-hover)" : "var(--bg-overlay)"; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = isPrimary ? "var(--accent)" : "var(--bg-raised)"; }}
    >
      {children}
    </button>
  );
}

function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      background: "transparent", border: "none", fontSize: "20px",
      color: "var(--text-muted)", cursor: "pointer", padding: "2px 4px", borderRadius: "4px",
    }}
      onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
      onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
    >×</button>
  );
}

const inputStyle = {
  display: "block", width: "100%", padding: "9px 12px",
  background: "var(--bg-raised)", color: "var(--text-primary)",
  border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
  fontSize: "14px", outline: "none", boxSizing: "border-box",
  marginBottom: 0,
  transition: "border-color 0.15s, box-shadow 0.15s",
};
const selectStyle = { ...inputStyle, cursor: "pointer" };
const skillChip = {
  display: "inline-flex", alignItems: "center", gap: "4px",
  padding: "3px 10px 3px 10px",
  background: "var(--accent-muted)", color: "var(--accent)",
  border: "1px solid var(--accent)", borderRadius: "999px",
  fontSize: "12px", fontWeight: 500,
};
const chipX = {
  background: "transparent", border: "none",
  color: "var(--accent)", cursor: "pointer",
  fontSize: "14px", padding: "0 0 0 2px", lineHeight: 1,
};