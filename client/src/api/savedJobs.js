const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(API_BASE + "/api/saved-jobs" + path, {
      credentials: "include",
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error("Could not connect to HireHub. Make sure the backend is running.");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.success) throw new Error(body.message || "Saved jobs request failed.");
  return body.data;
}

function normalizeSavedJob(item) {
  if (!item?.job) return item;
  return { ...item, job: { ...item.job, id: String(item.job._id || item.job.id) } };
}

export async function fetchSavedJobs() {
  const items = await request("/");
  return items.map(normalizeSavedJob);
}

export async function saveJob(jobId) {
  const saved = await request("/" + encodeURIComponent(jobId), { method: "POST" });
  return normalizeSavedJob(saved);
}

export function unsaveJob(jobId) {
  return request("/" + encodeURIComponent(jobId), { method: "DELETE" });
}
