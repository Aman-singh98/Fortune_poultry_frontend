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
  Package,
  Truck,
  FileText,
  FileSearch,
  Scale,
  ShoppingCart,
  PackageCheck,
  Receipt,
  Boxes,
  PackageMinus,
  DoorOpen,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { STOCK_MODULE_ACCESS } from "../constants/roleAccess.js";

// HR module — visible to everyone who's authenticated today (SUPER_ADMIN/ADMIN
// pattern predates the new roles), so no `allow` list needed on these.
const HR_NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/wage-master", label: "Wage master", icon: Wallet },
  { to: "/salary", label: "Salary", icon: Banknote },
  { to: "/leave", label: "Leave", icon: CalendarDays },
  { to: "/holidays", label: "Holidays", icon: PartyPopper },
];

// Stock, Purchase & Inventory module — each item is shown only to the roles
// that can open its route (see constants/roleAccess.js, used the same way
// App.jsx uses it for RoleRoute).
const STOCK_NAV_ITEMS = [
  { to: "/items", label: "Item master", icon: Package, allow: STOCK_MODULE_ACCESS.ITEM_MASTER },
  { to: "/vendors", label: "Vendor master", icon: Truck, allow: STOCK_MODULE_ACCESS.VENDOR_MASTER },
  { to: "/purchase-requisitions", label: "Requisitions", icon: FileText, allow: STOCK_MODULE_ACCESS.PURCHASE_REQUISITIONS },
  { to: "/rfq-quotations", label: "RFQ & quotations", icon: FileSearch, allow: STOCK_MODULE_ACCESS.RFQ_QUOTATIONS },
  { to: "/quotation-comparison", label: "Quotation comparison", icon: Scale, allow: STOCK_MODULE_ACCESS.QUOTATION_COMPARISON },
  { to: "/purchase-orders", label: "Purchase orders", icon: ShoppingCart, allow: STOCK_MODULE_ACCESS.PURCHASE_ORDERS },
  { to: "/goods-receipts", label: "Goods receipts", icon: PackageCheck, allow: STOCK_MODULE_ACCESS.GOODS_RECEIPTS },
  { to: "/bills", label: "Bills", icon: Receipt, allow: STOCK_MODULE_ACCESS.BILLS },
  { to: "/stock", label: "Stock", icon: Boxes, allow: STOCK_MODULE_ACCESS.STOCK },
  { to: "/item-issue-slips", label: "Item issue slips", icon: PackageMinus, allow: STOCK_MODULE_ACCESS.ITEM_ISSUE_SLIPS },
  { to: "/gate-pass", label: "Gate pass", icon: DoorOpen, allow: STOCK_MODULE_ACCESS.GATE_PASS },
];

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }) {
  const [hoveredItem, setHoveredItem] = useState(null);
  const { user } = useAuth();

  const visibleStockItems = STOCK_NAV_ITEMS.filter((item) => item.allow.includes(user?.role));
  const navGroups = [
    { items: HR_NAV_ITEMS },
    ...(visibleStockItems.length ? [{ heading: "Stock & Purchase", items: visibleStockItems }] : []),
  ];

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

        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {navGroups.map((group, groupIdx) => (
            <div key={group.heading || "hr"} className={groupIdx > 0 ? "pt-3 mt-3 border-t border-white/10" : ""}>
              {group.heading && (
                <p
                  className={`px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-navy-100/40 whitespace-nowrap overflow-hidden ${
                    collapsed ? "md:hidden" : ""
                  }`}
                >
                  {group.heading}
                </p>
              )}
              {group.items.map(({ to, label, icon: Icon }) => (
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
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
