import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { authApi } from "../api/auth.js";
import { ApiClientError } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (location.pathname === "/login") {
      setLoading(false);
      return;
    }

    authApi
      .me()
      .then((res) => setUser(res?.data?.user || null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [location.pathname]);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login(email, password);
    setUser(res?.data?.user || null);
    return res?.data?.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // even if the request fails, drop the local session
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isSuperAdmin: user?.role === "super_admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export { ApiClientError };
