import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Search, X, FileText } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  getPurchaseRequisitions,
  createPurchaseRequisition,
  decidePurchaseRequisition,
  getItems,
  getSites,
} from "../api/endpoints.js";
import { SkeletonTableRows } from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Select from "../components/ui/Select.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import usePagination from "../hooks/usePagination.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { ApprovalButtons, ApprovalRemarkModal } from "../components/ApprovalActions.jsx";

export default function PurchaseRequisitions() {
  const { user } = useAuth();
  const toast = useToast();

  // Admin (and Super Admin) can raise requisitions.
  const canCreate = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  // Management (and Super Admin) hold the approval gate.
  const canDecide = user?.role === "SUPER_ADMIN" || user?.role === "MANAGEMENT";
  // Purchase Manager's list is server-filtered to APPROVED only — the status
  // filter control is hidden for that role since there's nothing to filter.
  const isPurchaseManager = user?.role === "PURCHASE_MANAGER";

  const [requisitions, setRequisitions] = useState([]);
  const [items, setItems] = useState([]);
  const [sites, setSites] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [decisionTarget, setDecisionTarget] = useState(null); // { requisition, decision }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, itemsRes, sitesRes] = await Promise.all([
        getPurchaseRequisitions(),
        getItems({ isActive: true }),
        getSites(),
      ]);
      setRequisitions(reqRes.data.data);
      setItems(itemsRes.data.data);
      setSites(sitesRes.data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load purchase requisitions.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((r) => {
      const matchesSearch =
        !search ||
        r.prNumber?.toLowerCase().includes(search.toLowerCase()) ||
        r.department?.toLowerCase().includes(search.toLowerCase()) ||
        r.item?.name?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !statusFilter || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requisitions, search, statusFilter]);

  const { page, setPage, pageItems, pageSize, total } = usePagination(filteredRequisitions, 10);
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, setPage]);

  const columnCount = canDecide ? 9 : 8;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-navy-700">Purchase requisitions</h1>
        {canCreate && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 text-sm rounded-lg bg-navy-700 hover:bg-navy-900 text-white px-3 py-2"
          >
            <Plus size={16} />
            Raise requisition
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by PR number, department or item"
            className="w-full pl-9 pr-3 py-2 text-sm border border-navy-100 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
        {!isPurchaseManager && (
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-44">
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        )}
      </div>

      <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-300 border-b border-navy-100">
                <th className="px-4 py-2 font-medium">PR number</th>
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-4 py-2 font-medium">Qty</th>
                <th className="px-4 py-2 font-medium">Department</th>
                <th className="px-4 py-2 font-medium">Required by</th>
                <th className="px-4 py-2 font-medium">Priority</th>
                <th className="px-4 py-2 font-medium">Requested by</th>
                <th className="px-4 py-2 font-medium">Status</th>
                {canDecide && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={5} columns={columnCount} />}
              {!loading && filteredRequisitions.length === 0 && (
                <tr>
                  <td colSpan={columnCount}>
                    <EmptyState
                      icon={FileText}
                      title="No purchase requisitions found."
                      description={
                        isPurchaseManager
                          ? "No approved requisitions are waiting on an RFQ yet."
                          : canCreate
                          ? "Raise a requisition to get purchasing started."
                          : "No requisitions match this search."
                      }
                    />
                  </td>
                </tr>
              )}
              {!loading &&
                pageItems.map((r) => (
                  <tr key={r._id} className="border-b border-navy-50 last:border-0">
                    <td className="px-4 py-2 font-mono text-xs text-navy-500">{r.prNumber}</td>
                    <td className="px-4 py-2 text-navy-700 font-medium">
                      {r.item?.name || "-"}
                      {r.item?.itemCode && <span className="block text-xs text-navy-300 font-normal">{r.item.itemCode}</span>}
                    </td>
                    <td className="px-4 py-2 text-navy-500">
                      {r.quantity} {r.item?.unit || ""}
                    </td>
                    <td className="px-4 py-2 text-navy-500">{r.department}</td>
                    <td className="px-4 py-2 text-navy-500">
                      {r.requiredDate ? new Date(r.requiredDate).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge value={r.priority} type="priority" />
                    </td>
                    <td className="px-4 py-2 text-navy-500">{r.requestedBy?.name || "-"}</td>
                    <td className="px-4 py-2">
                      <StatusBadge value={r.status} />
                    </td>
                    {canDecide && (
                      <td className="px-4 py-2">
                        {r.status === "PENDING" ? (
                          <ApprovalButtons
                            onApprove={() => setDecisionTarget({ requisition: r, decision: "APPROVED" })}
                            onReject={() => setDecisionTarget({ requisition: r, decision: "REJECTED" })}
                          />
                        ) : (
                          <span className="text-xs text-navy-300">
                            {r.decidedBy?.name ? `by ${r.decidedBy.name}` : "-"}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="requisitions" />
      </div>

      {createOpen && (
        <RequisitionFormModal
          items={items}
          sites={sites}
          user={user}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}

      {decisionTarget && (
        <ApprovalRemarkModal
          decision={decisionTarget.decision}
          title={`${decisionTarget.decision === "APPROVED" ? "Approve" : "Reject"} ${decisionTarget.requisition.prNumber}`}
          subtitle={`${decisionTarget.requisition.item?.name} · ${decisionTarget.requisition.quantity} ${
            decisionTarget.requisition.item?.unit || ""
          } for ${decisionTarget.requisition.department}`}
          remarkLabel="Remark (optional)"
          successMessage={`Requisition ${decisionTarget.requisition.prNumber} ${
            decisionTarget.decision === "APPROVED" ? "approved" : "rejected"
          }.`}
          onSubmit={async (remark) => {
            await decidePurchaseRequisition(decisionTarget.requisition._id, {
              decision: decisionTarget.decision,
              decisionRemark: remark,
            });
            load();
          }}
          onClose={() => setDecisionTarget(null)}
        />
      )}
    </div>
  );
}

function RequisitionFormModal({ items, sites, user, onClose, onSaved }) {
  const toast = useToast();
  const isSiteScoped = user?.role === "ADMIN";
  const [form, setForm] = useState({
    department: "",
    item: "",
    quantity: "",
    requiredDate: "",
    purpose: "",
    priority: "MEDIUM",
    site: isSiteScoped ? user?.site?._id || user?.site || "" : "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.department || !form.item || !form.quantity || !form.requiredDate || !form.site) {
      setError("Department, item, quantity, required date and site are all required.");
      return;
    }
    setSaving(true);
    try {
      await createPurchaseRequisition({
        department: form.department,
        item: form.item,
        quantity: Number(form.quantity),
        requiredDate: form.requiredDate,
        purpose: form.purpose,
        priority: form.priority,
        site: form.site,
      });
      toast.success("Purchase requisition raised.");
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not raise purchase requisition.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">Raise purchase requisition</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-navy-700 mb-1">Department</label>
              <input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="e.g. Farm Operations"
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-navy-700 mb-1">Item</label>
              <Select value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} className="w-full">
                <option value="">Select item</option>
                {items.map((i) => (
                  <option key={i._id} value={i._id}>
                    {i.name} ({i.itemCode})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Quantity</label>
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Required by</label>
              <input
                type="date"
                value={form.requiredDate}
                onChange={(e) => setForm({ ...form, requiredDate: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Priority</label>
              <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Site</label>
              {isSiteScoped ? (
                <input
                  disabled
                  value={user?.site?.name || "Your site"}
                  className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 bg-navy-50 text-navy-400"
                />
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
            <div className="col-span-2">
              <label className="block text-xs font-medium text-navy-700 mb-1">Purpose (optional)</label>
              <input
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
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
              {saving ? "Raising..." : "Raise requisition"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


