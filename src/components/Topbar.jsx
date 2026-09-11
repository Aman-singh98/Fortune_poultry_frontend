import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, Menu } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSiteScope } from "../context/SiteScopeContext.jsx";
import Select from "./ui/Select.jsx";

export default function Topbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { sites, selectedSiteId, setSelectedSiteId, isSuperAdmin } = useSiteScope();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = (user?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-navy-100 flex items-center justify-between gap-2 px-3 sm:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-navy-50 text-navy-700 shrink-0"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>

        {/* Site switcher */}
        {isSuperAdmin ? (
          <Select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="max-w-[140px] sm:max-w-none"
            selectClassName="truncate"
          >
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </Select>
        ) : (
          <span className="text-sm border border-navy-100 rounded-lg px-3 py-2 text-navy-500 bg-navy-50 cursor-not-allowed truncate max-w-[140px] sm:max-w-none">
            {user?.site?.name || "Your site"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button className="p-2 rounded-lg hover:bg-navy-50 text-navy-700 relative" aria-label="Notifications">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-accent-500" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-1.5 sm:px-2 py-1.5 hover:bg-navy-50"
          >
            <div className="h-8 w-8 rounded-full bg-navy-700 text-white text-xs font-medium flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-navy-700 leading-tight">{user?.name}</p>
              <p className="text-xs text-navy-300 leading-tight">
                {user?.role === "SUPER_ADMIN" ? "Super admin" : user?.designation || "Admin"}
              </p>
            </div>
            <ChevronDown size={14} className="text-navy-300 hidden sm:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-navy-100 rounded-lg shadow-lg py-1 z-20">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-navy-700 hover:bg-navy-50"
              >
                <LogOut size={16} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
