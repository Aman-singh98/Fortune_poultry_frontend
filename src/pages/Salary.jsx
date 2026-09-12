import { Fragment, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { X, Plus, ChevronDown, ChevronUp, RefreshCw, Banknote, ClipboardList, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSiteScope } from "../context/SiteScopeContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getEmployees, getSalaries, generateSalary, addSalaryDeduction, addSalaryIncentive } from "../api/endpoints.js";
import { SkeletonTableRows } from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Select from "../components/ui/Select.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import Tabs from "../components/ui/Tabs.jsx";
import usePagination from "../hooks/usePagination.js";

const EMPLOYEE_TYPE_TABS = [
  { value: "PERMANENT", label: "Employee" },
  { value: "WAGES", label: "Wages & Labour" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

// Reads an initial { month, year } from the URL (?month=&year=), e.g. when
// arriving via a "Open Salary" link from the Daily Deduction / Advance / Fine
// & Travel ledger page. Falls back to the current month/year if absent or invalid.
function periodFromSearchParams(params) {
  const { month, year } = currentMonthYear();
  const m = Number(params.get("month"));
  const y = Number(params.get("year"));
  return {
    month: m >= 1 && m <= 12 ? m : month,
    year: y >= 2000 && y <= 2100 ? y : year,
  };
}

export default function Salary() {
  const { user } = useAuth();
  const { sites, selectedSiteId, isSuperAdmin } = useSiteScope();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [{ month, year }, setPeriod] = useState(() => periodFromSearchParams(searchParams));
  const [employeeTypeTab, setEmployeeTypeTab] = useState("PERMANENT");
  const [employees, setEmployees] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [deductionTarget, setDeductionTarget] = useState(null); // { employee, salary }
  const [incentiveTarget, setIncentiveTarget] = useState(null); // { employee, salary }
  const [generatingId, setGeneratingId] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);

  const siteParam = isSuperAdmin && selectedSiteId ? { site: selectedSiteId } : {};

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, salRes] = await Promise.all([
        getEmployees({ ...siteParam, isActive: true, employeeType: employeeTypeTab }),
        getSalaries({ ...siteParam, month, year }),
      ]);
      setEmployees(empRes.data.data);
      setSalaries(salRes.data.data);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, month, year, employeeTypeTab]);

  useEffect(() => {
    load();
  }, [load]);

  const { page, setPage, pageItems, pageSize, total } = usePagination(employees, 10);
  useEffect(() => {
    setPage(1);
  }, [month, year, selectedSiteId, employeeTypeTab, setPage]);

  const salaryByEmployee = useMemo(() => {
    const map = {};
    for (const s of salaries) {
      const empId = s.employee?._id || s.employee;
      map[empId] = s;
    }
    return map;
  }, [salaries]);

  const handleGenerate = async (employeeId, name) => {
    setGeneratingId(employeeId);
    try {
      await generateSalary({ employee: employeeId, month, year });
      toast.success(`Salary generated for ${name}.`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not generate salary.");
    } finally {
      setGeneratingId(null);
    }
  };

  // Generates (or regenerates) salary for every employee currently listed
  // under the active tab, for the selected month/year, in one click.
  const handleGenerateAll = async () => {
    if (employees.length === 0) return;
    setGeneratingAll(true);
    let succeeded = 0;
    let failed = 0;
    for (const emp of employees) {
      try {
        await generateSalary({ employee: emp._id, month, year });
        succeeded += 1;
      } catch {
        failed += 1;
      }
    }
    setGeneratingAll(false);
    if (failed === 0) {
      toast.success(`Salary generated for all ${succeeded} employee${succeeded === 1 ? "" : "s"}.`);
    } else {
      toast.error(`Generated for ${succeeded} employee${succeeded === 1 ? "" : "s"}, ${failed} failed.`);
    }
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-navy-700">Salary</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/salary-ledger"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-navy-100 text-navy-600 hover:bg-navy-50"
          >
            <ClipboardList size={14} />
            Deduction / Advance / Fine / Travel
          </Link>
          <Select
            value={month}
            onChange={(e) => setPeriod((p) => ({ ...p, month: Number(e.target.value) }))}
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </Select>
          <Select
            value={year}
            onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))}
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
          <button
            onClick={handleGenerateAll}
            disabled={generatingAll || loading || employees.length === 0}
            title="Generate salary for every employee shown below, for the selected month/year"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-accent-500 hover:bg-accent-700 text-white disabled:opacity-60"
          >
            <Zap size={14} className={generatingAll ? "animate-pulse" : ""} />
            {generatingAll ? "Generating..." : "Generate all salary"}
          </button>
        </div>
      </div>

      <Tabs tabs={EMPLOYEE_TYPE_TABS} value={employeeTypeTab} onChange={setEmployeeTypeTab} />

      <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-300 border-b border-navy-100">
                <th className="px-4 py-2 font-medium">{employeeTypeTab === "WAGES" ? "Labour" : "Employee"}</th>
                <th className="px-4 py-2 font-medium">Site</th>
                <th className="px-4 py-2 font-medium">Gross earning</th>
                <th className="px-4 py-2 font-medium">Incentives</th>
                <th className="px-4 py-2 font-medium">Deductions</th>
                <th className="px-4 py-2 font-medium">Net salary</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={5} columns={7} />}
              {!loading && employees.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={Banknote}
                      title="No employees found."
                      description="Active employees for the selected site will appear here once added."
                    />
                  </td>
                </tr>
              )}
              {!loading &&
                pageItems.map((emp) => {
                  const salary = salaryByEmployee[emp._id];
                  const isExpanded = expandedId === emp._id;
                  return (
                    <Fragment key={emp._id}>
                      <tr className="border-b border-navy-50 last:border-0">
                        <td className="px-4 py-2 text-navy-700">
                          <button
                            onClick={() => salary && setExpandedId(isExpanded ? null : emp._id)}
                            className="flex items-center gap-1.5 font-medium"
                          >
                            {salary && (isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                            {emp.name}
                          </button>
                          <span className="block text-xs text-navy-300 font-mono">
                            {employeeTypeTab === "WAGES" ? emp.labourId : emp.employeeCode}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-navy-500">{emp.site?.name}</td>
                        <td className="px-4 py-2 text-navy-700">
                          {salary ? `₹${salary.grossEarning.toFixed(2)}` : "-"}
                        </td>
                        <td className="px-4 py-2 text-green-600">
                          {salary ? `+₹${salary.totalIncentives.toFixed(2)}` : "-"}
                        </td>
                        <td className="px-4 py-2 text-navy-500">
                          {salary ? `-₹${salary.totalDeductions.toFixed(2)}` : "-"}
                        </td>
                        <td className="px-4 py-2 font-semibold text-navy-700">
                          {salary ? `₹${salary.netSalary.toFixed(2)}` : "-"}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleGenerate(emp._id, emp.name)}
                              disabled={generatingId === emp._id}
                              title={salary ? "Regenerate salary" : "Generate salary"}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-900 text-white disabled:opacity-60"
                            >
                              <RefreshCw size={12} className={generatingId === emp._id ? "animate-spin" : ""} />
                              {salary ? "Regenerate" : "Generate"}
                            </button>
                            {salary && (
                              <button
                                onClick={() => setIncentiveTarget({ employee: emp, salary })}
                                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-green-200 hover:bg-green-50 text-green-700"
                              >
                                <Plus size={12} />
                                Incentive
                              </button>
                            )}
                            {salary && (
                              <button
                                onClick={() => setDeductionTarget({ employee: emp, salary })}
                                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-navy-100 hover:bg-navy-50 text-navy-700"
                              >
                                <Plus size={12} />
                                Deduction
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && salary && (
                        <tr className="bg-navy-50/50">
                          <td colSpan={7} className="px-4 py-4">
                            <SalaryBreakdown salary={salary} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="employees" />
      </div>

      {deductionTarget && (
        <DeductionModal
          target={deductionTarget}
          onClose={() => setDeductionTarget(null)}
          onSaved={() => {
            setDeductionTarget(null);
            load();
          }}
        />
      )}

      {incentiveTarget && (
        <IncentiveModal
          target={incentiveTarget}
          onClose={() => setIncentiveTarget(null)}
          onSaved={() => {
            setIncentiveTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function SalaryBreakdown({ salary }) {
  const s = salary.attendanceSummary || {};
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-xs font-semibold text-navy-700 uppercase tracking-wide mb-2">Attendance</h3>
        <dl className="grid grid-cols-2 gap-y-1.5 text-sm text-navy-600">
          <dt>Present days</dt><dd className="text-right font-medium">{s.presentDays}</dd>
          <dt>Half days</dt><dd className="text-right font-medium">{s.halfDays}</dd>
          <dt>Present x2 days</dt><dd className="text-right font-medium">{s.presentX2Days}</dd>
          <dt>Present/half days</dt><dd className="text-right font-medium">{s.presentHalfDays}</dd>
          <dt>Absent days</dt><dd className="text-right font-medium">{s.absentDays}</dd>
          <dt>Leave days</dt><dd className="text-right font-medium">{s.leaveDays}</dd>
          <dt>Paid holiday days</dt><dd className="text-right font-medium">{s.holidayDays}</dd>
          <dt>Overtime hours</dt><dd className="text-right font-medium">{s.overtimeHours}</dd>
        </dl>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-navy-700 uppercase tracking-wide mb-2">Earnings</h3>
        <dl className="grid grid-cols-2 gap-y-1.5 text-sm text-navy-600 mb-4">
          <dt>Base wage</dt><dd className="text-right font-medium">₹{salary.earnings.baseWage.toFixed(2)}</dd>
          <dt>Overtime pay</dt><dd className="text-right font-medium">₹{salary.earnings.overtimePay.toFixed(2)}</dd>
          {salary.earnings.travelAllowance > 0 && (
            <>
              <dt>Travel allowance</dt>
              <dd className="text-right font-medium text-teal-600">+₹{salary.earnings.travelAllowance.toFixed(2)}</dd>
            </>
          )}
        </dl>

        {/* Totals pulled in from the Daily Deduction / Advance / Fine / Travel
            ledger for this pay period (see SalaryLedger page). Travel adds to
            earnings above; the other three already reduce netSalary via the
            Deductions list below — these lines just make each type's total
            visible at a glance. */}
        {(() => {
          const lt = salary.ledgerTotals || { dailyDeduction: 0, advance: 0, fine: 0, travel: 0 };
          const hasAny = lt.dailyDeduction > 0 || lt.advance > 0 || lt.fine > 0 || lt.travel > 0;
          return hasAny ? (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-navy-700 uppercase tracking-wide mb-2">
                Daily Deduction, Advance, Fine &amp; Travel
              </h3>
              <dl className="grid grid-cols-2 gap-y-1.5 text-sm text-navy-600">
                <dt>Daily Deduction</dt>
                <dd className="text-right font-medium text-orange-600">-₹{lt.dailyDeduction.toFixed(2)}</dd>
                <dt>Advance</dt>
                <dd className="text-right font-medium text-blue-600">-₹{lt.advance.toFixed(2)}</dd>
                <dt>Fine</dt>
                <dd className="text-right font-medium text-red-600">-₹{lt.fine.toFixed(2)}</dd>
                <dt>Travel</dt>
                <dd className="text-right font-medium text-teal-600">+₹{lt.travel.toFixed(2)}</dd>
              </dl>
            </div>
          ) : null;
        })()}

        <h3 className="text-xs font-semibold text-navy-700 uppercase tracking-wide mb-2">Incentives &amp; expenses (added)</h3>
        {salary.incentives.length === 0 ? (
          <p className="text-sm text-navy-300 mb-4">None recorded.</p>
        ) : (
          <ul className="text-sm text-navy-600 space-y-1 mb-4">
            {salary.incentives.map((inc, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>
                  {inc.type} — <span className="text-navy-400">{inc.remark}</span>
                </span>
                <span className="text-green-600 font-medium whitespace-nowrap">+₹{inc.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
        <h3 className="text-xs font-semibold text-navy-700 uppercase tracking-wide mb-2">Deductions</h3>
        {salary.deductions.length === 0 ? (
          <p className="text-sm text-navy-300">None recorded.</p>
        ) : (
          <ul className="text-sm text-navy-600 space-y-1">
            {salary.deductions.map((d, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>
                  {d.type} {d.isPercentage ? `(${d.amount}%)` : ""} — <span className="text-navy-400">{d.remark}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DeductionModal({ target, onClose, onSaved }) {
  const toast = useToast();
  const { employee, salary } = target;
  const [type, setType] = useState("ADVANCE");
  const [amount, setAmount] = useState("");
  const [isPercentage, setIsPercentage] = useState(false);
  const [remark, setRemark] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!remark.trim()) {
      setError("A remark/reason is mandatory for every deduction.");
      return;
    }
    setSaving(true);
    try {
      await addSalaryDeduction(salary._id, {
        type,
        amount: Number(amount),
        isPercentage: type === "FINE" ? isPercentage : false,
        remark,
      });
      toast.success("Deduction added.");
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not add deduction.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">Add deduction</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-navy-500 mb-3">{employee.name} — {employee.labourId}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Type</label>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full"
            >
              <option value="ADVANCE">Advance payment</option>
              <option value="FINE">Fine</option>
              <option value="EXPENSE">Expense</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">
                Amount {type === "FINE" && isPercentage ? "(%)" : "(₹)"}
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            {type === "FINE" && (
              <label className="flex items-center gap-1.5 text-sm text-navy-700 pb-2">
                <input type="checkbox" checked={isPercentage} onChange={(e) => setIsPercentage(e.target.checked)} />
                % based
              </label>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Remark / reason (mandatory)</label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
              className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="text-sm px-3 py-2 rounded-lg text-navy-500 hover:bg-navy-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="text-sm px-4 py-2 rounded-lg bg-navy-700 hover:bg-navy-900 text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add deduction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function IncentiveModal({ target, onClose, onSaved }) {
  const toast = useToast();
  const { employee, salary } = target;
  const [type, setType] = useState("INCENTIVE");
  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!remark.trim()) {
      setError("A remark/reason is mandatory for every incentive/expense entry.");
      return;
    }
    setSaving(true);
    try {
      await addSalaryIncentive(salary._id, {
        type,
        amount: Number(amount),
        remark,
      });
      toast.success("Incentive/expense added.");
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not add incentive/expense.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">Add incentive / expense</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-navy-500 mb-3">{employee.name} — {employee.labourId}</p>
        <p className="text-xs text-navy-300 mb-3">This amount is added on top of the net salary.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Type</label>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full"
            >
              <option value="INCENTIVE">Incentive / bonus</option>
              <option value="EXPENSE">Expense reimbursement</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Remark / reason (mandatory)</label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
              className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="text-sm px-3 py-2 rounded-lg text-navy-500 hover:bg-navy-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="text-sm px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add incentive/expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
