import { useEffect, useState } from "react";
import { getCurrentUser, login as loginRequest, logout as logoutRequest, register as registerRequest } from "./api/auth";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then(({ user: currentUser }) => { if (active) setUser(currentUser); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function signIn(details, mode) {
    const result = mode === "register" ? await registerRequest(details) : await loginRequest(details);
    setUser(result.user);
    return result.user;
  }

  async function refreshUser() {
    const result = await getCurrentUser();
    setUser(result.user);
    return result.user;
  }

  async function signOut() {
    try { await logoutRequest(); } catch { /* The user can still clear the local session if the API is unavailable. */ }
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser }}>{children}</AuthContext.Provider>;
}

