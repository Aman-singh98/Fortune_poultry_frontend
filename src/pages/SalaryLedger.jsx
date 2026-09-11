import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserRound,
  Users,
  ArrowRight,
  Wallet,
  CircleAlert,
} from "lucide-react";
import { useSiteScope } from "../context/SiteScopeContext.jsx";
import { getEmployees, getSalaryLedgerEntries } from "../api/endpoints.js";
import Select from "../components/ui/Select.jsx";
import { SkeletonBar } from "../components/ui/Skeleton.jsx";
import SalaryLedgerCard, { ENTRY_TYPES } from "../components/SalaryLedgerCard.jsx";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

// Tailwind classes for each entry type's stat card — kept close to the tones
// already used for that type's tab/icon in SalaryLedgerCard so the two pages
// read as one connected feature rather than two designs.
const STAT_TONES = {
  DAILY_DEDUCTION: { ring: "border-orange-200", iconBg: "bg-orange-50", iconColor: "text-orange-600", accent: "text-orange-700" },
  ADVANCE: { ring: "border-blue-200", iconBg: "bg-blue-50", iconColor: "text-blue-600", accent: "text-blue-700" },
  FINE: { ring: "border-red-200", iconBg: "bg-red-50", iconColor: "text-red-600", accent: "text-red-700" },
  TRAVEL: { ring: "border-teal-200", iconBg: "bg-teal-50", iconColor: "text-teal-600", accent: "text-teal-700" },
};

export default function SalaryLedger() {
  const { sites, selectedSiteId } = useSiteScope();
  const navigate = useNavigate();

  const [siteId, setSiteId] = useState("");
  const [allEmployees, setAllEmployees] = useState([]);
  const [personType, setPersonType] = useState("PERMANENT");
  const [{ month, year }, setPeriod] = useState(currentMonthYear());

  const [pendingEntries, setPendingEntries] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // Default the site picker once sites are known — same pattern Attendance
  // uses for its own site-scoped panel, since the add-entry form always
  // needs one concrete site to pull people from (an empty "All sites"
  // selection can't resolve who's eligible).
  useEffect(() => {
    if (!siteId && sites.length) {
      setSiteId(selectedSiteId || sites[0]._id);
    }
  }, [sites, selectedSiteId, siteId]);

  useEffect(() => {
    getEmployees({}).then(({ data }) => setAllEmployees(data.data));
  }, []);

  const loadStats = useCallback(async () => {
    if (!siteId) return;
    setStatsLoading(true);
    try {
      const { data } = await getSalaryLedgerEntries({
        employeeType: personType,
        site: siteId,
        status: "PENDING",
        month,
        year,
      });
      setPendingEntries(data.data);
    } finally {
      setStatsLoading(false);
    }
  }, [siteId, personType, month, year]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const statsByType = useMemo(() => {
    const map = {};
    for (const t of ENTRY_TYPES) map[t.key] = { count: 0, total: 0 };
    for (const e of pendingEntries) {
      if (!map[e.type]) continue;
      map[e.type].count += 1;
      map[e.type].total += Number(e.amount) || 0;
    }
    return map;
  }, [pendingEntries]);

  const totalPendingCount = pendingEntries.length;

  const goToSalary = () => navigate(`/salary?month=${month}&year=${year}`);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-navy-700">Daily Deduction, Advance, Fine &amp; Travel</h1>
          <p className="text-sm text-navy-300 mt-0.5 max-w-xl">
            Log day-to-day money entries against a person — birds/eggs bought on credit, an advance handed out, a
            fine, or a work trip. Everything pending here is applied automatically the next time that person's
            salary is generated.
          </p>
        </div>
        <button
          type="button"
          onClick={goToSalary}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-navy-700 text-white hover:bg-navy-900 shrink-0"
        >
          <Wallet size={14} />
          Open Salary — {MONTH_NAMES[month - 1]} {year}
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Scope controls for the overview below: which site/person-type/month the
          pending totals are calculated for. The card further down inherits the
          same site + person-type so the numbers always describe the same set of
          people. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-navy-50/70 p-1 rounded-xl">
          {[
            { key: "PERMANENT", label: "Employees", icon: UserRound },
            { key: "WAGES", label: "Labour / Wages", icon: Users },
          ].map((t) => {
            const Icon = t.icon;
            const active = personType === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setPersonType(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active ? "bg-white text-navy-700 shadow-sm" : "text-navy-400 hover:text-navy-600"
                }`}
              >
                <Icon size={13} />
                {t.label}
              </button>
            );
          })}
        </div>

        <Select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          {sites.map((s) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </Select>

        <Select value={month} onChange={(e) => setPeriod((p) => ({ ...p, month: Number(e.target.value) }))}>
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </Select>
        <Select value={year} onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))}>
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
      </div>

      {/* Pending overview — what's waiting to land on the next salary run for
          this site/person-type/period. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ENTRY_TYPES.map((t) => {
          const Icon = t.icon;
          const tone = STAT_TONES[t.key];
          const stat = statsByType[t.key];
          return (
            <div key={t.key} className={`bg-white rounded-xl border p-4 ${tone.ring}`}>
              <div className="flex items-center gap-2.5">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${tone.iconBg}`}>
                  <Icon size={16} className={tone.iconColor} />
                </div>
                <p className="text-xs font-medium text-navy-400">{t.label}</p>
              </div>
              <div className="mt-3">
                {statsLoading ? (
                  <SkeletonBar className="h-6 w-20" />
                ) : (
                  <p className={`text-xl font-semibold ${tone.accent}`}>₹{stat.total.toFixed(2)}</p>
                )}
                <p className="text-[11px] text-navy-300 mt-0.5">
                  {statsLoading ? "\u00A0" : `${stat.count} pending ${stat.count === 1 ? "entry" : "entries"}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {!statsLoading && totalPendingCount > 0 && (
        <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 text-amber-700">
          <CircleAlert size={14} className="shrink-0" />
          {totalPendingCount} {totalPendingCount === 1 ? "entry" : "entries"} for {MONTH_NAMES[month - 1]} {year} will
          be applied the next time salary is generated for these people —{" "}
          <button type="button" onClick={goToSalary} className="font-medium underline underline-offset-2 hover:text-amber-800">
            open Salary for this period
          </button>
          .
        </div>
      )}

      <SalaryLedgerCard
        employees={allEmployees}
        siteId={siteId}
        personType={personType}
        onPersonTypeChange={setPersonType}
        onChanged={loadStats}
      />
    </div>
  );
}
