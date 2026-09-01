import { useEffect, useState, useCallback } from "react";
import { Plus, Search, X, Users, Pencil, Trash2, Power } from "lucide-react";
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

export default function Employees() {
  const { user } = useAuth();
  const { sites, selectedSiteId, isSuperAdmin } = useSiteScope();
  const toast = useToast();
  const [employees, setEmployees] = useState([]);
  const [wageMasters, setWageMasters] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [statusBusyId, setStatusBusyId] = useState(null);

  const siteParam = isSuperAdmin && selectedSiteId ? { site: selectedSiteId } : {};

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, wmRes] = await Promise.all([
        getEmployees({ ...siteParam, search: search || undefined, employeeType: typeFilter || undefined }),
        getWageMasters(),
      ]);
      setEmployees(empRes.data.data);
      setWageMasters(wmRes.data.data);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, search, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const { page, setPage, pageItems, pageSize, total } = usePagination(employees, 10);
  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, selectedSiteId, setPage]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-navy-700">Employees</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 text-sm rounded-lg bg-navy-700 hover:bg-navy-900 text-white px-3 py-2"
        >
          <Plus size={16} />
          Add employee
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
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full sm:w-40"
        >
          <option value="">All types</option>
          <option value="PERMANENT">Permanent</option>
          <option value="WAGES">Wages</option>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-300 border-b border-navy-100">
                <th className="px-4 py-2 font-medium">Labour ID</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Site</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Wage master</th>
                <th className="px-4 py-2 font-medium">Status</th>
                {isSuperAdmin && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={5} columns={isSuperAdmin ? 7 : 6} />}
              {!loading && employees.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 6}>
                    <EmptyState
                      icon={Users}
                      title="No employees yet."
                      description="Add your first employee to start tracking attendance and salary."
                    />
                  </td>
                </tr>
              )}
              {!loading &&
                pageItems.map((emp) => (
                  <tr key={emp._id} className="border-b border-navy-50 last:border-0">
                    <td className="px-4 py-2 font-mono text-xs text-navy-500">{emp.labourId}</td>
                    <td className="px-4 py-2 text-navy-700">{emp.name}</td>
                    <td className="px-4 py-2 text-navy-500">{emp.site?.name}</td>
                    <td className="px-4 py-2">
                      <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-navy-50 text-navy-500">
                        {emp.employeeType === "WAGES"
                          ? WAGES_SUB_CATEGORIES.find((c) => c.value === emp.wagesSubCategory)?.label
                          : "Permanent"}
                      </span>
                    </td>
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
                            title="Edit employee"
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
                            title="Delete employee"
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
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="employees" />
      </div>

      {modalOpen && (
        <AddEmployeeModal
          sites={isSuperAdmin ? sites : sites.filter((s) => s._id === (user?.site?._id || user?.site))}
          wageMasters={wageMasters}
          defaultSite={!isSuperAdmin ? user?.site?._id || user?.site : ""}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            load();
          }}
        />
      )}

      {editTarget && (
        <EditEmployeeModal
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

function AddEmployeeModal({ sites, wageMasters, defaultSite, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    site: defaultSite || "",
    employeeType: "PERMANENT",
    wagesSubCategory: "",
    wageMaster: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.site) {
      setError("Name and site are required.");
      return;
    }
    if (form.employeeType === "WAGES" && !form.wagesSubCategory) {
      setError("Pick a wages sub-category.");
      return;
    }
    if (!form.wageMaster) {
      setError("Wage master is required so salary can be calculated for this employee.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (form.employeeType === "PERMANENT") delete payload.wagesSubCategory;
      await createEmployee(payload);
      toast.success(`${form.name} added.`);
      onCreated();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not create employee.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">Add employee</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
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

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Site</label>
            <Select
              value={form.site}
              onChange={(e) => setForm({ ...form, site: e.target.value })}
              className="w-full"
            >
              <option value="">Select site</option>
              {sites.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

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

          {form.employeeType === "WAGES" && (
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

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">
              Wage master <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.wageMaster}
              onChange={(e) => setForm({ ...form, wageMaster: e.target.value })}
              required
              className="w-full"
            >
              <option value="">Select wage master</option>
              {wageMasters.map((wm) => (
                <option key={wm._id} value={wm._id}>
                  {wm.name} (₹{wm.dayRate}/day)
                </option>
              ))}
            </Select>
            <p className="text-xs text-navy-300 mt-1">Required — used to calculate this employee's salary.</p>
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
              {saving ? "Saving..." : "Add employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditEmployeeModal({ employee, sites, wageMasters, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: employee.name || "",
    phone: employee.phone || "",
    site: employee.site?._id || employee.site || "",
    employeeType: employee.employeeType,
    wagesSubCategory: employee.wagesSubCategory || "",
    wageMaster: employee.wageMaster?._id || employee.wageMaster || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name) {
      setError("Name is required.");
      return;
    }
    if (form.employeeType === "WAGES" && !form.wagesSubCategory) {
      setError("Pick a wages sub-category.");
      return;
    }
    if (!form.wageMaster) {
      setError("Wage master is required so salary can be calculated for this employee.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        employeeType: form.employeeType,
        wagesSubCategory: form.employeeType === "WAGES" ? form.wagesSubCategory : null,
        wageMaster: form.wageMaster,
      };
      await updateEmployee(employee._id, payload);
      toast.success(`${form.name} updated.`);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not update employee.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">Edit employee</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
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

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Site</label>
            <Select value={form.site} disabled className="w-full opacity-60">
              <option value={form.site}>
                {sites.find((s) => s._id === form.site)?.name || "—"}
              </option>
            </Select>
            <p className="text-xs text-navy-300 mt-1">Site cannot be changed after creation.</p>
          </div>

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

          {form.employeeType === "WAGES" && (
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

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">
              Wage master <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.wageMaster}
              onChange={(e) => setForm({ ...form, wageMaster: e.target.value })}
              required
              className="w-full"
            >
              <option value="">Select wage master</option>
              {wageMasters.map((wm) => (
                <option key={wm._id} value={wm._id}>
                  {wm.name} (₹{wm.dayRate}/day)
                </option>
              ))}
            </Select>
            <p className="text-xs text-navy-300 mt-1">Required — used to calculate this employee's salary.</p>
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
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
