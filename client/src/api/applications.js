const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(API_BASE + "/api/applications" + path, {
      credentials: "include",
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error("Could not connect to HireHub. Make sure the backend is running.");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.success) {
    const error = new Error(body.message || "Application request failed.");
    error.status = response.status;
    throw error;
  }
  return body.data;
}

export async function fetchMyApplications() {
  return request("/mine");
}

export async function applyToJob(jobId, coverLetter) {
  return request("/" + encodeURIComponent(jobId), {
    method: "POST",
    body: JSON.stringify({ coverLetter }),
  });
}

export async function withdrawApplication(applicationId) {
  return request("/" + encodeURIComponent(applicationId), { method: "DELETE" });
}

export async function deleteWithdrawnApplication(applicationId) {
  return request("/history/" + encodeURIComponent(applicationId), { method: "DELETE" });
}