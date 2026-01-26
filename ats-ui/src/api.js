const BASE_URL = "http://127.0.0.1:8000";


function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

function handleAuthError(res) {
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.reload();
  }
}


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
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ stage })   
    }
  );
  if (res.status === 401) {
      handleAuthError(res);
      return;
    }

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

export async function addComment(applicationId, comment) {
  const res = await fetch(
    `http://127.0.0.1:8000/applications/${applicationId}/comments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        comment
      })
    }
  );
  
  if (res.status === 401) {
      handleAuthError(res);
      return;
    }

  if (!res.ok) {
    throw new Error("Failed to add comment");
  }

  return res.json();
}



export async function login(email, password) {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);

  const res = await fetch("http://127.0.0.1:8000/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form
  });

  if (!res.ok) {
    throw new Error("Invalid credentials");
  }

  return res.json();
}


export async function createCandidate(formData) {
  const res = await fetch("http://127.0.0.1:8000/candidates", {
    method: "POST",
    headers: {
      ...getAuthHeaders()
    },
    body: formData
  });

  if (res.status === 409) {
    return res.json();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create candidate");
  }

  return res.json();
}

export async function createApplication(candidateId, roleId) {
  const res = await fetch("http://127.0.0.1:8000/applications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify({
      candidate_id: candidateId,
      role_id: roleId,
      recruiter_id: 5 // TEMP — logged-in user later
    })
  });

  if (res.status === 401) {
    handleAuthError(res);
    return;
  }

  if (!res.ok) {
    throw new Error("Failed to create application");
  }

  return res.json();
}
