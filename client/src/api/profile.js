const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(API_BASE + "/api/profile" + path, {
      credentials: "include",
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error("Could not connect to HireHub. Make sure the backend is running.");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.success) throw new Error(body.message || "Profile request failed.");
  return body.data;
}

export const fetchProfile = () => request("/");
export const saveProfile = (profile) => request("/", { method: "PATCH", body: JSON.stringify(profile) });

export async function uploadProfileFile(kind, file) {
  const endpoint = kind === "photo" ? "/photo" : "/resume";
  const response = await fetch(API_BASE + "/api/profile" + endpoint, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name) },
    body: file,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.success) throw new Error(body.message || "File upload failed.");
  return body.data;
}

export async function fetchProfileFile(kind) {
  const response = await fetch(API_BASE + "/api/profile/" + kind, { credentials: "include" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "File download failed.");
  }
  return response.blob();
}

export const deleteProfileFile = (kind) => request("/" + kind, { method: "DELETE" });
