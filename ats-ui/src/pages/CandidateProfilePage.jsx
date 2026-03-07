import { useEffect, useMemo, useState } from "react";
import {
  fetchCandidate,
  fetchCandidateApplications,
  resolveFileUrl,
  updateApplicationStage,
} from "../api";
import CandidatePanel from "../components/CandidatePanel";
import { css } from "../components/styles";

export default function CandidateProfilePage({ candidateId, onBack }) {
  const [candidate, setCandidate] = useState(null);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    if (!candidateId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchCandidate(candidateId),
      fetchCandidateApplications(candidateId, { limit: 200 }),
    ])
      .then(([cand, appPayload]) => {
        if (!cand) {
          setError("Candidate not found");
          setCandidate(null);
          setApps([]);
          return;
        }
        setCandidate(cand);
        setApps(appPayload?.items || []);
      })
      .catch(() => setError("Could not load candidate profile"))
      .finally(() => setLoading(false));
  }, [candidateId]);

  const openApp = (app) => {
    if (!candidate) return;
    setSelectedApp({
      ...app,
      candidate_id: candidate.id,
      candidate_name: candidate.full_name,
      email: candidate.email,
    });
  };

  const handleStageChange = (applicationId, newStage, substageId = null) => {
    const snap = apps;
    const next = snap.map((a) =>
      a.application_id === applicationId
        ? { ...a, stage: newStage, substage_id: substageId ?? null, substage_name: null }
        : a
    );
    setApps(next);
    setSelectedApp((prev) =>
      prev?.application_id === applicationId
        ? { ...prev, stage: newStage, substage_id: substageId ?? null, substage_name: null }
        : prev
    );
    updateApplicationStage(applicationId, newStage, substageId).catch(() => {
      setApps(snap);
      setError("Failed to update stage");
    });
  };

  const appCountLabel = useMemo(() => {
    const total = apps.length;
    return total === 1 ? "1 application" : `${total} applications`;
  }, [apps.length]);

  return (
    <div style={{ minHeight: "calc(100vh - 52px)", background: "var(--bg-base)", padding: "28px 32px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <button
            onClick={onBack}
            style={{ ...css.ghostBtn, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span>←</span>
            <span>Back</span>
          </button>
        </div>

        {loading && <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading candidate profile...</div>}
        {!loading && error && <div style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</div>}

        {!loading && !error && candidate && (
          <>
            <section
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                padding: "18px 20px",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: "19px", letterSpacing: "-0.02em" }}>{candidate.full_name}</h1>
                  <div style={{ marginTop: "4px", color: "var(--text-secondary)", fontSize: "13px" }}>
                    {candidate.email || "No email"}
                  </div>
                  {candidate.phone && (
                    <div style={{ marginTop: "4px", color: "var(--text-muted)", fontSize: "12px" }}>
                      {candidate.phone}
                    </div>
                  )}
                  {candidate.linkedin_url && (
                    <a
                      href={candidate.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ marginTop: "5px", display: "inline-block", color: "var(--accent)", fontSize: "12px" }}
                    >
                      LinkedIn
                    </a>
                  )}
                </div>
                {candidate.resume_url && (
                  <a
                    href={resolveFileUrl(candidate.resume_url)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      ...css.primaryBtn,
                      textDecoration: "none",
                      padding: "7px 14px",
                      lineHeight: 1.2,
                    }}
                  >
                    Open Resume
                  </a>
                )}
              </div>
            </section>

            <section
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border-subtle)",
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                }}
              >
                Applications Across Roles · {appCountLabel}
              </div>

              {apps.length === 0 && (
                <div style={{ padding: "20px 16px", fontSize: "13px", color: "var(--text-muted)" }}>
                  No applications found for this candidate.
                </div>
              )}

              {apps.length > 0 && (
                <div>
                  {apps.map((app, idx) => (
                    <button
                      key={app.application_id}
                      onClick={() => openApp(app)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        borderBottom: idx === apps.length - 1 ? "none" : "1px solid var(--border-subtle)",
                        background: "transparent",
                        padding: "12px 16px",
                        display: "grid",
                        gridTemplateColumns: "2fr 1.2fr 1fr 1fr",
                        gap: "8px",
                        cursor: "pointer",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{app.role_title}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: 2 }}>{app.client}</div>
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                        <div>{app.stage || "—"}</div>
                        {app.substage_name && <div style={{ color: "var(--text-muted)", marginTop: 2 }}>{app.substage_name}</div>}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{app.assigned_recruiter || "—"}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {app.created_at ? new Date(app.created_at).toLocaleDateString() : "—"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <CandidatePanel
        key={selectedApp?.application_id ?? "none"}
        application={selectedApp}
        roleId={selectedApp?.role_id}
        onClose={() => setSelectedApp(null)}
        onStageChange={handleStageChange}
      />
    </div>
  );
}
