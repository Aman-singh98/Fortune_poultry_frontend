import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Search, X, PackageCheck, ClipboardCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getGoodsReceipts, createGoodsReceipt, verifyGoodsReceipt, getPurchaseOrders, getSites } from "../api/endpoints.js";
import { SkeletonTableRows } from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Select from "../components/ui/Select.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import usePagination from "../hooks/usePagination.js";
import StatusBadge from "../components/StatusBadge.jsx";


export default function GoodsReceipts() {
  const { user } = useAuth();
  const toast = useToast();
  const isStoreKeeper = user?.role === "SUPER_ADMIN" || user?.role === "STORE_KEEPER";
  // Store Keeper logs a GRN with accepted/rejected quantities on the spot;
  // Accounts can also log the vehicle/invoice arrival, but accepted/rejected
  // quantities stay 0/PENDING until a Store Keeper verifies it (RA v2.0
  // Sec. 8, point 7) — enforced server-side, mirrored here in the form.
  const canCreate = user?.role === "SUPER_ADMIN" || user?.role === "STORE_KEEPER" || user?.role === "ACCOUNTS";

  const [receipts, setReceipts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [sites, setSites] = useState([]);
  const [search, setSearch] = useState("");
  const [qualityFilter, setQualityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [receiptsRes, poRes, sitesRes] = await Promise.all([
        getGoodsReceipts(),
        getPurchaseOrders(),
        getSites(),
      ]);
      setReceipts(receiptsRes.data.data);
      setPurchaseOrders(poRes.data.data);
      setSites(sitesRes.data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load goods receipts.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((g) => {
      const matchesSearch =
        !search ||
        g.grnNumber?.toLowerCase().includes(search.toLowerCase()) ||
        g.poRef?.poNumber?.toLowerCase().includes(search.toLowerCase()) ||
        g.item?.name?.toLowerCase().includes(search.toLowerCase()) ||
        g.vendor?.name?.toLowerCase().includes(search.toLowerCase());
      const matchesQuality = !qualityFilter || g.qualityStatus === qualityFilter;
      return matchesSearch && matchesQuality;
    });
  }, [receipts, search, qualityFilter]);

  const { page, setPage, pageItems, pageSize, total } = usePagination(filteredReceipts, 10);
  useEffect(() => {
    setPage(1);
  }, [search, qualityFilter, setPage]);

  const columnCount = isStoreKeeper ? 9 : 8;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-navy-700">Goods receipts</h1>
        {canCreate && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 text-sm rounded-lg bg-navy-700 hover:bg-navy-900 text-white px-3 py-2"
          >
            <Plus size={16} />
            Log GRN
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by GRN number, PO, item or vendor"
            className="w-full pl-9 pr-3 py-2 text-sm border border-navy-100 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
        <Select value={qualityFilter} onChange={(e) => setQualityFilter(e.target.value)} className="w-full sm:w-44">
          <option value="">All quality statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PASSED">Passed</option>
          <option value="FAILED">Failed</option>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-300 border-b border-navy-100">
                <th className="px-4 py-2 font-medium">GRN number</th>
                <th className="px-4 py-2 font-medium">PO / vendor</th>
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-4 py-2 font-medium">Ordered</th>
                <th className="px-4 py-2 font-medium">Received</th>
                <th className="px-4 py-2 font-medium">Accepted</th>
                <th className="px-4 py-2 font-medium">Rejected</th>
                <th className="px-4 py-2 font-medium">Quality</th>
                {isStoreKeeper && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={5} columns={columnCount} />}
              {!loading && filteredReceipts.length === 0 && (
                <tr>
                  <td colSpan={columnCount}>
                    <EmptyState
                      icon={PackageCheck}
                      title="No goods receipts found."
                      description={canCreate ? "Log a GRN against an open purchase order." : "No goods receipts match this search."}
                    />
                  </td>
                </tr>
              )}
              {!loading &&
                pageItems.map((g) => (
                  <tr key={g._id} className="border-b border-navy-50 last:border-0">
                    <td className="px-4 py-2 font-mono text-xs text-navy-500">{g.grnNumber}</td>
                    <td className="px-4 py-2 text-navy-700 font-medium">
                      {g.poRef?.poNumber || "-"}
                      <span className="block text-xs text-navy-300 font-normal">{g.vendor?.name}</span>
                    </td>
                    <td className="px-4 py-2 text-navy-500">{g.item?.name || "-"}</td>
                    <td className="px-4 py-2 text-navy-500">
                      {g.orderedQuantity} {g.item?.unit || ""}
                    </td>
                    <td className="px-4 py-2 text-navy-500">
                      {g.receivedQuantity} {g.item?.unit || ""}
                    </td>
                    <td className="px-4 py-2 text-navy-700 font-medium">{g.acceptedQuantity}</td>
                    <td className="px-4 py-2 text-navy-500">{g.rejectedQuantity}</td>
                    <td className="px-4 py-2">
                      <StatusBadge value={g.qualityStatus} />
                    </td>
                    {isStoreKeeper && (
                      <td className="px-4 py-2">
                        {!g.verifiedBy ? (
                          <button
                            onClick={() => setVerifyTarget(g)}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-900 text-white"
                          >
                            <ClipboardCheck size={12} />
                            Verify
                          </button>
                        ) : (
                          <span className="text-xs text-navy-300">by {g.verifiedBy?.name}</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="goods receipts" />
      </div>

      {createOpen && (
        <GrnFormModal
          purchaseOrders={purchaseOrders}
          sites={sites}
          user={user}
          isStoreKeeper={isStoreKeeper}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}

      {verifyTarget && (
        <VerifyGrnModal
          receipt={verifyTarget}
          onClose={() => setVerifyTarget(null)}
          onVerified={() => {
            setVerifyTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function GrnFormModal({ purchaseOrders, sites, user, isStoreKeeper, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    poRef: "",
    site: isStoreKeeper ? user?.site?._id || user?.site || "" : "",
    vehicleNumber: "",
    invoiceNumber: "",
    receivedQuantity: "",
    batchLotNumber: "",
    storeLocation: "",
    acceptedQuantity: "",
    rejectedQuantity: "",
    qualityStatus: "PENDING",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedPo = purchaseOrders.find((p) => p._id === form.poRef) || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.poRef || !form.site || form.receivedQuantity === "") {
      setError("Purchase order, site and received quantity are required.");
      return;
    }
    const accepted = Number(form.acceptedQuantity) || 0;
    const rejected = Number(form.rejectedQuantity) || 0;
    if (isStoreKeeper && accepted + rejected > Number(form.receivedQuantity)) {
      setError("Accepted + rejected quantity cannot exceed received quantity.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await createGoodsReceipt({
        poRef: form.poRef,
        site: form.site,
        vehicleNumber: form.vehicleNumber,
        invoiceNumber: form.invoiceNumber,
        receivedQuantity: Number(form.receivedQuantity),
        batchLotNumber: form.batchLotNumber,
        storeLocation: form.storeLocation,
        acceptedQuantity: isStoreKeeper ? accepted : 0,
        rejectedQuantity: isStoreKeeper ? rejected : 0,
        qualityStatus: isStoreKeeper ? form.qualityStatus : "PENDING",
      });
      toast.success(`${data.data.grnNumber} recorded.`);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not record goods receipt.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">Log goods receipt</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Purchase order</label>
            <Select value={form.poRef} onChange={(e) => setForm({ ...form, poRef: e.target.value })} className="w-full">
              <option value="">Select purchase order</option>
              {purchaseOrders.map((po) => (
                <option key={po._id} value={po._id}>
                  {po.poNumber} — {po.item?.name} ({po.quantity} {po.item?.unit}) · {po.vendor?.name}
                </option>
              ))}
            </Select>
            {selectedPo && (
              <p className="text-xs text-navy-300 mt-1">Ordered quantity: {selectedPo.quantity} {selectedPo.item?.unit}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Site</label>
              {isStoreKeeper && user?.role !== "SUPER_ADMIN" ? (
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
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Received quantity</label>
              <input
                type="number"
                min="0"
                value={form.receivedQuantity}
                onChange={(e) => setForm({ ...form, receivedQuantity: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Vehicle number</label>
              <input
                value={form.vehicleNumber}
                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Invoice number</label>
              <input
                value={form.invoiceNumber}
                onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Batch / lot number</label>
              <input
                value={form.batchLotNumber}
                onChange={(e) => setForm({ ...form, batchLotNumber: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Store location</label>
              <input
                value={form.storeLocation}
                onChange={(e) => setForm({ ...form, storeLocation: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          {isStoreKeeper ? (
            <div className="rounded-lg border border-navy-100 p-3 space-y-3">
              <p className="text-xs font-medium text-navy-700">Verification (Store Keeper only)</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-navy-700 mb-1">Accepted qty</label>
                  <input
                    type="number"
                    min="0"
                    value={form.acceptedQuantity}
                    onChange={(e) => setForm({ ...form, acceptedQuantity: e.target.value })}
                    className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-700 mb-1">Rejected qty</label>
                  <input
                    type="number"
                    min="0"
                    value={form.rejectedQuantity}
                    onChange={(e) => setForm({ ...form, rejectedQuantity: e.target.value })}
                    className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-700 mb-1">Quality</label>
                  <Select
                    value={form.qualityStatus}
                    onChange={(e) => setForm({ ...form, qualityStatus: e.target.value })}
                    className="w-full"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="PASSED">Passed</option>
                    <option value="FAILED">Failed</option>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-navy-400 bg-navy-50 rounded-lg px-3 py-2">
              Accepted/rejected quantities can only be set by a Store Keeper. This GRN will stay pending until one
              verifies it.
            </p>
          )}

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
              {saving ? "Saving..." : "Log GRN"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VerifyGrnModal({ receipt, onClose, onVerified }) {
  const toast = useToast();
  const [form, setForm] = useState({
    acceptedQuantity: String(receipt.acceptedQuantity || 0),
    rejectedQuantity: String(receipt.rejectedQuantity || 0),
    batchLotNumber: receipt.batchLotNumber || "",
    storeLocation: receipt.storeLocation || "",
    qualityStatus: receipt.qualityStatus === "PENDING" ? "PASSED" : receipt.qualityStatus,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const accepted = Number(form.acceptedQuantity) || 0;
    const rejected = Number(form.rejectedQuantity) || 0;
    if (accepted + rejected > receipt.receivedQuantity) {
      setError("Accepted + rejected quantity cannot exceed received quantity.");
      return;
    }
    setSaving(true);
    try {
      await verifyGoodsReceipt(receipt._id, {
        acceptedQuantity: accepted,
        rejectedQuantity: rejected,
        batchLotNumber: form.batchLotNumber,
        storeLocation: form.storeLocation,
        qualityStatus: form.qualityStatus,
      });
      toast.success(`${receipt.grnNumber} verified and stock updated.`);
      onVerified();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not verify goods receipt.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">Verify {receipt.grnNumber}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-navy-500 mb-3">
          {receipt.item?.name} · Received {receipt.receivedQuantity} {receipt.item?.unit}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Accepted qty</label>
              <input
                type="number"
                min="0"
                value={form.acceptedQuantity}
                onChange={(e) => setForm({ ...form, acceptedQuantity: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Rejected qty</label>
              <input
                type="number"
                min="0"
                value={form.rejectedQuantity}
                onChange={(e) => setForm({ ...form, rejectedQuantity: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Quality</label>
              <Select value={form.qualityStatus} onChange={(e) => setForm({ ...form, qualityStatus: e.target.value })} className="w-full">
                <option value="PASSED">Passed</option>
                <option value="FAILED">Failed</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Batch / lot number</label>
              <input
                value={form.batchLotNumber}
                onChange={(e) => setForm({ ...form, batchLotNumber: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Store location</label>
              <input
                value={form.storeLocation}
                onChange={(e) => setForm({ ...form, storeLocation: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-sm px-3 py-2 rounded-lg text-navy-500 hover:bg-navy-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="text-sm px-4 py-2 rounded-lg bg-navy-700 hover:bg-navy-900 text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Verify & update stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
