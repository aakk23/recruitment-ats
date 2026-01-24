const BASE_URL = "http://127.0.0.1:8000";

export async function fetchRoles(status) {
  const url = status
    ? `${BASE_URL}/roles?status=${status}`
    : `${BASE_URL}/roles`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Failed to fetch roles");
  }

  return res.json();
}

export async function fetchApplications(roleId) {
  const res = await fetch(
    `http://127.0.0.1:8000/roles/${roleId}/applications`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch applications");
  }

  return res.json();
}

export async function updateApplicationStage(applicationId, stage) {
  const res = await fetch(
    `http://127.0.0.1:8000/applications/${applicationId}/stage`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ stage })
    }
  );

  if (!res.ok) {
    throw new Error("Failed to update stage");
  }

  return res.json();
}

export async function fetchComments(applicationId) {
  const res = await fetch(
    `http://127.0.0.1:8000/applications/${applicationId}/comments`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch comments");
  }

  return res.json();
}

export async function addComment(applicationId, recruiterId, comment) {
  const res = await fetch(
    `http://127.0.0.1:8000/applications/${applicationId}/comments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        recruiter_id: recruiterId,
        comment
      })
    }
  );

  if (!res.ok) {
    throw new Error("Failed to add comment");
  }

  return res.json();
}
