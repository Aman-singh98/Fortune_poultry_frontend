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
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSiteScope } from "../context/SiteScopeContext.jsx";
import { getAttendanceSummary } from "../api/endpoints.js";
import { SkeletonStatCards } from "../components/ui/Skeleton.jsx";

const QUICK_LINKS = [
  { to: "/attendance", label: "Attendance", description: "Mark today's attendance", icon: ClipboardCheck },
  { to: "/employees", label: "Employees", description: "Manage labour records", icon: Users },
  { to: "/wage-master", label: "Wage master", description: "Rates & increments", icon: Wallet },
  { to: "/salary", label: "Salary", description: "Generate & review pay", icon: Banknote },
  { to: "/leave", label: "Leave", description: "Requests & approvals", icon: CalendarDays },
  { to: "/holidays", label: "Holidays", description: "National holiday calendar", icon: PartyPopper },
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

  const siteParam = isSuperAdmin && selectedSiteId ? { site: selectedSiteId } : {};

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

  useEffect(() => {
    load();
  }, [load]);

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

      <div>
        <h2 className="text-sm font-semibold text-navy-700 mb-3">Jump to a module</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUICK_LINKS.map(({ to, label, description, icon: Icon }) => (
            <Link
              key={to}
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
          ))}
        </div>
      </div>
    </div>
  );
}
