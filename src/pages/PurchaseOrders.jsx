import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Search, X, ShoppingCart, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getPurchaseOrders, createPurchaseOrder, closePurchaseOrder, getQuotations } from "../api/endpoints.js";
import { SkeletonTableRows } from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Select from "../components/ui/Select.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import usePagination from "../hooks/usePagination.js";
import StatusBadge from "../components/StatusBadge.jsx";


export default function PurchaseOrders() {
  const { user } = useAuth();
  const toast = useToast();
  // Accounts (and Super Admin) create and close POs; Purchase Manager gets a
  // read-only view — enforced server-side too, this just hides the actions.
  const canManage = user?.role === "SUPER_ADMIN" || user?.role === "ACCOUNTS";

  const [orders, setOrders] = useState([]);
  const [availableQuotations, setAvailableQuotations] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [closeTarget, setCloseTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [getPurchaseOrders()];
      if (canManage) requests.push(getQuotations());
      const [ordersRes, quotationsRes] = await Promise.all(requests);
      setOrders(ordersRes.data.data);

      if (canManage) {
        const usedQuotationIds = new Set(ordersRes.data.data.map((po) => po.quotationRef?._id || po.quotationRef));
        const selected = (quotationsRes?.data.data || []).filter(
          (q) => q.selected && !usedQuotationIds.has(q._id)
        );
        setAvailableQuotations(selected);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load purchase orders.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredOrders = useMemo(() => {
    return orders.filter((po) => {
      const matchesSearch =
        !search ||
        po.poNumber?.toLowerCase().includes(search.toLowerCase()) ||
        po.vendor?.name?.toLowerCase().includes(search.toLowerCase()) ||
        po.item?.name?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !statusFilter || po.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const { page, setPage, pageItems, pageSize, total } = usePagination(filteredOrders, 10);
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, setPage]);

  const handleClose = async (po) => {
    setCloseTarget(po._id);
    try {
      await closePurchaseOrder(po._id);
      toast.success(`${po.poNumber} closed.`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not close purchase order.");
    } finally {
      setCloseTarget(null);
    }
  };

  const columnCount = canManage ? 9 : 8;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-navy-700">Purchase orders</h1>
        {canManage && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 text-sm rounded-lg bg-navy-700 hover:bg-navy-900 text-white px-3 py-2"
          >
            <Plus size={16} />
            Create PO
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by PO number, vendor or item"
            className="w-full pl-9 pr-3 py-2 text-sm border border-navy-100 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-44">
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-300 border-b border-navy-100">
                <th className="px-4 py-2 font-medium">PO number</th>
                <th className="px-4 py-2 font-medium">Vendor</th>
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-4 py-2 font-medium">Qty</th>
                <th className="px-4 py-2 font-medium">Rate (₹)</th>
                <th className="px-4 py-2 font-medium">Total (₹)</th>
                <th className="px-4 py-2 font-medium">Delivery date</th>
                <th className="px-4 py-2 font-medium">Status</th>
                {canManage && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={5} columns={columnCount} />}
              {!loading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={columnCount}>
                    <EmptyState
                      icon={ShoppingCart}
                      title="No purchase orders found."
                      description={
                        canManage
                          ? "Create a PO from a Management-approved (selected) quotation."
                          : "No purchase orders match this search."
                      }
                    />
                  </td>
                </tr>
              )}
              {!loading &&
                pageItems.map((po) => (
                  <tr key={po._id} className="border-b border-navy-50 last:border-0">
                    <td className="px-4 py-2 font-mono text-xs text-navy-500">{po.poNumber}</td>
                    <td className="px-4 py-2 text-navy-700 font-medium">{po.vendor?.name || "-"}</td>
                    <td className="px-4 py-2 text-navy-500">
                      {po.item?.name || "-"}
                      {po.item?.itemCode && <span className="block text-xs text-navy-300">{po.item.itemCode}</span>}
                    </td>
                    <td className="px-4 py-2 text-navy-500">
                      {po.quantity} {po.item?.unit || ""}
                    </td>
                    <td className="px-4 py-2 text-navy-500">{po.rate?.toFixed(2)}</td>
                    <td className="px-4 py-2 font-semibold text-navy-700">{po.totalAmount?.toFixed(2)}</td>
                    <td className="px-4 py-2 text-navy-500">
                      {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge value={po.status} />
                    </td>
                    {canManage && (
                      <td className="px-4 py-2">
                        {po.status === "OPEN" ? (
                          <button
                            onClick={() => handleClose(po)}
                            disabled={closeTarget === po._id}
                            title="Close purchase order"
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-navy-100 text-navy-500 hover:bg-navy-50 disabled:opacity-50"
                          >
                            <Lock size={12} />
                            Close
                          </button>
                        ) : (
                          <span className="text-xs text-navy-300">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="purchase orders" />
      </div>

      {createOpen && (
        <CreatePoModal
          availableQuotations={availableQuotations}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreatePoModal({ availableQuotations, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    quotationRef: "",
    deliveryLocation: "",
    deliveryDate: "",
    paymentTerms: "",
    specialInstructions: "",
    hsnCode: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedQuotation = availableQuotations.find((q) => q._id === form.quotationRef) || null;

  const handleQuotationChange = (id) => {
    const q = availableQuotations.find((x) => x._id === id);
    setForm({ ...form, quotationRef: id, paymentTerms: q?.paymentTerms || form.paymentTerms });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.quotationRef) {
      setError("Select an approved quotation to build the PO from.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await createPurchaseOrder({
        quotationRef: form.quotationRef,
        deliveryLocation: form.deliveryLocation,
        deliveryDate: form.deliveryDate || undefined,
        paymentTerms: form.paymentTerms,
        specialInstructions: form.specialInstructions,
        hsnCode: form.hsnCode || undefined,
      });
      toast.success(`${data.data.poNumber} created.`);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not create purchase order.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">Create purchase order</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>

        {availableQuotations.length === 0 ? (
          <p className="text-sm text-navy-400 bg-navy-50 rounded-lg px-3 py-3">
            No Management-approved quotations are waiting on a PO right now. A purchase order can only be raised
            from a quotation Management has selected on the Quotation Comparison page.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Approved quotation</label>
              <Select value={form.quotationRef} onChange={(e) => handleQuotationChange(e.target.value)} className="w-full">
                <option value="">Select quotation</option>
                {availableQuotations.map((q) => (
                  <option key={q._id} value={q._id}>
                    {q.vendor?.name} — {q.item?.name} · ₹{q.finalLandedCost?.toFixed(2)}
                  </option>
                ))}
              </Select>
            </div>

            {selectedQuotation && (
              <div className="rounded-lg bg-navy-50 px-3 py-2 text-xs text-navy-500 grid grid-cols-2 gap-x-3 gap-y-1">
                <span>Qty: {selectedQuotation.quantity}</span>
                <span>Rate: ₹{selectedQuotation.rate?.toFixed(2)}</span>
                <span>GST: ₹{selectedQuotation.gst?.toFixed(2)}</span>
                <span>Freight: ₹{selectedQuotation.freight?.toFixed(2)}</span>
                <span>Discount: ₹{selectedQuotation.discount?.toFixed(2)}</span>
                <span className="font-medium text-navy-700">Total: ₹{selectedQuotation.finalLandedCost?.toFixed(2)}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">Delivery location</label>
                <input
                  value={form.deliveryLocation}
                  onChange={(e) => setForm({ ...form, deliveryLocation: e.target.value })}
                  className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">Delivery date</label>
                <input
                  type="date"
                  value={form.deliveryDate}
                  onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
                  className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">Payment terms</label>
                <input
                  value={form.paymentTerms}
                  onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                  className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">HSN code (optional)</label>
                <input
                  value={form.hsnCode}
                  onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                  placeholder="Defaults to item's HSN code"
                  className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Special instructions (optional)</label>
              <textarea
                value={form.specialInstructions}
                onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })}
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
                {saving ? "Creating..." : "Create purchase order"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
