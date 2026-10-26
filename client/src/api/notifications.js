const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(API_BASE + "/api/notifications" + path, {
      credentials: "include",
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error("Could not connect to HireHub. Make sure the backend is running.");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.success) throw new Error(body.message || "Notification request failed.");
  return body.data;
}

export const fetchNotifications = () => request("/");
export const markNotificationRead = (id) => request("/" + encodeURIComponent(id) + "/read", { method: "PATCH" });
export const markAllNotificationsRead = () => request("/read-all", { method: "PATCH" });
export const deleteNotification = (id) => request("/" + encodeURIComponent(id), { method: "DELETE" });
