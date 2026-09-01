import { useEffect, useState, useCallback } from "react";
import { Plus, X, Check, Ban, CalendarDays } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSiteScope } from "../context/SiteScopeContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getEmployees, getLeaves, createLeave, decideLeave } from "../api/endpoints.js";
import { SkeletonTableRows } from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Select from "../components/ui/Select.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import usePagination from "../hooks/usePagination.js";
import StatusBadge from "../components/StatusBadge.jsx";


function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export default function Leave() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { selectedSiteId } = useSiteScope();
  const toast = useToast();

  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [decidingId, setDecidingId] = useState(null);

  const siteParam = isSuperAdmin && selectedSiteId ? { site: selectedSiteId } : {};

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [leaveRes, empRes] = await Promise.all([
        getLeaves({ ...siteParam, status: statusFilter || undefined }),
        !isSuperAdmin ? getEmployees(siteParam) : Promise.resolve({ data: { data: [] } }),
      ]);
      setLeaves(leaveRes.data.data);
      setEmployees(empRes.data.data);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, statusFilter, isSuperAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const { page, setPage, pageItems, pageSize, total } = usePagination(leaves, 10);
  useEffect(() => {
    setPage(1);
  }, [statusFilter, selectedSiteId, setPage]);

  const handleDecision = async (id, decision) => {
    const decisionRemark = decision === "REJECTED" ? prompt("Reason for rejecting (optional):") || "" : "";
    setDecidingId(id);
    try {
      await decideLeave(id, { decision, decisionRemark });
      toast.success(decision === "APPROVED" ? "Leave approved." : "Leave rejected.");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not record decision.");
    } finally {
      setDecidingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-navy-700">Leave</h1>
        <div className="flex gap-2">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-40"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
          {!isSuperAdmin && (
            <button
              onClick={() => setRequestOpen(true)}
              className="flex items-center gap-1.5 text-sm rounded-lg bg-navy-700 hover:bg-navy-900 text-white px-3 py-2"
            >
              <Plus size={16} />
              Request leave
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-300 border-b border-navy-100">
                <th className="px-4 py-2 font-medium">Employee</th>
                <th className="px-4 py-2 font-medium">Site</th>
                <th className="px-4 py-2 font-medium">Dates</th>
                <th className="px-4 py-2 font-medium">Reason</th>
                <th className="px-4 py-2 font-medium">Status</th>
                {isSuperAdmin && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={4} columns={isSuperAdmin ? 6 : 5} />}
              {!loading && leaves.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5}>
                    <EmptyState
                      icon={CalendarDays}
                      title="No leave requests."
                      description={isSuperAdmin ? "Leave requests submitted by Admins will appear here." : "Request leave for an employee at your site to get started."}
                    />
                  </td>
                </tr>
              )}
              {!loading &&
                pageItems.map((lv) => (
                  <tr key={lv._id} className="border-b border-navy-50 last:border-0">
                    <td className="px-4 py-2 text-navy-700 font-medium">
                      {lv.employee?.name}
                      <span className="block text-xs text-navy-300 font-mono">{lv.employee?.labourId}</span>
                    </td>
                    <td className="px-4 py-2 text-navy-500">{lv.site?.name}</td>
                    <td className="px-4 py-2 text-navy-500">
                      {new Date(lv.fromDate).toLocaleDateString()} – {new Date(lv.toDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-navy-500 max-w-[220px] truncate" title={lv.reason}>{lv.reason || "-"}</td>
                    <td className="px-4 py-2">
                      <StatusBadge value={lv.status} />
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-2">
                        {lv.status === "PENDING" ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDecision(lv._id, "APPROVED")}
                              disabled={decidingId === lv._id}
                              title="Approve"
                              className="p-1.5 rounded-lg hover:bg-green-50 text-green-700 disabled:opacity-50"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              onClick={() => handleDecision(lv._id, "REJECTED")}
                              disabled={decidingId === lv._id}
                              title="Reject"
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-700 disabled:opacity-50"
                            >
                              <Ban size={15} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-navy-300">
                            {lv.decidedBy?.name ? `by ${lv.decidedBy.name}` : "-"}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="leave requests" />
      </div>

      {requestOpen && (
        <RequestLeaveModal
          employees={employees}
          onClose={() => setRequestOpen(false)}
          onCreated={() => {
            setRequestOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function RequestLeaveModal({ employees, onClose, onCreated }) {
  const toast = useToast();
  const { month, year } = currentMonthYear();
  const [form, setForm] = useState({
    employee: "",
    fromDate: "",
    toDate: "",
    reason: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.employee || !form.fromDate || !form.toDate) {
      setError("Employee, from date, and to date are required.");
      return;
    }
    setSaving(true);
    try {
      const fromDate = new Date(form.fromDate);
      await createLeave({
        employee: form.employee,
        fromDate: form.fromDate,
        toDate: form.toDate,
        reason: form.reason,
        month: fromDate.getMonth() + 1,
        year: fromDate.getFullYear(),
      });
      toast.success("Leave request submitted.");
      onCreated();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not submit leave request.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">Request leave</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Employee</label>
            <Select
              value={form.employee}
              onChange={(e) => setForm({ ...form, employee: e.target.value })}
              className="w-full"
            >
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} ({emp.labourId})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">From date</label>
              <input
                type="date"
                value={form.fromDate}
                onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">To date</label>
              <input
                type="date"
                value={form.toDate}
                onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Reason</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
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
              {saving ? "Submitting..." : "Submit request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
