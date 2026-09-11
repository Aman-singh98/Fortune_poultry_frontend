import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";

// Note: AuthContext doesn't hardcode a role list — `user.role` is whatever
// the backend returns, and RoleRoute.jsx checks it against a per-route
// `allow` array. The canonical list of valid roles (SUPER_ADMIN, ADMIN,
// MANAGEMENT, PURCHASE_MANAGER, ACCOUNTS, STORE_KEEPER) lives in
// constants/roleAccess.js, kept in sync with backend/src/models/User.js.

const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem("fp_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem("fp_token"));
  const [loading, setLoading] = useState(true);

  // On mount, verify the stored token is still valid by calling /auth/me
  useEffect(() => {
    const verify = async () => {
      const storedToken = localStorage.getItem("fp_token");
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        setUser(data.data);
        localStorage.setItem("fp_user", JSON.stringify(data.data));
      } catch {
        localStorage.removeItem("fp_token");
        localStorage.removeItem("fp_user");
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    const { token: newToken, user: loggedInUser } = data.data;
    localStorage.setItem("fp_token", newToken);
    localStorage.setItem("fp_user", JSON.stringify(loggedInUser));
    setToken(newToken);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("fp_token");
    localStorage.removeItem("fp_user");
    setToken(null);
    setUser(null);
  }, []);

  const value = { user, token, loading, login, logout, isAuthenticated: !!token };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
