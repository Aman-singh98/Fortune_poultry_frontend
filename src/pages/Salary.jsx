import { Fragment, useEffect, useState, useCallback, useMemo } from "react";
import { X, Plus, ChevronDown, ChevronUp, RefreshCw, Banknote } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSiteScope } from "../context/SiteScopeContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getEmployees, getSalaries, generateSalary, addSalaryDeduction } from "../api/endpoints.js";
import { SkeletonTableRows } from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Select from "../components/ui/Select.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import usePagination from "../hooks/usePagination.js";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export default function Salary() {
  const { user } = useAuth();
  const { sites, selectedSiteId, isSuperAdmin } = useSiteScope();
  const toast = useToast();
  const [{ month, year }, setPeriod] = useState(currentMonthYear());
  const [employees, setEmployees] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [deductionTarget, setDeductionTarget] = useState(null); // { employee, salary }
  const [generatingId, setGeneratingId] = useState(null);

  const siteParam = isSuperAdmin && selectedSiteId ? { site: selectedSiteId } : {};

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, salRes] = await Promise.all([
        getEmployees({ ...siteParam, isActive: true }),
        getSalaries({ ...siteParam, month, year }),
      ]);
      setEmployees(empRes.data.data);
      setSalaries(salRes.data.data);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, month, year]);

  useEffect(() => {
    load();
  }, [load]);

  const { page, setPage, pageItems, pageSize, total } = usePagination(employees, 10);
  useEffect(() => {
    setPage(1);
  }, [month, year, selectedSiteId, setPage]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-navy-700">Salary</h1>
        <div className="flex gap-2">
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
        </div>
      </div>

      <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-300 border-b border-navy-100">
                <th className="px-4 py-2 font-medium">Employee</th>
                <th className="px-4 py-2 font-medium">Site</th>
                <th className="px-4 py-2 font-medium">Gross earning</th>
                <th className="px-4 py-2 font-medium">Deductions</th>
                <th className="px-4 py-2 font-medium">Net salary</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={5} columns={6} />}
              {!loading && employees.length === 0 && (
                <tr>
                  <td colSpan={6}>
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
                          <span className="block text-xs text-navy-300 font-mono">{emp.labourId}</span>
                        </td>
                        <td className="px-4 py-2 text-navy-500">{emp.site?.name}</td>
                        <td className="px-4 py-2 text-navy-700">
                          {salary ? `₹${salary.grossEarning.toFixed(2)}` : "-"}
                        </td>
                        <td className="px-4 py-2 text-navy-500">
                          {salary ? `₹${salary.totalDeductions.toFixed(2)}` : "-"}
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
                          <td colSpan={6} className="px-4 py-4">
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
          <dt>Egg/bird commission</dt><dd className="text-right font-medium">₹{salary.earnings.salesCommission.toFixed(2)}</dd>
        </dl>
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
