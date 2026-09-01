import { useEffect, useMemo, useState, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  getDay,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import {
  Users,
  Building2,
  CheckCircle2,
  XCircle,
  Umbrella,
  Clock,
  Copy,
  MessageSquare,
  ClipboardList,
  Search,
  ChevronLeft,
  ChevronRight,
  Save,
  UserRound,
} from "lucide-react";
import { PieChart, Pie, Cell } from "recharts";
import { useSiteScope } from "../context/SiteScopeContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  getAttendanceSummary,
  getEmployees,
  getAttendance,
  markAttendance,
} from "../api/endpoints.js";
import { SkeletonStatCards, SkeletonTableRows } from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Select from "../components/ui/Select.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import usePagination from "../hooks/usePagination.js";

// ---------------------------------------------------------------------------
// Status metadata — single source of truth for labels, colours, short codes
// ---------------------------------------------------------------------------
const STATUS_META = {
  PRESENT: { label: "Present", short: "P", dot: "#16a34a", badge: "bg-green-50 text-green-700 border-green-200", chip: "bg-green-100 text-green-700" },
  ABSENT: { label: "Absent", short: "A", dot: "#dc2626", badge: "bg-red-50 text-red-700 border-red-200", chip: "bg-red-100 text-red-700" },
  HALF_DAY: { label: "Half-day", short: "HD", dot: "#2563eb", badge: "bg-blue-50 text-blue-700 border-blue-200", chip: "bg-blue-100 text-blue-700" },
  PRESENT_X2: { label: "Present x2", short: "Px2", dot: "#7c3aed", badge: "bg-purple-50 text-purple-700 border-purple-200", chip: "bg-purple-100 text-purple-700" },
  PRESENT_HALF: { label: "Present / Half", short: "P/2", dot: "#0d9488", badge: "bg-teal-50 text-teal-700 border-teal-200", chip: "bg-teal-100 text-teal-700" },
  LEAVE: { label: "Leave", short: "L", dot: "#d97706", badge: "bg-amber-50 text-amber-700 border-amber-200", chip: "bg-amber-100 text-amber-700" },
  SUNDAY: { label: "Sunday", short: "S", dot: "#6b7280", badge: "bg-gray-100 text-gray-600 border-gray-200", chip: "bg-gray-100 text-gray-600" },
  HOLIDAY: { label: "Holiday", short: "H", dot: "#0891b2", badge: "bg-cyan-50 text-cyan-700 border-cyan-200", chip: "bg-cyan-100 text-cyan-700" },
};
const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label }));
const PRESENT_LIKE = new Set(["PRESENT", "PRESENT_X2", "PRESENT_HALF", "HALF_DAY"]);

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "PERMANENT", label: "Permanent" },
  { value: "CONSTRUCTION_LABOUR", label: "Construction Labour" },
  { value: "PAINTER", label: "Painter" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "ELECTRICIAN", label: "Electrician" },
];

function categoryLabel(emp) {
  if (emp.employeeType === "PERMANENT") return "Permanent";
  const found = CATEGORY_OPTIONS.find((c) => c.value === emp.wagesSubCategory);
  return found ? found.label : "Daily Wage";
}

function initials(name = "?") {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------
function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-xl border border-navy-100 p-4 flex items-center gap-3">
      <div className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={19} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-navy-300 truncate">{label}</p>
        <p className="text-xl font-semibold text-navy-700 leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-navy-300">{sub}</p>}
      </div>
    </div>
  );
}

function Avatar({ name, photoUrl, size = 34 }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-accent-100 text-accent-700 text-xs font-semibold flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </div>
  );
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

