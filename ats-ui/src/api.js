// src/api.js
const BASE_URL = "/api"; // Proxy to backend in development; set to actual API URL in production

// Resolve a file path from the API to a full URL.
// The backend may return a relative path like "/files/resume.pdf".
// Using it directly as href or iframe src would resolve to the React dev
// server instead of the API. Always prefix with BASE_URL when not absolute.
export function resolveFileUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

// function getAuthHeaders() {
//   const token = localStorage.getItem("token");
//   return token ? { Authorization: `Bearer ${token}` } : {};
// }

// function handleAuthError(res) {
//   if (res.status === 401) {
//     localStorage.removeItem("token");
//     window.location.reload();
//   }
// }

// async function apiFetch(path, options = {}) {
//   const res = await fetch(`${BASE_URL}${path}`, {
//     ...options,
//     headers: { ...getAuthHeaders(), ...(options.headers || {}) },
//   });
//   if (res.status === 401) { handleAuthError(res); return null; }
//   if (!res.ok) {
//     const err = await res.json().catch(() => ({}));
//     throw new Error(err.detail || `Request failed: ${path}`);
//   }
//   if (res.status === 204) return null;
//   return res.json();
// }


// ── Silent refresh ────────────────────────────────────────────────────────────

const TOKEN_TTL_MS       = 60 * 60 * 1000;   // 60 min — must match backend
const PROACTIVE_OFFSET   = 15 * 60 * 1000;   // fire 15 min before expiry
let   _refreshTimer      = null;
let   _isRefreshing      = false;
let   _refreshPromise    = null;

export function scheduleRefresh() {
  clearTimeout(_refreshTimer);
  _refreshTimer = setTimeout(async () => {
    try {
      await doRefresh();
      scheduleRefresh();   // reschedule after successful rotation
    } catch {
      // refresh failed — let the next real request trigger auth:expired
    }
  }, TOKEN_TTL_MS - PROACTIVE_OFFSET);  // fires at 45 min mark
}

async function doRefresh() {
  if (_isRefreshing) return _refreshPromise;
  _isRefreshing = true;
  _refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  }).finally(() => {
    _isRefreshing = false;
    _refreshPromise = null;
  });
  const res = await _refreshPromise;
  if (!res.ok) throw new Error("Refresh failed");
}

// ── Core fetch ────────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}, isRetry = false) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { ...(options.headers || {}) },
  });

  if (res.status === 401) {
    if (!isRetry) {
      // One silent refresh attempt before giving up
      try {
        await doRefresh();
        return apiFetch(path, options, true);   // replay original request
      } catch {
        // refresh also failed — session is truly expired
      }
    }
    window.dispatchEvent(new CustomEvent("auth:expired"));
    return null;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed: ${path}`);
  }
  if (res.status === 204) return null;
  return res.json();
}    


















// async function apiFetch(path, options = {}) {
//   const res = await fetch(`${BASE_URL}${path}`, {
//     ...options,
//     credentials: "include",          // ← sends the httpOnly cookie automatically
//     headers: { ...(options.headers || {}) },
//   });
//   if (res.status === 401) {
//     window.dispatchEvent(new CustomEvent("auth:expired"));
//     return null;
//       // cookie expired/missing → back to login
//   }
//   if (!res.ok) {
//     const err = await res.json().catch(() => ({}));
//     throw new Error(err.detail || `Request failed: ${path}`);
//   }
//   if (res.status === 204) return null;
//   return res.json();
// }





// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(email, password) {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    credentials: "include",          // ← cookie set on this response
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json();
}

export const logout  = () => apiFetch("/auth/logout",  { method: "POST" });
export const refresh = () => apiFetch("/auth/refresh", { method: "POST" });
export const fetchMe = () => apiFetch("/auth/me");
export const changePassword = (currentPassword, newPassword) =>
  apiFetch("/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });

export function cancelRefresh() {
  clearTimeout(_refreshTimer);
}


// ── Lookup data ───────────────────────────────────────────────────────────────

export const fetchRecruiters = () => apiFetch("/recruiters");
export const fetchClients    = () => apiFetch("/clients");
export const createClient    = (name) => apiFetch("/clients", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name }),
});
export const updateClient    = (id, name) => apiFetch(`/clients/${id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name }),
});

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
export const updateRole = (roleId, body) =>
  apiFetch(`/roles/${roleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const updateVisibility = (roleId, visibility) =>
  apiFetch(`/roles/${roleId}/visibility`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visibility }),
  });

// ── User management ──────────────────────────────────────────────────────────

export function fetchUsers({ search, roleId, status } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (roleId) params.set("role_id", roleId);
  if (status) params.set("status", status);
  return apiFetch(`/users${params.toString() ? `?${params.toString()}` : ""}`);
}

export const createUser = (body) =>
  apiFetch("/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const updateUser = (userId, body) =>
  apiFetch(`/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const deleteUser = (userId) =>
  apiFetch(`/users/${userId}`, { method: "DELETE" });

export const fetchUserRoles = () => apiFetch("/user-roles");

export const createUserRole = (body) =>
  apiFetch("/user-roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const updateUserRole = (roleId, body) =>
  apiFetch(`/user-roles/${roleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const deleteUserRole = (roleId) =>
  apiFetch(`/user-roles/${roleId}`, { method: "DELETE" });

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
    credentials: "include",
    body: formData,
  });
  if (res.status === 401) { 
    window.dispatchEvent(new CustomEvent("auth:expired"));
    return null; 
  }
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

