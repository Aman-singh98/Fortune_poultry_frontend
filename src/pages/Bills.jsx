import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Search, X, Receipt, ScanSearch } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getBills, createBill, matchBill, getPurchaseOrders, getGoodsReceipts } from "../api/endpoints.js";
import { SkeletonTableRows } from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Select from "../components/ui/Select.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import usePagination from "../hooks/usePagination.js";
import StatusBadge from "../components/StatusBadge.jsx";


export default function Bills() {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = user?.role === "SUPER_ADMIN" || user?.role === "ACCOUNTS";

  const [bills, setBills] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [matchFilter, setMatchFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [matchBusyId, setMatchBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [billsRes, poRes] = await Promise.all([getBills(), getPurchaseOrders()]);
      setBills(billsRes.data.data);
      setPurchaseOrders(poRes.data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load bills.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const matchesSearch =
        !search ||
        b.billNumber?.toLowerCase().includes(search.toLowerCase()) ||
        b.poRef?.poNumber?.toLowerCase().includes(search.toLowerCase()) ||
        b.vendor?.name?.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = !matchFilter || b.matchStatus === matchFilter;
      return matchesSearch && matchesFilter;
    });
  }, [bills, search, matchFilter]);

  const { page, setPage, pageItems, pageSize, total } = usePagination(filteredBills, 10);
  useEffect(() => {
    setPage(1);
  }, [search, matchFilter, setPage]);

  const handleMatch = async (bill) => {
    setMatchBusyId(bill._id);
    try {
      const { data } = await matchBill(bill._id);
      toast[data.data.matchStatus === "MATCHED" ? "success" : "error"](
        `${bill.billNumber} ${data.data.matchStatus === "MATCHED" ? "matched" : "flagged as a mismatch"}.`
      );
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not run the 3-way match.");
    } finally {
      setMatchBusyId(null);
    }
  };

  const columnCount = canManage ? 8 : 7;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-navy-700">Bills</h1>
        {canManage && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 text-sm rounded-lg bg-navy-700 hover:bg-navy-900 text-white px-3 py-2"
          >
            <Plus size={16} />
            Record bill
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by bill number, PO or vendor"
            className="w-full pl-9 pr-3 py-2 text-sm border border-navy-100 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
        <Select value={matchFilter} onChange={(e) => setMatchFilter(e.target.value)} className="w-full sm:w-44">
          <option value="">All match statuses</option>
          <option value="PENDING">Pending</option>
          <option value="MATCHED">Matched</option>
          <option value="MISMATCH">Mismatch</option>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-300 border-b border-navy-100">
                <th className="px-4 py-2 font-medium">Bill number</th>
                <th className="px-4 py-2 font-medium">Vendor</th>
                <th className="px-4 py-2 font-medium">PO</th>
                <th className="px-4 py-2 font-medium">GRN</th>
                <th className="px-4 py-2 font-medium">Invoice date</th>
                <th className="px-4 py-2 font-medium">Amount (₹)</th>
                <th className="px-4 py-2 font-medium">Match status</th>
                {canManage && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={5} columns={columnCount} />}
              {!loading && filteredBills.length === 0 && (
                <tr>
                  <td colSpan={columnCount}>
                    <EmptyState
                      icon={Receipt}
                      title="No bills recorded."
                      description={canManage ? "Record a vendor bill against a purchase order." : "No bills match this search."}
                    />
                  </td>
                </tr>
              )}
              {!loading &&
                pageItems.map((b) => (
                  <tr key={b._id} className="border-b border-navy-50 last:border-0 align-top">
                    <td className="px-4 py-2 text-navy-700 font-medium">
                      {b.billNumber}
                      {b.irn && <span className="block text-xs text-navy-300 font-normal">IRN: {b.irn}</span>}
                    </td>
                    <td className="px-4 py-2 text-navy-500">{b.vendor?.name || "-"}</td>
                    <td className="px-4 py-2 font-mono text-xs text-navy-500">{b.poRef?.poNumber || "-"}</td>
                    <td className="px-4 py-2 font-mono text-xs text-navy-500">{b.grnRef?.grnNumber || "-"}</td>
                    <td className="px-4 py-2 text-navy-500">
                      {b.invoiceDate ? new Date(b.invoiceDate).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-2 font-semibold text-navy-700">{b.amount?.toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <StatusBadge value={b.matchStatus} />
                      {b.matchNotes && <p className="text-xs text-navy-300 mt-1 max-w-[220px]">{b.matchNotes}</p>}
                    </td>
                    {canManage && (
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleMatch(b)}
                          disabled={matchBusyId === b._id}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-navy-100 text-navy-500 hover:bg-navy-50 disabled:opacity-50"
                        >
                          <ScanSearch size={12} />
                          {matchBusyId === b._id ? "Matching..." : "Run 3-way match"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="bills" />
      </div>

      {createOpen && (
        <BillFormModal
          purchaseOrders={purchaseOrders}
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

function BillFormModal({ purchaseOrders, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    poRef: "",
    grnRef: "",
    billNumber: "",
    invoiceDate: "",
    irn: "",
    amount: "",
  });
  const [grns, setGrns] = useState([]);
  const [grnsLoading, setGrnsLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedPo = purchaseOrders.find((p) => p._id === form.poRef) || null;

  const handlePoChange = async (id) => {
    setForm({ ...form, poRef: id, grnRef: "" });
    setGrns([]);
    if (!id) return;
    setGrnsLoading(true);
    try {
      const { data } = await getGoodsReceipts({ poRef: id });
      setGrns(data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load goods receipts for this PO.");
    } finally {
      setGrnsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.poRef || !form.billNumber || !form.invoiceDate || form.amount === "") {
      setError("Purchase order, bill number, invoice date and amount are required.");
      return;
    }
    setSaving(true);
    try {
      await createBill({
        poRef: form.poRef,
        grnRef: form.grnRef || null,
        billNumber: form.billNumber,
        invoiceDate: form.invoiceDate,
        irn: form.irn,
        amount: Number(form.amount),
      });
      toast.success(`Bill ${form.billNumber} recorded.`);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not record bill.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">Record vendor bill</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Purchase order</label>
            <Select value={form.poRef} onChange={(e) => handlePoChange(e.target.value)} className="w-full">
              <option value="">Select purchase order</option>
              {purchaseOrders.map((po) => (
                <option key={po._id} value={po._id}>
                  {po.poNumber} — {po.vendor?.name} · ₹{po.totalAmount?.toFixed(2)}
                </option>
              ))}
            </Select>
            {selectedPo && (
              <p className="text-xs text-navy-300 mt-1">
                PO total: ₹{selectedPo.totalAmount?.toFixed(2)} for {selectedPo.quantity} {selectedPo.item?.unit}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Goods receipt (optional)</label>
            <Select
              value={form.grnRef}
              onChange={(e) => setForm({ ...form, grnRef: e.target.value })}
              className="w-full"
              disabled={!form.poRef || grnsLoading}
            >
              <option value="">
                {!form.poRef ? "Select a PO first" : grnsLoading ? "Loading..." : "Auto-match to latest GRN"}
              </option>
              {grns.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.grnNumber} — accepted {g.acceptedQuantity}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Bill number</label>
              <input
                value={form.billNumber}
                onChange={(e) => setForm({ ...form, billNumber: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Invoice date</label>
              <input
                type="date"
                value={form.invoiceDate}
                onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Amount (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">IRN (optional)</label>
              <input
                value={form.irn}
                onChange={(e) => setForm({ ...form, irn: e.target.value })}
                placeholder="Text only — no e-invoicing lookup"
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
              {saving ? "Recording..." : "Record bill"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
