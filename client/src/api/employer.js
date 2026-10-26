const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(API_BASE + "/api" + path, {
      credentials: "include",
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error("Could not connect to HireHub. Make sure the backend is running.");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.success) throw new Error(body.message || "Request failed.");
  return body.data;
}

export const fetchEmployerJobs = () => request("/jobs/mine");
export const createJob = (job) => request("/jobs", { method: "POST", body: JSON.stringify(job) });
export const fetchEmployerJob = (id) => request("/jobs/manage/" + encodeURIComponent(id));
export const updateEmployerJob = (id, job) => request("/jobs/manage/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify(job) });
export const closeEmployerJob = (id) => request("/jobs/manage/" + encodeURIComponent(id), { method: "DELETE" });
export const fetchJobApplications = (id) => request("/jobs/manage/" + encodeURIComponent(id) + "/applications");
export const updateApplicationStatus = (id, status) => request("/applications/manage/" + encodeURIComponent(id) + "/status", { method: "PATCH", body: JSON.stringify({ status }) });

export async function downloadApplicationResume(applicationId) {
  const response = await fetch(API_BASE + "/api/applications/" + encodeURIComponent(applicationId) + "/resume", { credentials: "include" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Unable to download this resume.");
  }
  return response.blob();
}

export async function fetchApplicationPhoto(applicationId) {
  const response = await fetch(API_BASE + "/api/applications/" + encodeURIComponent(applicationId) + "/photo", { credentials: "include" });
  if (!response.ok) throw new Error("Applicant photo is unavailable.");
  return response.blob();
}
