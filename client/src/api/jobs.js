const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function normalizeJob(job) {
  return { ...job, id: String(job._id || job.id) };
}

async function request(path) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/jobs${path}`);
  } catch {
    throw new Error("Could not connect to HireHub. Make sure the backend is running.");
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.success) {
    throw new Error(body.message || "Unable to load jobs. Please try again.");
  }
  return body;
}

export async function fetchJobs(filters = {}) {
  const query = new URLSearchParams({ limit: "200", ...filters });
  const body = await request(`?${query}`);
  return body.data.map(normalizeJob);
}

export async function fetchJob(id) {
  const body = await request(`/${encodeURIComponent(id)}`);
  return normalizeJob(body.data);
}

