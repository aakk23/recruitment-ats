// src/api.js
const BASE_URL = "http://127.0.0.1:8000";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleAuthError(res) {
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.reload();
  }
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) },
  });
  if (res.status === 401) { handleAuthError(res); return null; }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed: ${path}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(email, password) {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json();
}

export const fetchMe = () => apiFetch("/auth/me");

// ── Lookup data ───────────────────────────────────────────────────────────────

export const fetchRecruiters = () => apiFetch("/recruiters");
export const fetchClients    = () => apiFetch("/clients");

// ── Roles ─────────────────────────────────────────────────────────────────────

export function fetchRoles(status, limit = 50, cursor = null, visibility = null) {
  const params = new URLSearchParams();
  if (status)     params.set("status", status);
  if (visibility) params.set("visibility", visibility);
  if (cursor)     params.set("cursor", cursor);
  params.set("limit", limit);
  return apiFetch(`/roles?${params}`);
}

export const fetchRole      = (roleId) => apiFetch(`/roles/${roleId}`);
export const createRole     = (body)   => apiFetch("/roles", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
export const updateVisibility = (roleId, visibility) =>
  apiFetch(`/roles/${roleId}/visibility`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visibility }),
  });

// ── Stages & substages ────────────────────────────────────────────────────────

export const fetchStages = (roleId) => apiFetch(`/roles/${roleId}/stages`);

export const createStage = (roleId, name, position) =>
  apiFetch(`/roles/${roleId}/stages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, position }),
  });

export const createSubstage = (stageId, name, position = 0) =>
  apiFetch(`/stages/${stageId}/substages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, position }),
  });

export const deleteSubstage = (substageId) =>
  apiFetch(`/substages/${substageId}`, { method: "DELETE" });

// ── Candidates ────────────────────────────────────────────────────────────────

export async function createCandidate(formData) {
  const res = await fetch(`${BASE_URL}/candidates`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  if (res.status === 401) { handleAuthError(res); return null; }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create candidate");
  }
  return res.json();
}

export async function fetchCandidate(candidateId) {
  if (!candidateId) return null;
  try {
    return await apiFetch(`/candidates/${candidateId}`);
  } catch { return null; }
}

// ── Applications ──────────────────────────────────────────────────────────────

export function fetchApplications(roleId, { stage, search, limit = 50, cursor } = {}) {
  const params = new URLSearchParams();
  if (stage)  params.set("stage", stage);
  if (search) params.set("search", search);
  if (cursor) params.set("cursor", cursor);
  params.set("limit", limit);
  return apiFetch(`/roles/${roleId}/applications?${params}`);
}

export const createApplication = (candidateId, roleId, resumeFilename = null) =>
  apiFetch("/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      candidate_id: candidateId,
      role_id: roleId,
      ...(resumeFilename ? { resume_filename: resumeFilename } : {}),
    }),
  });

export const updateApplicationStage = (applicationId, stage, substageId = null) =>
  apiFetch(`/applications/${applicationId}/stage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage, ...(substageId ? { substage_id: substageId } : {}) }),
  });

export const updateOwnership = (applicationId, body) =>
  apiFetch(`/applications/${applicationId}/ownership`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// ── Comments ──────────────────────────────────────────────────────────────────

export const fetchComments = (applicationId) =>
  apiFetch(`/applications/${applicationId}/comments`);

export const addComment = (applicationId, comment, isPrivate = false, taggedIds = []) =>
  apiFetch(`/applications/${applicationId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      comment,
      is_private: isPrivate,
      tagged_recruiter_ids: taggedIds,
    }),
  });

// ── Events ────────────────────────────────────────────────────────────────────

export const fetchEvents = (applicationId) =>
  apiFetch(`/applications/${applicationId}/events`);