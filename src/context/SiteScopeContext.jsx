import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext.jsx";
import { getSites } from "../api/endpoints.js";

const SiteScopeContext = createContext(null);

/**
 * Tracks the list of sites and which one is "in view" on the dashboard.
 * - SuperAdmin: can pick any site, or "" for All sites.
 * - Admin: always locked to their own assigned site.
 */
export function SiteScopeProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const refreshSites = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const { data } = await getSites();
      setSites(data.data || []);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshSites();
  }, [refreshSites]);

  useEffect(() => {
    if (user && user.role === "ADMIN" && user.site) {
      setSelectedSiteId(user.site._id || user.site);
    }
  }, [user]);

  const value = {
    sites,
    loading,
    selectedSiteId,
    setSelectedSiteId: isSuperAdmin ? setSelectedSiteId : () => {},
    isSuperAdmin,
    refreshSites,
  };

  return <SiteScopeContext.Provider value={value}>{children}</SiteScopeContext.Provider>;
}

export function useSiteScope() {
  const ctx = useContext(SiteScopeContext);
  if (!ctx) throw new Error("useSiteScope must be used within a SiteScopeProvider");
  return ctx;
}
