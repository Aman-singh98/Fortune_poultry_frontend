import { NavLink } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  Wallet,
  Banknote,
  CalendarDays,
  PartyPopper,
  Egg,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/wage-master", label: "Wage master", icon: Wallet },
  { to: "/salary", label: "Salary", icon: Banknote },
  { to: "/leave", label: "Leave", icon: CalendarDays },
  { to: "/holidays", label: "Holidays", icon: PartyPopper },
];

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }) {
  const [hoveredItem, setHoveredItem] = useState(null);

  return (
    <>
      {/* Backdrop — mobile drawer only */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen z-40 flex flex-col bg-navy-900 text-navy-50
          transition-transform duration-200 md:transition-[width] md:duration-200
          w-60 ${collapsed ? "md:w-16" : "md:w-60"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-2 px-4 h-16 border-b border-white/10 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-accent-500 flex items-center justify-center shrink-0">
            <Egg size={16} className="text-white" />
          </div>
          <span className={`font-semibold tracking-wide text-sm whitespace-nowrap overflow-hidden ${collapsed ? "md:hidden" : ""}`}>
            Fortune Poultry
          </span>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <div
              key={to}
              className="relative"
              onMouseEnter={() => setHoveredItem(to)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <NavLink
                to={to}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-accent-500/20 text-white font-medium"
                      : "text-navy-100/70 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <Icon size={18} className="shrink-0" />
                <span className={`whitespace-nowrap overflow-hidden ${collapsed ? "md:hidden" : ""}`}>{label}</span>
              </NavLink>

              {/* Custom tooltip — shown only when the sidebar is collapsed (md+) */}
              {collapsed && hoveredItem === to && (
                <span
                  role="tooltip"
                  className="hidden md:block absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap
                    rounded-md bg-navy-900 text-white text-xs font-medium px-2.5 py-1.5 shadow-lg border border-white/10 z-50
                    pointer-events-none"
                >
                  {label}
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-navy-900" />
                </span>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
