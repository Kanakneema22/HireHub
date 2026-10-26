const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/auth${path}`, {
      credentials: "include",
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error("Could not connect to HireHub. Make sure the backend is running.");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.success) {
    const error = new Error(body.message || "Authentication request failed.");
    error.status = response.status;
    throw error;
  }
  return body.data;
}

export const getCurrentUser = () => request("/me");
export const register = (details) => request("/register", { method: "POST", body: JSON.stringify(details) });
export const login = (details) => request("/login", { method: "POST", body: JSON.stringify(details) });
export const logout = () => request("/logout", { method: "POST", body: "{}" });
