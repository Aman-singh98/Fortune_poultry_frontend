import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Building2,
  CheckCircle2,
  XCircle,
  CalendarClock,
  Clock,
  ClipboardCheck,
  Wallet,
  Banknote,
  CalendarDays,
  PartyPopper,
  ArrowRight,
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
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSiteScope } from "../context/SiteScopeContext.jsx";
import { getAttendanceSummary, getLowStock, getPurchaseRequisitions, getRfqs } from "../api/endpoints.js";
import { SkeletonStatCards } from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { STOCK_MODULE_ACCESS } from "../constants/roleAccess.js";

const HR_QUICK_LINKS = [
  { to: "/attendance", label: "Attendance", description: "Mark today's attendance", icon: ClipboardCheck },
  { to: "/employees", label: "Employees", description: "Manage labour records", icon: Users },
  { to: "/wage-master", label: "Wage master", description: "Rates & increments", icon: Wallet },
  { to: "/salary", label: "Salary", description: "Generate & review pay", icon: Banknote },
  { to: "/leave", label: "Leave", description: "Requests & approvals", icon: CalendarDays },
  { to: "/holidays", label: "Holidays", description: "National holiday calendar", icon: PartyPopper },
];

const STOCK_QUICK_LINKS = [
  { to: "/items", label: "Item master", description: "Items, reorder levels & rates", icon: Package, allow: STOCK_MODULE_ACCESS.ITEM_MASTER },
  { to: "/vendors", label: "Vendor master", description: "Vendors & payment terms", icon: Truck, allow: STOCK_MODULE_ACCESS.VENDOR_MASTER },
  { to: "/purchase-requisitions", label: "Requisitions", description: "Raise & approve requisitions", icon: FileText, allow: STOCK_MODULE_ACCESS.PURCHASE_REQUISITIONS },
  { to: "/rfq-quotations", label: "RFQ & quotations", description: "Log vendor quotations", icon: FileSearch, allow: STOCK_MODULE_ACCESS.RFQ_QUOTATIONS },
  { to: "/quotation-comparison", label: "Quotation comparison", description: "Compare & select a vendor", icon: Scale, allow: STOCK_MODULE_ACCESS.QUOTATION_COMPARISON },
  { to: "/purchase-orders", label: "Purchase orders", description: "Create POs from approved quotes", icon: ShoppingCart, allow: STOCK_MODULE_ACCESS.PURCHASE_ORDERS },
  { to: "/goods-receipts", label: "Goods receipts", description: "Record inward material", icon: PackageCheck, allow: STOCK_MODULE_ACCESS.GOODS_RECEIPTS },
  { to: "/bills", label: "Bills", description: "Vendor bills & 3-way match", icon: Receipt, allow: STOCK_MODULE_ACCESS.BILLS },
  { to: "/stock", label: "Stock", description: "Running balances by site", icon: Boxes, allow: STOCK_MODULE_ACCESS.STOCK },
  { to: "/item-issue-slips", label: "Item issue slips", description: "Fulfil item requirements", icon: PackageMinus, allow: STOCK_MODULE_ACCESS.ITEM_ISSUE_SLIPS },
  { to: "/gate-pass", label: "Gate pass", description: "Outward material & returns", icon: DoorOpen, allow: STOCK_MODULE_ACCESS.GATE_PASS },
];

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-xl border border-navy-100 p-4 flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-accent-100 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-accent-700" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-navy-300 truncate">{label}</p>
        <p className="text-lg font-semibold text-navy-700">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { selectedSiteId, isSuperAdmin } = useSiteScope();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // RA v1.0 OP-6 — dashboard-only low-stock indicator, no email/SMS alerting.
  const [lowStock, setLowStock] = useState([]);
  const [lowStockLoading, setLowStockLoading] = useState(true);

  // Pending-approvals widget: open Requisitions + open RFQs awaiting a
  // Management decision. Visible to Management (and Super Admin) only.
  const canSeeApprovals = user?.role === "SUPER_ADMIN" || user?.role === "MANAGEMENT";
  const [pendingRequisitions, setPendingRequisitions] = useState([]);
  const [openRfqs, setOpenRfqs] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(true);

  const siteParam = isSuperAdmin && selectedSiteId ? { site: selectedSiteId } : {};
  const visibleStockLinks = STOCK_QUICK_LINKS.filter((link) => link.allow.includes(user?.role));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getAttendanceSummary(siteParam);
      setSummary(data.data);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId]);

  const loadLowStock = useCallback(async () => {
    setLowStockLoading(true);
    try {
      const { data } = await getLowStock(siteParam);
      setLowStock(data.data);
    } catch {
      setLowStock([]);
    } finally {
      setLowStockLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId]);

  const loadApprovals = useCallback(async () => {
    if (!canSeeApprovals) {
      setApprovalsLoading(false);
      return;
    }
    setApprovalsLoading(true);
    try {
      const [prRes, rfqRes] = await Promise.all([
        getPurchaseRequisitions({ status: "PENDING" }),
        getRfqs({ status: "OPEN" }),
      ]);
      setPendingRequisitions(prRes.data.data);
      setOpenRfqs(rfqRes.data.data);
    } catch {
      setPendingRequisitions([]);
      setOpenRfqs([]);
    } finally {
      setApprovalsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeApprovals]);

  useEffect(() => {
    load();
    loadLowStock();
    loadApprovals();
  }, [load, loadLowStock, loadApprovals]);

  const stats = [
    { icon: Building2, label: "Total sites", value: summary?.totalSites ?? "-" },
    { icon: Users, label: "Total labour", value: summary?.totalLabour ?? "-" },
    { icon: CheckCircle2, label: "Present today", value: summary?.presentToday ?? "-" },
    { icon: XCircle, label: "Absent", value: summary?.absent ?? "-" },
    { icon: CalendarClock, label: "On leave", value: summary?.leave ?? "-" },
    { icon: Clock, label: "Overtime hours", value: summary?.overtimeHours ?? "-" },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-navy-700">
          {greeting}, {user?.name?.split(" ")[0] || "there"} 👋
        </h1>
        <p className="text-sm text-navy-300 mt-0.5">
          {user?.role === "SUPER_ADMIN" ? "Here's how things look across all sites today." : `Here's today's snapshot for ${user?.site?.name || "your site"}.`}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {loading ? <SkeletonStatCards count={6} /> : stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className={`grid grid-cols-1 ${canSeeApprovals ? "lg:grid-cols-2" : ""} gap-4`}>
        <LowStockWidget items={lowStock} loading={lowStockLoading} />
        {canSeeApprovals && (
          <PendingApprovalsWidget
            requisitions={pendingRequisitions}
            rfqs={openRfqs}
            loading={approvalsLoading}
          />
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-navy-700 mb-3">HR &amp; attendance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {HR_QUICK_LINKS.map((link) => (
            <QuickLinkCard key={link.to} {...link} />
          ))}
        </div>
      </div>

      {visibleStockLinks.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-navy-700 mb-3">Stock, purchase &amp; inventory</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleStockLinks.map((link) => (
              <QuickLinkCard key={link.to} {...link} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickLinkCard({ to, label, description, icon: Icon }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 bg-white rounded-xl border border-navy-100 p-4 hover:border-accent-300 hover:shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-accent-500"
    >
      <div className="h-10 w-10 rounded-lg bg-navy-50 group-hover:bg-accent-100 flex items-center justify-center shrink-0 transition-colors">
        <Icon size={18} className="text-navy-500 group-hover:text-accent-700 transition-colors" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-navy-700">{label}</p>
        <p className="text-xs text-navy-300 truncate">{description}</p>
      </div>
      <ArrowRight size={16} className="text-navy-300 group-hover:text-accent-500 shrink-0 transition-colors" />
    </Link>
  );
}

/** Low-stock indicator (RA v1.0 OP-6): items at/below reorder level. */
function LowStockWidget({ items, loading }) {
  return (
    <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-navy-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-navy-700 flex items-center gap-1.5">
          <AlertTriangle size={15} className="text-amber-500" />
          Low stock
        </h2>
        <Link to="/stock" className="text-xs text-accent-600 hover:underline">
          View stock
        </Link>
      </div>
      {loading ? (
        <div className="p-4">
          <SkeletonStatCards count={3} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Nothing below the reorder level."
          description="Items will show up here once on-hand quantity drops to or below their reorder level."
        />
      ) : (
        <ul className="divide-y divide-navy-50 max-h-72 overflow-y-auto">
          {items.slice(0, 8).map((pos) => (
            <li key={pos._id} className="px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-navy-700 font-medium truncate">{pos.item?.name}</p>
                <p className="text-xs text-navy-300">{pos.site?.name || "-"}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium shrink-0">
                {pos.quantity} / {pos.item?.reorderLevel ?? 0} {pos.item?.unit || ""}
              </span>
            </li>
          ))}
          {items.length > 8 && (
            <li className="px-4 py-2 text-xs text-navy-300 text-center">+{items.length - 8} more on the Stock page</li>
          )}
        </ul>
      )}
    </div>
  );
}

/** Pending-approvals widget for Management: open Requisitions + open RFQs. */
function PendingApprovalsWidget({ requisitions, rfqs, loading }) {
  return (
    <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-navy-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-navy-700 flex items-center gap-1.5">
          <ClipboardList size={15} className="text-navy-400" />
          Pending approvals
        </h2>
      </div>
      {loading ? (
        <div className="p-4">
          <SkeletonStatCards count={3} />
        </div>
      ) : requisitions.length === 0 && rfqs.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nothing waiting on your decision." />
      ) : (
        <ul className="divide-y divide-navy-50 max-h-72 overflow-y-auto">
          {requisitions.slice(0, 5).map((r) => (
            <li key={r._id} className="px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-navy-700 font-medium truncate">
                  {r.prNumber} · {r.item?.name}
                </p>
                <p className="text-xs text-navy-300">{r.department}</p>
              </div>
              <StatusBadge value={r.status} />
            </li>
          ))}
          {rfqs.slice(0, 5).map((rfq) => (
            <li key={rfq._id} className="px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-navy-700 font-medium truncate">{rfq.rfqNumber}</p>
                <p className="text-xs text-navy-300">Quotations open for comparison</p>
              </div>
              <StatusBadge value={rfq.status} />
            </li>
          ))}
          {(requisitions.length > 5 || rfqs.length > 5) && (
            <li className="px-4 py-2 text-xs text-navy-300 text-center">
              See Requisitions / Quotation comparison for the full list
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
