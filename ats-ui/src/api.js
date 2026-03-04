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

// ── Roles ─────────────────────────────────────────────────────────────────────

/**
 * Fetches a page of roles.
 * @param {string|null} status  - "open" | "closed" | null
 * @param {number}      limit   - page size (default 50)
 * @param {number|null} cursor  - role_id to paginate from (from previous next_cursor)
 * @returns {{ items: Role[], next_cursor: number|null }}
 */
export async function fetchRoles(status, limit = 50, cursor = null) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("limit", limit);
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`${BASE_URL}/roles?${params}`);
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json(); // { items, next_cursor }
}

// ── Stages ────────────────────────────────────────────────────────────────────

export async function fetchStages(roleId) {
  const res = await fetch(`${BASE_URL}/roles/${roleId}/stages`);
  if (!res.ok) throw new Error("Failed to fetch stages");
  return res.json(); // [{ name, position }, ...]
}

// ── Applications ──────────────────────────────────────────────────────────────

/**
 * Fetches a page of applications for a role.
 * @param {number}      roleId
 * @param {number}      limit   - page size (default 200 — fits entire Kanban board)
 * @param {number|null} cursor  - application_id to paginate from
 * @returns {{ items: Application[], next_cursor: number|null }}
 */
export async function fetchApplications(roleId, limit = 200, cursor = null) {
  const params = new URLSearchParams();
  params.set("limit", limit);
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`${BASE_URL}/roles/${roleId}/applications?${params}`);
  if (!res.ok) throw new Error("Failed to fetch applications");
  return res.json(); // { items, next_cursor }
}

export async function updateApplicationStage(applicationId, stage) {
  const res = await fetch(
    `${BASE_URL}/applications/${applicationId}/stage`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ stage }),
    }
  );
  if (res.status === 401) { handleAuthError(res); return; }
  if (!res.ok) throw new Error("Failed to update stage");
  return res.json();
}

// ── Comments ──────────────────────────────────────────────────────────────────

export async function fetchComments(applicationId) {
  const res = await fetch(`${BASE_URL}/applications/${applicationId}/comments`);
  if (!res.ok) throw new Error("Failed to fetch comments");
  return res.json();
}

export async function addComment(applicationId, comment) {
  const res = await fetch(
    `${BASE_URL}/applications/${applicationId}/comments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ comment }),
    }
  );
  if (res.status === 401) { handleAuthError(res); return; }
  if (!res.ok) throw new Error("Failed to add comment");
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

// ── Candidates ────────────────────────────────────────────────────────────────

export async function createCandidate(formData) {
  const res = await fetch(`${BASE_URL}/candidates`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create candidate");
  }
  return res.json();
}

export async function createApplication(candidateId, roleId) {
  const res = await fetch(`${BASE_URL}/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ candidate_id: candidateId, role_id: roleId }),
  });
  if (res.status === 401) { handleAuthError(res); return; }
  if (!res.ok) throw new Error("Failed to create application");
  return res.json();
}