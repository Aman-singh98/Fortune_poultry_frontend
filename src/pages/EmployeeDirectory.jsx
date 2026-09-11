import { useEffect, useState, useCallback } from "react";
import { Plus, Search, X, Users, Pencil, Trash2, Power, Globe2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSiteScope } from "../context/SiteScopeContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
  deleteEmployee,
  getWageMasters,
} from "../api/endpoints.js";
import { SkeletonTableRows } from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Select from "../components/ui/Select.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import usePagination from "../hooks/usePagination.js";

const WAGES_SUB_CATEGORIES = [
  { value: "CONSTRUCTION_LABOUR", label: "Construction labour" },
  { value: "PAINTER", label: "Painter" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "ELECTRICIAN", label: "Electrician" },
];

// Where this employee shows up: their site names, or "All sites".
function siteLabel(emp) {
  if (emp.allSites) return "All sites";
  const extra = (emp.sites || []).map((s) => s.name).filter(Boolean);
  const home = emp.site?.name;
  return [home, ...extra].filter(Boolean).join(", ") || "-";
}

/**
 * Shared employee/labour directory. `lockedType` fixes the page to either
 * PERMANENT employees (used by the "Employees" page) or WAGES labour (used
 * by the "Labour / Wages" page) — the two are separate sections in the UI
 * but share the same underlying record, attendance and salary calculation.
 */