// ===========================================================================
export default function Attendance() {
  const { sites, selectedSiteId, isSuperAdmin } = useSiteScope();
  const { user } = useAuth();
  const toast = useToast();

  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [summary, setSummary] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Mark-attendance panel controls
  const [panelSiteId, setPanelSiteId] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [edits, setEdits] = useState({}); // employeeId -> { status, overtimeHours, remarks }
  const [remarksOpenFor, setRemarksOpenFor] = useState(null);
  const [dirty, setDirty] = useState(false);

  // Calendar panel
  const [calendarEmployeeId, setCalendarEmployeeId] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [calendarRecords, setCalendarRecords] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const siteParam = isSuperAdmin && selectedSiteId ? { site: selectedSiteId } : {};

  // Default the panel's site once sites are known.
  useEffect(() => {
    if (!panelSiteId && sites.length) {
      setPanelSiteId(selectedSiteId || sites[0]._id);
    }
  }, [sites, selectedSiteId, panelSiteId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, employeesRes, attendanceRes] = await Promise.all([
        getAttendanceSummary({ ...siteParam, date }),
        getEmployees({}),
        getAttendance({ date }),
      ]);
      setSummary(summaryRes.data.data);
      setAllEmployees(employeesRes.data.data);
      setAttendanceRecords(attendanceRes.data.data);
      setDirty(false);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, selectedSiteId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Seed local edit state from the freshly loaded attendance records.
  useEffect(() => {
    const map = {};
    for (const r of attendanceRecords) {
      const empId = r.employee?._id;
      if (!empId) continue;
      map[empId] = {
        status: r.status,
        overtimeHours: r.overtimeHours || 0,
        remarks: r.remarks || "",
      };
    }
    setEdits(map);
  }, [attendanceRecords]);

  useEffect(() => {
    if (!calendarEmployeeId && allEmployees.length) {
      setCalendarEmployeeId(allEmployees[0]._id);
    }
  }, [allEmployees, calendarEmployeeId]);

  // ---- Site Summary (all visible sites, always) --------------------------
  const siteSummaryRows = useMemo(() => {
    return sites.map((site) => {
      const emps = allEmployees.filter((e) => e.site?._id === site._id);
      const dailyWage = emps.filter((e) => e.employeeType === "WAGES").length;
      const permanent = emps.filter((e) => e.employeeType === "PERMANENT").length;
      const records = attendanceRecords.filter((r) => r.site?._id === site._id);
      const present = records.filter((r) => PRESENT_LIKE.has(r.status)).length;
      const absent = records.filter((r) => r.status === "ABSENT").length;
      const total = emps.length;
      return {
        id: site._id,
        name: site.name,
        dailyWage,
        permanent,
        present,
        absent,
        percent: pct(present, total),
      };
    });
  }, [sites, allEmployees, attendanceRecords]);

  // ---- Mark Attendance panel employees ------------------------------------
  const panelEmployees = useMemo(() => {
    let list = allEmployees.filter((e) => e.site?._id === panelSiteId);
    if (categoryFilter === "PERMANENT") {
      list = list.filter((e) => e.employeeType === "PERMANENT");
    } else if (categoryFilter) {
      list = list.filter((e) => e.wagesSubCategory === categoryFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) => e.name.toLowerCase().includes(q) || e.labourId.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allEmployees, panelSiteId, categoryFilter, search]);

  const siteSummaryPagination = usePagination(siteSummaryRows, 10);
  const panelPagination = usePagination(panelEmployees, 10);
  useEffect(() => {
    panelPagination.setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelSiteId, categoryFilter, search, date]);

  const updateEdit = (employeeId, patch) => {
    setEdits((prev) => ({
      ...prev,
      [employeeId]: { status: "PRESENT", overtimeHours: 0, remarks: "", ...prev[employeeId], ...patch },
    }));
    setDirty(true);
  };

  const handleMarkAllPresent = () => {
    if (!panelEmployees.length) return;
    setEdits((prev) => {
      const next = { ...prev };
      for (const emp of panelEmployees) {
        next[emp._id] = { ...(next[emp._id] || { overtimeHours: 0, remarks: "" }), status: "PRESENT" };
      }
      return next;
    });
    setDirty(true);
    toast.info("Marked all present below — click Save Attendance to confirm.");
  };

  const handleCopyYesterday = async () => {
    if (!panelSiteId) return;
    const yesterday = format(new Date(new Date(date).getTime() - 86400000), "yyyy-MM-dd");
    try {
      const res = await getAttendance({ site: panelSiteId, date: yesterday });
      const byEmp = {};
      for (const r of res.data.data) byEmp[r.employee?._id] = r;
      setEdits((prev) => {
        const next = { ...prev };
        for (const emp of panelEmployees) {
          const y = byEmp[emp._id];
          if (y) {
            next[emp._id] = {
              status: y.status,
              overtimeHours: y.overtimeHours || 0,
              remarks: next[emp._id]?.remarks || "",
            };
          }
        }
        return next;
      });
      setDirty(true);
      toast.info("Copied yesterday's attendance — click Save Attendance to confirm.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not copy yesterday's attendance.");
    }
  };

  const handleSaveAttendance = async () => {
    if (!panelEmployees.length) return;
    setSaving(true);
    try {
      await Promise.all(
        panelEmployees.map((emp) => {
          const e = edits[emp._id];
          if (!e?.status) return Promise.resolve();
          return markAttendance({
            employee: emp._id,
            date,
            status: e.status,
            overtimeHours: Number(e.overtimeHours) || 0,
            remarks: e.remarks || "",
          });
        })
      );
      toast.success("Attendance saved.");
      loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save attendance.");
    } finally {
      setSaving(false);
    }
  };

  // ---- Calendar panel ------------------------------------------------------
  const loadCalendar = useCallback(async () => {
    if (!calendarEmployeeId) return;
    setCalendarLoading(true);
    try {
      const res = await getAttendance({
        employee: calendarEmployeeId,
        month: format(calendarMonth, "M"),
        year: format(calendarMonth, "yyyy"),
      });
      setCalendarRecords(res.data.data);
    } finally {
      setCalendarLoading(false);
    }
  }, [calendarEmployeeId, calendarMonth]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    // Default the detail panel to the record matching the top date picker, if in view.
    const match = calendarRecords.find((r) => format(parseISO(r.date), "yyyy-MM-dd") === date);
    setSelectedDay(match ? parseISO(match.date) : startOfMonth(calendarMonth));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarRecords, date, calendarMonth]);

  const calendarEmployee = allEmployees.find((e) => e._id === calendarEmployeeId);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    const days = eachDayOfInterval({ start, end });
    const leadingBlanks = getDay(start) === 0 ? 6 : getDay(start) - 1; // Mon-first grid
    return { leadingBlanks, days };
  }, [calendarMonth]);

  const recordForDay = (day) => calendarRecords.find((r) => isSameDay(parseISO(r.date), day));

  const selectedDayRecord = selectedDay ? recordForDay(selectedDay) : null;

  // ---- Stat cards ------------------------------------------------------
  const stats = [
    { icon: Building2, label: "Total Sites", value: summary?.totalSites ?? "-", sub: "Active Sites", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
    { icon: Users, label: "Total Labour", value: summary?.totalLabour ?? "-", sub: "All Workers", iconBg: "bg-purple-100", iconColor: "text-purple-600" },
    { icon: CheckCircle2, label: "Present Today", value: summary?.presentToday ?? "-", sub: `${pct(summary?.presentToday || 0, summary?.totalLabour || 0)}%`, iconBg: "bg-green-100", iconColor: "text-green-600" },
    { icon: XCircle, label: "Absent", value: summary?.absent ?? "-", sub: `${pct(summary?.absent || 0, summary?.totalLabour || 0)}%`, iconBg: "bg-red-100", iconColor: "text-red-600" },
    { icon: Umbrella, label: "Leave", value: summary?.leave ?? "-", sub: `${pct(summary?.leave || 0, summary?.totalLabour || 0)}%`, iconBg: "bg-amber-100", iconColor: "text-amber-600" },
    { icon: Clock, label: "Overtime", value: summary?.overtimeHours ?? "-", sub: "Hours Today", iconBg: "bg-sky-100", iconColor: "text-sky-600" },
    { icon: Users, label: "P x 2 (Double)", value: summary?.presentX2 ?? "-", sub: "Workers", iconBg: "bg-purple-100", iconColor: "text-purple-600" },
    { icon: UserRound, label: "P / 2 (Half Day)", value: summary?.presentHalf ?? "-", sub: "Workers", iconBg: "bg-teal-100", iconColor: "text-teal-600" },
  ];

  // ---- Donut breakdown ---------------------------------------------------
  const donutData = [
    { key: "PRESENT", name: "Present", value: summary?.presentToday || 0 },
    { key: "ABSENT", name: "Absent", value: summary?.absent || 0 },
    { key: "LEAVE", name: "Leave", value: summary?.leave || 0 },
    { key: "PRESENT_X2", name: "Present x 2", value: summary?.presentX2 || 0 },
    { key: "PRESENT_HALF", name: "Present / 2", value: summary?.presentHalf || 0 },
  ].filter((d) => d.value > 0);
  const donutTotal = summary?.totalLabour || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-navy-700">Attendance Dashboard</h1>
          <p className="text-sm text-navy-300">Welcome back, {user?.name?.split(" ")[0] || "Admin"} 👋</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-sm border border-navy-100 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {loading ? <SkeletonStatCards count={8} /> : stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Site summary */}
      <div className="bg-white rounded-xl border border-navy-100 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-navy-100">
          <h2 className="text-sm font-semibold text-navy-700">Site Summary (Today)</h2>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-300 border-b border-navy-100">
                <th className="px-4 py-2 font-medium">Site</th>
                <th className="px-4 py-2 font-medium">Wage</th>
                <th className="px-4 py-2 font-medium">Perm.</th>
                <th className="px-4 py-2 font-medium">Present</th>
                <th className="px-4 py-2 font-medium">Absent</th>
                <th className="px-4 py-2 font-medium">Att. %</th>
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={4} columns={6} />}
              {!loading &&
                siteSummaryPagination.pageItems.map((row) => (
                  <tr key={row.id} className="border-b border-navy-50 last:border-0">
                    <td className="px-4 py-2.5 text-navy-700 font-medium whitespace-nowrap">{row.name}</td>
                    <td className="px-4 py-2.5 text-navy-500">{row.dailyWage}</td>
                    <td className="px-4 py-2.5 text-navy-500">{row.permanent}</td>
                    <td className="px-4 py-2.5 text-green-600 font-medium">{row.present}</td>
                    <td className="px-4 py-2.5 text-red-500 font-medium">{row.absent}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 min-w-[86px]">
                        <span className="text-navy-700 font-medium text-xs w-9">{row.percent}%</span>
                        <div className="h-1.5 flex-1 rounded-full bg-navy-50 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-green-500"
                            style={{ width: `${Math.min(row.percent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={siteSummaryPagination.page}
          pageSize={siteSummaryPagination.pageSize}
          total={siteSummaryPagination.total}
          onPageChange={siteSummaryPagination.setPage}
          itemLabel="sites"
        />
      </div>

      {/* Mark attendance — full width */}
      <div className="bg-white rounded-xl border border-navy-100 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-navy-100 flex flex-wrap items-center gap-2 justify-between">
            <h2 className="text-sm font-semibold text-navy-700 whitespace-nowrap">Mark Attendance — {date}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {isSuperAdmin ? (
                <Select
                  value={panelSiteId}
                  onChange={(e) => setPanelSiteId(e.target.value)}
                  size="sm"
                >
                  {sites.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              ) : null}
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                size="sm"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-navy-300" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search labour..."
                  className="text-xs border border-navy-100 rounded-lg pl-7 pr-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 w-32 sm:w-40"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-navy-300 border-b border-navy-100">
                  <th className="px-4 py-2 font-medium"></th>
                  <th className="px-4 py-2 font-medium">Labour ID</th>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 font-medium">Attendance</th>
                  <th className="px-4 py-2 font-medium">OT (Hrs)</th>
                  <th className="px-4 py-2 font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {loading && <SkeletonTableRows rows={5} columns={7} />}
                {!loading && panelEmployees.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={ClipboardList}
                        title="No employees match these filters."
                        description="Try a different category or search term, or pick another site."
                      />
                    </td>
                  </tr>
                )}
                {!loading &&
                  panelPagination.pageItems.map((emp) => {
                    const e = edits[emp._id] || {};
                    const meta = STATUS_META[e.status];
                    return (
                      <tr key={emp._id} className="border-b border-navy-50 last:border-0">
                        <td className="px-4 py-2">
                          <Avatar name={emp.name} photoUrl={emp.photoUrl} />
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-navy-500 whitespace-nowrap">{emp.labourId}</td>
                        <td className="px-4 py-2 text-navy-700 whitespace-nowrap">{emp.name}</td>
                        <td className="px-4 py-2">
                          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-navy-50 text-navy-500 whitespace-nowrap">
                            {categoryLabel(emp)}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <Select
                            value={e.status || ""}
                            onChange={(ev) => updateEdit(emp._id, { status: ev.target.value })}
                            size="sm"
                            selectClassName={`font-medium ${meta ? meta.badge : "border-navy-100 text-navy-500"}`}
                          >
                            <option value="" disabled>
                              Set status
                            </option>
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={e.overtimeHours ?? 0}
                            onChange={(ev) => updateEdit(emp._id, { overtimeHours: ev.target.value })}
                            className="w-16 text-sm border border-navy-100 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-500"
                          />
                        </td>
                        <td className="px-4 py-2 relative">
                          <button
                            onClick={() => setRemarksOpenFor(remarksOpenFor === emp._id ? null : emp._id)}
                            className={`p-1.5 rounded-lg hover:bg-navy-50 ${e.remarks ? "text-accent-600" : "text-navy-400"}`}
                            aria-label="Remarks"
                          >
                            <MessageSquare size={16} />
                          </button>
                          {remarksOpenFor === emp._id && (
                            <RemarksPopover
                              initial={e.remarks || ""}
                              onClose={() => setRemarksOpenFor(null)}
                              onSave={(text) => {
                                updateEdit(emp._id, { remarks: text });
                                setRemarksOpenFor(null);
                              }}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={panelPagination.page}
            pageSize={panelPagination.pageSize}
            total={panelPagination.total}
            onPageChange={panelPagination.setPage}
            itemLabel="employees"
          />

          <div className="px-4 py-3 border-t border-navy-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <button
                onClick={handleMarkAllPresent}
                className="text-sm rounded-lg border border-navy-100 px-3 py-2 hover:bg-navy-50 text-navy-700"
              >
                Mark All Present
              </button>
              <button
                onClick={handleCopyYesterday}
                className="flex items-center gap-1.5 text-sm rounded-lg border border-navy-100 px-3 py-2 hover:bg-navy-50 text-navy-700"
              >
                <Copy size={14} />
                Copy Yesterday
              </button>
            </div>
            <button
              onClick={handleSaveAttendance}
              disabled={saving || !dirty}
              className="flex items-center gap-1.5 text-sm rounded-lg bg-navy-700 text-white px-4 py-2 hover:bg-navy-900 disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>
      </div>

      {/* Calendar + Overview */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Calendar */}
        <div className="xl:col-span-3 bg-white rounded-xl border border-navy-100 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-semibold text-navy-700">
              Attendance Calendar
              {calendarEmployee ? ` — ${calendarEmployee.name} (${calendarEmployee.labourId})` : ""}
            </h2>
            <Select
              value={calendarEmployeeId}
              onChange={(e) => setCalendarEmployeeId(e.target.value)}
              size="sm"
            >
              {allEmployees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name} ({e.labourId})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
                  className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-500"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>
                <p className="text-sm font-semibold text-navy-700">{format(calendarMonth, "MMMM yyyy")}</p>
                <button
                  onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                  className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-500"
                  aria-label="Next month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-7 text-center text-[11px] text-navy-300 mb-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: calendarDays.leadingBlanks }).map((_, i) => (
                  <div key={`blank-${i}`} />
                ))}
                {calendarLoading &&
                  Array.from({ length: 28 }).map((_, i) => (
                    <div key={`sk-${i}`} className="h-11 rounded-lg bg-navy-50 animate-pulse" />
                  ))}
                {!calendarLoading &&
                  calendarDays.days.map((day) => {
                    const record = recordForDay(day);
                    const meta = record ? STATUS_META[record.status] : null;
                    const isSelected = selectedDay && isSameDay(day, selectedDay);
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDay(day)}
                        className={`h-11 rounded-lg text-xs flex flex-col items-center justify-center gap-0.5 border transition-colors ${
                          isSelected
                            ? "border-accent-500 ring-2 ring-accent-100"
                            : "border-transparent hover:border-navy-100"
                        } ${meta ? meta.chip : isToday(day) ? "bg-navy-50 text-navy-700 font-medium" : "text-navy-500"}`}
                      >
                        <span>{format(day, "d")}</span>
                        {meta && <span className="text-[9px] leading-none">{meta.short}</span>}
                      </button>
                    );
                  })}
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[11px] text-navy-400">
                {["PRESENT", "ABSENT", "LEAVE", "PRESENT_X2", "PRESENT_HALF"].map((k) => (
                  <span key={k} className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_META[k].dot }} />
                    {STATUS_META[k].label}
                  </span>
                ))}
              </div>
            </div>

            {/* Day detail */}
            <div className="bg-navy-50/60 rounded-xl p-3.5">
              <p className="text-xs font-semibold text-navy-700 mb-2">
                {selectedDay ? format(selectedDay, "d MMMM yyyy (EEEE)") : "Select a day"}
              </p>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-navy-300">Attendance</dt>
                  <dd className="text-navy-700 font-medium">
                    {selectedDayRecord ? STATUS_META[selectedDayRecord.status].label : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-navy-300">OT Hours</dt>
                  <dd className="text-navy-700 font-medium">{selectedDayRecord?.overtimeHours ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-navy-300">Marked By</dt>
                  <dd className="text-navy-700 font-medium truncate max-w-[110px]">
                    {selectedDayRecord?.markedBy?.name || "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-navy-300">Marked Time</dt>
                  <dd className="text-navy-700 font-medium">
                    {selectedDayRecord?.markedAt ? format(parseISO(selectedDayRecord.markedAt), "hh:mm a") : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-navy-300 mb-0.5">Remarks</dt>
                  <dd className="text-navy-700">{selectedDayRecord?.remarks || "—"}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Today's overview donut */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-navy-100 p-4">
          <h2 className="text-sm font-semibold text-navy-700 mb-3">Today's Attendance Overview — All Sites</h2>
          <div className="flex flex-col items-center">
            <div className="relative h-44 w-44">
              <PieChart width={176} height={176}>
                <Pie
                  data={donutData.length ? donutData : [{ key: "EMPTY", name: "No data", value: 1 }]}
                  dataKey="value"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={donutData.length > 1 ? 2 : 0}
                  stroke="none"
                >
                  {(donutData.length ? donutData : [{ key: "EMPTY" }]).map((d, i) => (
                    <Cell key={i} fill={d.key === "EMPTY" ? "#eef2f8" : STATUS_META[d.key].dot} />
                  ))}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-bold text-navy-700">{donutTotal}</p>
                <p className="text-[10px] text-navy-300">Total Workers</p>
              </div>
            </div>

            <div className="w-full mt-4 space-y-1.5">
              {[
                { key: "PRESENT", value: summary?.presentToday || 0 },
                { key: "ABSENT", value: summary?.absent || 0 },
                { key: "LEAVE", value: summary?.leave || 0 },
                { key: "PRESENT_X2", value: summary?.presentX2 || 0 },
                { key: "PRESENT_HALF", value: summary?.presentHalf || 0 },
              ].map((row) => (
                <div key={row.key} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-navy-500">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_META[row.key].dot }} />
                    {STATUS_META[row.key].label}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-navy-700 font-medium">{row.value}</span>
                    <span className="text-navy-300 w-10 text-right">{pct(row.value, donutTotal)}%</span>
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-navy-50 mt-1">
                <span className="flex items-center gap-1.5 text-navy-500">
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  Overtime
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-navy-700 font-medium">{summary?.overtimeHours || 0}</span>
                  <span className="text-navy-300 w-10 text-right">Hrs</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RemarksPopover({ initial, onClose, onSave }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="absolute z-20 mt-2 right-0 w-64 bg-white border border-navy-100 rounded-lg shadow-lg p-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        className="w-full text-sm border border-navy-100 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-500"
        placeholder="Optional note..."
      />
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onClose} className="text-xs px-2 py-1 rounded-lg text-navy-500 hover:bg-navy-50">
          Cancel
        </button>
        <button
          onClick={() => onSave(value)}
          className="text-xs px-2 py-1 rounded-lg bg-navy-700 text-white hover:bg-navy-900"
        >
          Save
        </button>
      </div>
    </div>
  );
}
