// candidate/OverviewTab.jsx
// Overview tab content: role details summary + ownership editor.

import { Section, Row, SmallSelect, Btn, fmt } from "./shared";
import { resolveFileUrl } from "../../api";

export default function OverviewTab({
  application,
  candidate,
  substages,
  localSubstage,
  localOwnership,
  recruiters,
  ownerEdit,
  newCandOwner,
  newAssigned,
  savingOwner,
  ownerError,
  showResume,
  onStartEdit,
  onCancelEdit,
  onNewCandOwner,
  onNewAssigned,
  onSaveOwnership,
  onShowResume,
}) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>

      {/* ── Role details ── */}
      <Section title="Role Details">
        <Row label="Recruiter">{application.recruiter ?? "—"}</Row>
        <Row label="Candidate Owner">{localOwnership.candidate_owner ?? "—"}</Row>
        <Row label="Assigned To">{localOwnership.assigned_recruiter ?? "—"}</Row>
        {(localSubstage || application.substage_name) && (
          <Row label="Sub-stage">
            {substages.find((s) => s.id === localSubstage)?.name ?? application.substage_name ?? "—"}
          </Row>
        )}
      </Section>

      {/* ── Ownership editor ── */}
      {!ownerEdit ? (
        <button
          onClick={onStartEdit}
          style={{
            fontSize: "12px", color: "var(--accent)", background: "transparent",
            border: "1px solid var(--accent)", borderRadius: "var(--radius-sm)",
            padding: "4px 10px", marginBottom: "20px",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-muted)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
        >
          Edit Ownership
        </button>
      ) : (
        <div style={{
          background: "var(--bg-raised)", border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)", padding: "14px", marginBottom: "20px",
        }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "10px" }}>
            Update Ownership
          </div>
          <SmallSelect
            label="Candidate Owner"
            value={newCandOwner}
            onChange={onNewCandOwner}
            options={recruiters}
          />
          <SmallSelect
            label="Assigned Recruiter"
            value={newAssigned}
            onChange={onNewAssigned}
            options={recruiters}
          />
          {ownerError && (
            <div style={{ fontSize: "12px", color: "var(--danger)", marginBottom: "8px" }}>
              {ownerError}
            </div>
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <Btn onClick={onSaveOwnership} disabled={savingOwner} size="sm">
              {savingOwner ? "Saving…" : "Save"}
            </Btn>
            <Btn variant="ghost" size="sm" onClick={onCancelEdit}>
              Cancel
            </Btn>
          </div>
        </div>
      )}

      {/* ── Candidate info ── */}
      <Section title="Candidate Info">
        {candidate?.phone && <Row label="Phone">{candidate.phone}</Row>}
        {candidate?.linkedin_url && (
          <Row label="LinkedIn">
            <a
              href={candidate.linkedin_url}
              target="_blank" rel="noreferrer"
              style={{ color: "var(--accent)", fontSize: "12px" }}
            >
              View Profile →
            </a>
          </Row>
        )}
        {candidate?.resume_url && (
          <Row label="Resume">
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                onClick={onShowResume}
                style={{
                  fontSize: "12px", color: "var(--accent)", background: "transparent",
                  border: "1px solid var(--accent)", borderRadius: "var(--radius-sm)",
                  padding: "2px 8px",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-muted)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                Preview
              </button>
              <a
                href={resolveFileUrl(candidate.resume_url)}
                target="_blank" rel="noreferrer" download
                style={{
                  fontSize: "12px", color: "var(--text-secondary)",
                  background: "var(--bg-overlay)", border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)", padding: "2px 8px", textDecoration: "none",
                }}
              >
                ↓ Download
              </a>
            </div>
          </Row>
        )}
        <Row label="Added">{fmt(application.created_at)}</Row>
      </Section>
    </div>
  );
}