export default function EmployeeDirectory({ lockedType, pageTitle, emptyLabel }) {
  const { user } = useAuth();
  const { sites, selectedSiteId, isSuperAdmin } = useSiteScope();
  const toast = useToast();
  const [employees, setEmployees] = useState([]);
  const [wageMasters, setWageMasters] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [statusBusyId, setStatusBusyId] = useState(null);

  const siteParam = isSuperAdmin && selectedSiteId ? { site: selectedSiteId } : {};

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, wmRes] = await Promise.all([
        getEmployees({
          ...siteParam,
          search: search || undefined,
          employeeType: lockedType,
          wagesSubCategory: lockedType === "WAGES" && categoryFilter ? categoryFilter : undefined,
        }),
        getWageMasters(),
      ]);
      setEmployees(empRes.data.data);
      setWageMasters(wmRes.data.data);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, search, categoryFilter, lockedType]);

  useEffect(() => {
    load();
  }, [load]);

  const { page, setPage, pageItems, pageSize, total } = usePagination(employees, 10);
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, selectedSiteId, setPage]);

  // Active/inactive status change, edit, and delete are Super Admin only actions.
  const handleToggleStatus = async (emp) => {
    setStatusBusyId(emp._id);
    try {
      await updateEmployeeStatus(emp._id, !emp.isActive);
      toast.success(`${emp.name} marked ${!emp.isActive ? "active" : "inactive"}.`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update status.");
    } finally {
      setStatusBusyId(null);
    }
  };

  const handleDelete = async (emp) => {
    if (!confirm(`Delete ${emp.name}? This cannot be undone.`)) return;
    try {
      await deleteEmployee(emp._id);
      toast.success(`${emp.name} deleted.`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete employee.");
    }
  };

  const isWagesPage = lockedType === "WAGES";
  const codeLabel = isWagesPage ? "Labour ID" : "Employee code";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-navy-700">{pageTitle}</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 text-sm rounded-lg bg-navy-700 hover:bg-navy-900 text-white px-3 py-2"
        >
          <Plus size={16} />
          {isWagesPage ? "Add labour" : "Add employee"}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name"
            className="w-full pl-9 pr-3 py-2 text-sm border border-navy-100 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
        {isWagesPage && (
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-48"
          >
            <option value="">All categories</option>
            {WAGES_SUB_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-300 border-b border-navy-100">
                <th className="px-4 py-2 font-medium">{codeLabel}</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Site</th>
                <th className="px-4 py-2 font-medium">{isWagesPage ? "Category" : "Designation"}</th>
                {!isWagesPage && <th className="px-4 py-2 font-medium">Basic salary</th>}
                <th className="px-4 py-2 font-medium">Wage master</th>
                <th className="px-4 py-2 font-medium">Status</th>
                {isSuperAdmin && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={5} columns={isSuperAdmin ? 8 : 7} />}
              {!loading && employees.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 8 : 7}>
                    <EmptyState
                      icon={Users}
                      title={isWagesPage ? "No labour records yet." : "No employees yet."}
                      description={
                        emptyLabel ||
                        "Add your first record to start tracking attendance and salary."
                      }
                    />
                  </td>
                </tr>
              )}
              {!loading &&
                pageItems.map((emp) => (
                  <tr key={emp._id} className="border-b border-navy-50 last:border-0">
                    <td className="px-4 py-2 font-mono text-xs text-navy-500">
                      {isWagesPage ? emp.labourId : emp.employeeCode || emp.labourId}
                    </td>
                    <td className="px-4 py-2 text-navy-700">{emp.name}</td>
                    <td className="px-4 py-2 text-navy-500">
                      <span className="inline-flex items-center gap-1">
                        {emp.allSites && <Globe2 size={13} className="text-accent-500" />}
                        {siteLabel(emp)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {isWagesPage ? (
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-navy-50 text-navy-500">
                          {WAGES_SUB_CATEGORIES.find((c) => c.value === emp.wagesSubCategory)?.label || "-"}
                        </span>
                      ) : (
                        <span className="text-navy-500">{emp.designation || "-"}</span>
                      )}
                    </td>
                    {!isWagesPage && (
                      <td className="px-4 py-2 text-navy-500">
                        {emp.basicSalary ? `₹${emp.basicSalary.toLocaleString("en-IN")}` : "-"}
                      </td>
                    )}
                    <td className="px-4 py-2 text-navy-500">{emp.wageMaster?.name || "-"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                          emp.isActive ? "bg-green-50 text-green-700" : "bg-navy-50 text-navy-400"
                        }`}
                      >
                        {emp.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditTarget(emp)}
                            title="Edit"
                            className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-500"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(emp)}
                            disabled={statusBusyId === emp._id}
                            title={emp.isActive ? "Mark inactive" : "Mark active"}
                            className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-500 disabled:opacity-50"
                          >
                            <Power size={15} className={statusBusyId === emp._id ? "animate-pulse" : ""} />
                          </button>
                          <button
                            onClick={() => handleDelete(emp)}
                            title="Delete"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel={isWagesPage ? "labour records" : "employees"} />
      </div>

      {modalOpen && (
        <EmployeeFormModal
          mode="create"
          lockedType={lockedType}
          isSuperAdmin={isSuperAdmin}
          sites={isSuperAdmin ? sites : sites.filter((s) => s._id === (user?.site?._id || user?.site))}
          wageMasters={wageMasters}
          defaultSite={!isSuperAdmin ? user?.site?._id || user?.site : ""}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            load();
          }}
        />
      )}

      {editTarget && (
        <EmployeeFormModal
          mode="edit"
          lockedType={lockedType}
          isSuperAdmin={isSuperAdmin}
          employee={editTarget}
          sites={sites}
          wageMasters={wageMasters}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function EmployeeFormModal({ mode, lockedType, isSuperAdmin, employee, sites, wageMasters, defaultSite, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = mode === "edit";
  const homeSite = employee?.site?._id || employee?.site || defaultSite || "";
  const initialVisibility = employee?.allSites
    ? "ALL"
    : (employee?.sites || []).length
    ? "MULTI"
    : "SINGLE";

  const [form, setForm] = useState({
    name: employee?.name || "",
    phone: employee?.phone || "",
    employeeCode: employee?.employeeCode || "",
    designation: employee?.designation || "",
    probationPeriod: employee?.probationPeriod ?? 0,
    remarks: employee?.remarks || "",
    site: homeSite,
    visibility: initialVisibility, // SINGLE | MULTI | ALL
    extraSites: (employee?.sites || []).map((s) => s._id || s),
    employeeType: lockedType || employee?.employeeType || "PERMANENT",
    wagesSubCategory: employee?.wagesSubCategory || "",
    basicSalary: employee?.basicSalary || "",
    wageMaster: employee?.wageMaster?._id || employee?.wageMaster || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isWages = form.employeeType === "WAGES";

  const toggleExtraSite = (siteId) => {
    setForm((f) => ({
      ...f,
      extraSites: f.extraSites.includes(siteId)
        ? f.extraSites.filter((id) => id !== siteId)
        : [...f.extraSites, siteId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || (!isEdit && !form.site)) {
      setError("Name and site are required.");
      return;
    }
    if (isWages && !form.wagesSubCategory) {
      setError("Pick a wages sub-category.");
      return;
    }
    if (isWages && !form.wageMaster) {
      setError("Wage master is required so salary can be calculated for this labour record.");
      return;
    }
    if (!isWages && !form.wageMaster && !form.basicSalary) {
      setError("Enter a basic salary or select a wage master so salary can be calculated.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        employeeCode: form.employeeCode || undefined,
        designation: form.designation,
        probationPeriod: Number(form.probationPeriod) || 0,
        remarks: form.remarks,
        employeeType: form.employeeType,
        wagesSubCategory: isWages ? form.wagesSubCategory : null,
        basicSalary: form.basicSalary === "" ? 0 : Number(form.basicSalary),
        wageMaster: form.wageMaster || null,
        allSites: form.visibility === "ALL",
        sites: form.visibility === "MULTI" ? form.extraSites : [],
      };
      if (!isEdit) payload.site = form.site;

      if (isEdit) {
        await updateEmployee(employee._id, payload);
        toast.success(`${form.name} updated.`);
      } else {
        await createEmployee(payload);
        toast.success(`${form.name} added.`);
      }
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || `Could not ${isEdit ? "update" : "create"} record.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">
            {isEdit ? "Edit" : "Add"} {lockedType === "WAGES" ? "labour" : "employee"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">
                {lockedType === "WAGES" ? "Labour code" : "Employee code"}
              </label>
              <input
                value={form.employeeCode}
                onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
                placeholder="Auto-generated if left blank"
                disabled={isEdit}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Designation</label>
              <input
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                placeholder="e.g. Site Supervisor"
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Home site</label>
            {isEdit ? (
              <>
                <Select value={form.site} disabled className="w-full opacity-60">
                  <option value={form.site}>{sites.find((s) => s._id === form.site)?.name || "—"}</option>
                </Select>
                <p className="text-xs text-navy-300 mt-1">Home site cannot be changed after creation.</p>
              </>
            ) : (
              <Select value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} className="w-full">
                <option value="">Select site</option>
                {sites.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </div>

          {isSuperAdmin && (
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">
                Site visibility — where can this {lockedType === "WAGES" ? "labour" : "employee"} be seen/handled?
              </label>
              <div className="flex flex-wrap gap-4 text-sm text-navy-700">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={form.visibility === "SINGLE"}
                    onChange={() => setForm({ ...form, visibility: "SINGLE" })}
                  />
                  Home site only
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={form.visibility === "MULTI"}
                    onChange={() => setForm({ ...form, visibility: "MULTI" })}
                  />
                  Specific sites
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={form.visibility === "ALL"}
                    onChange={() => setForm({ ...form, visibility: "ALL" })}
                  />
                  All sites (transferable)
                </label>
              </div>
              {form.visibility === "MULTI" && (
                <div className="mt-2 grid grid-cols-2 gap-1.5 border border-navy-100 rounded-lg p-2 max-h-32 overflow-y-auto">
                  {sites
                    .filter((s) => s._id !== form.site)
                    .map((s) => (
                      <label key={s._id} className="flex items-center gap-1.5 text-xs text-navy-600">
                        <input
                          type="checkbox"
                          checked={form.extraSites.includes(s._id)}
                          onChange={() => toggleExtraSite(s._id)}
                        />
                        {s.name}
                      </label>
                    ))}
                </div>
              )}
              <p className="text-xs text-navy-300 mt-1">
                "All sites" makes this record visible and operable (attendance/salary) from every site.
              </p>
            </div>
          )}

          {!lockedType && (
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Employee type</label>
              <div className="flex gap-4 text-sm text-navy-700">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={form.employeeType === "PERMANENT"}
                    onChange={() => setForm({ ...form, employeeType: "PERMANENT", wagesSubCategory: "" })}
                  />
                  Permanent
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={form.employeeType === "WAGES"}
                    onChange={() => setForm({ ...form, employeeType: "WAGES" })}
                  />
                  Wages
                </label>
              </div>
            </div>
          )}

          {isWages && (
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Wages sub-category</label>
              <Select
                value={form.wagesSubCategory}
                onChange={(e) => setForm({ ...form, wagesSubCategory: e.target.value })}
                className="w-full"
              >
                <option value="">Select sub-category</option>
                {WAGES_SUB_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {!isWages && (
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">Basic salary (₹/month)</label>
                <input
                  type="number"
                  min="0"
                  value={form.basicSalary}
                  onChange={(e) => setForm({ ...form, basicSalary: e.target.value })}
                  placeholder="e.g. 20000"
                  className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Probation period (months)</label>
              <input
                type="number"
                min="0"
                value={form.probationPeriod}
                onChange={(e) => setForm({ ...form, probationPeriod: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">
              Wage master {isWages && <span className="text-red-500">*</span>}
            </label>
            <Select
              value={form.wageMaster}
              onChange={(e) => setForm({ ...form, wageMaster: e.target.value })}
              className="w-full"
            >
              <option value="">Select wage master</option>
              {wageMasters.map((wm) => (
                <option key={wm._id} value={wm._id}>
                  {wm.name} (₹{wm.dayRate}/day)
                </option>
              ))}
            </Select>
            <p className="text-xs text-navy-300 mt-1">
              {isWages
                ? "Required — used to calculate this labour record's salary."
                : "Optional if a basic salary is set above — used for overtime/commission rates."}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Remarks</label>
            <textarea
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              rows={2}
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
              {saving ? "Saving..." : isEdit ? "Save changes" : `Add ${lockedType === "WAGES" ? "labour" : "employee"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
