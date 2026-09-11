import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, X, FileSearch, Lock, ChevronRight, Award } from "lucide-react";
import { useToast } from "../context/ToastContext.jsx";
import {
  getRfqs,
  createRfq,
  closeRfq,
  getPurchaseRequisitions,
  getVendors,
  getQuotations,
  createQuotation,
} from "../api/endpoints.js";
import { SkeletonCards } from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Select from "../components/ui/Select.jsx";
import StatusBadge from "../components/StatusBadge.jsx";


export default function RfqQuotations() {
  const toast = useToast();

  const [rfqs, setRfqs] = useState([]);
  const [approvedPrs, setApprovedPrs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedRfqId, setSelectedRfqId] = useState(null);

  const [quotations, setQuotations] = useState([]);
  const [quotationsLoading, setQuotationsLoading] = useState(false);
  const [addQuotationOpen, setAddQuotationOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rfqRes, prRes, vendorRes] = await Promise.all([
        getRfqs(),
        getPurchaseRequisitions({ status: "APPROVED" }),
        getVendors({ isActive: true }),
      ]);
      setRfqs(rfqRes.data.data);
      setApprovedPrs(prRes.data.data);
      setVendors(vendorRes.data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load RFQs.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedRfq = useMemo(() => rfqs.find((r) => r._id === selectedRfqId) || null, [rfqs, selectedRfqId]);

  const loadQuotations = useCallback(async (rfqId) => {
    setQuotationsLoading(true);
    try {
      const { data } = await getQuotations({ rfqRef: rfqId });
      setQuotations(data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load quotations.");
    } finally {
      setQuotationsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectRfq = (rfq) => {
    setSelectedRfqId(rfq._id);
    loadQuotations(rfq._id);
  };

  const handleCloseRfq = async (rfq) => {
    try {
      await closeRfq(rfq._id);
      toast.success(`${rfq.rfqNumber} closed.`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not close RFQ.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-navy-700">RFQ &amp; quotations</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 text-sm rounded-lg bg-navy-700 hover:bg-navy-900 text-white px-3 py-2"
        >
          <Plus size={16} />
          Create RFQ
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* RFQ list */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-navy-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-navy-100">
            <p className="text-sm font-medium text-navy-700">RFQs</p>
          </div>
          {loading && (
            <div className="p-4">
              <SkeletonCards count={3} />
            </div>
          )}
          {!loading && rfqs.length === 0 && (
            <EmptyState
              icon={FileSearch}
              title="No RFQs yet."
              description="Create an RFQ against an approved purchase requisition to start collecting vendor quotations."
            />
          )}
          {!loading && rfqs.length > 0 && (
            <ul className="divide-y divide-navy-50 max-h-[520px] overflow-y-auto">
              {rfqs.map((rfq) => (
                <li key={rfq._id}>
                  <button
                    onClick={() => handleSelectRfq(rfq)}
                    className={`w-full text-left px-4 py-3 flex items-start justify-between gap-2 hover:bg-navy-50/60 transition-colors ${
                      selectedRfqId === rfq._id ? "bg-accent-500/5" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy-700 font-mono">{rfq.rfqNumber}</p>
                      <p className="text-xs text-navy-400 truncate">{rfq.vendor?.name || "-"}</p>
                      <p className="text-xs text-navy-300 truncate">
                        {rfq.items?.map((li) => li.item?.name).filter(Boolean).join(", ") || "-"}
                      </p>
                      <p className="text-xs text-navy-300 mt-1">PR {rfq.prRef?.prNumber || "-"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge value={rfq.status} />
                      <ChevronRight size={14} className="text-navy-300" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Selected RFQ detail + quotations */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-navy-100 overflow-hidden">
          {!selectedRfq && (
            <EmptyState
              icon={FileSearch}
              title="Select an RFQ"
              description="Choose an RFQ on the left to view and add vendor quotations underneath it."
            />
          )}

          {selectedRfq && (
            <div>
              <div className="px-4 py-3 border-b border-navy-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-navy-700 font-mono">{selectedRfq.rfqNumber}</p>
                  <p className="text-xs text-navy-400">
                    Vendor: {selectedRfq.vendor?.name} · PR {selectedRfq.prRef?.prNumber}
                  </p>
                  {selectedRfq.quotationDueDate && (
                    <p className="text-xs text-navy-300">
                      Quotes due {new Date(selectedRfq.quotationDueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedRfq.status === "OPEN" && (
                    <button
                      onClick={() => handleCloseRfq(selectedRfq)}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-navy-100 text-navy-500 hover:bg-navy-50"
                    >
                      <Lock size={13} />
                      Close RFQ
                    </button>
                  )}
                  <button
                    onClick={() => setAddQuotationOpen(true)}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-900 text-white"
                  >
                    <Plus size={13} />
                    Add quotation
                  </button>
                </div>
              </div>

              <div className="p-4">
                {quotationsLoading && <SkeletonCards count={2} />}
                {!quotationsLoading && quotations.length === 0 && (
                  <EmptyState
                    icon={FileSearch}
                    title="No quotations logged yet."
                    description='At least 3 quotations are needed before Management can select a vendor. Use "Add quotation" to log one.'
                  />
                )}
                {!quotationsLoading && quotations.length > 0 && (
                  <div className="space-y-2.5">
                    {quotations.length < 3 && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        {quotations.length} of 3 minimum quotations logged. Management can't select a vendor until at
                        least 3 are recorded for this RFQ/item.
                      </p>
                    )}
                    {quotations.map((q) => (
                      <div
                        key={q._id}
                        className={`rounded-xl border p-3 ${
                          q.selected ? "border-green-200 bg-green-50/40" : "border-navy-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-navy-700 flex items-center gap-1.5">
                              {q.vendor?.name}
                              {q.isLowestRate && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-500/10 text-accent-700 font-semibold">
                                  Lowest
                                </span>
                              )}
                              {q.selected && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold flex items-center gap-0.5">
                                  <Award size={10} />
                                  Selected
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-navy-400">
                              {q.item?.name} · Qty {q.quantity} {q.item?.unit}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-navy-700 shrink-0">
                            ₹{q.finalLandedCost?.toFixed(2)}
                          </p>
                        </div>
                        <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-navy-400">
                          <span>Rate ₹{q.rate?.toFixed(2)}</span>
                          <span>GST ₹{q.gst?.toFixed(2)}</span>
                          <span>Freight ₹{q.freight?.toFixed(2)}</span>
                          <span>Other ₹{q.otherCharges?.toFixed(2)}</span>
                        </div>
                        {q.deliveryTime && <p className="mt-1 text-xs text-navy-300">Delivery: {q.deliveryTime}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {createOpen && (
        <CreateRfqModal
          approvedPrs={approvedPrs}
          vendors={vendors}
          onClose={() => setCreateOpen(false)}
          onSaved={(rfq) => {
            setCreateOpen(false);
            load();
            if (rfq?._id) {
              setSelectedRfqId(rfq._id);
              loadQuotations(rfq._id);
            }
          }}
        />
      )}

      {addQuotationOpen && selectedRfq && (
        <AddQuotationModal
          rfq={selectedRfq}
          onClose={() => setAddQuotationOpen(false)}
          onSaved={() => {
            setAddQuotationOpen(false);
            loadQuotations(selectedRfq._id);
          }}
        />
      )}
    </div>
  );
}

function CreateRfqModal({ approvedPrs, vendors, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    prRef: "",
    vendor: "",
    quantity: "",
    expectedDeliveryDate: "",
    quotationDueDate: "",
    termsAndConditions: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedPr = approvedPrs.find((p) => p._id === form.prRef) || null;

  const handlePrChange = (id) => {
    const pr = approvedPrs.find((p) => p._id === id);
    setForm({ ...form, prRef: id, quantity: pr ? String(pr.quantity) : "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.prRef || !form.vendor || !form.quantity) {
      setError("Purchase requisition, vendor and quantity are required.");
      return;
    }
    if (!selectedPr?.item?._id) {
      setError("The selected requisition is missing its item — pick another.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await createRfq({
        prRef: form.prRef,
        vendor: form.vendor,
        items: [{ item: selectedPr.item._id, quantity: Number(form.quantity) }],
        expectedDeliveryDate: form.expectedDeliveryDate || undefined,
        quotationDueDate: form.quotationDueDate || undefined,
        termsAndConditions: form.termsAndConditions,
      });
      toast.success(`${data.data.rfqNumber} created.`);
      onSaved(data.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not create RFQ.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">Create RFQ</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>

        {approvedPrs.length === 0 ? (
          <p className="text-sm text-navy-400 bg-navy-50 rounded-lg px-3 py-3">
            No approved purchase requisitions are available yet. An RFQ can only be raised against a requisition
            Management has already approved.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Approved requisition</label>
              <Select value={form.prRef} onChange={(e) => handlePrChange(e.target.value)} className="w-full">
                <option value="">Select requisition</option>
                {approvedPrs.map((pr) => (
                  <option key={pr._id} value={pr._id}>
                    {pr.prNumber} — {pr.item?.name} ({pr.quantity} {pr.item?.unit})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Vendor</label>
              <Select value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} className="w-full">
                <option value="">Select vendor</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Quantity to quote</label>
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">Expected delivery</label>
                <input
                  type="date"
                  value={form.expectedDeliveryDate}
                  onChange={(e) => setForm({ ...form, expectedDeliveryDate: e.target.value })}
                  className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">Quotation due</label>
                <input
                  type="date"
                  value={form.quotationDueDate}
                  onChange={(e) => setForm({ ...form, quotationDueDate: e.target.value })}
                  className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Terms &amp; conditions (optional)</label>
              <textarea
                value={form.termsAndConditions}
                onChange={(e) => setForm({ ...form, termsAndConditions: e.target.value })}
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
                {saving ? "Creating..." : "Create RFQ"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function AddQuotationModal({ rfq, onClose, onSaved }) {
  const toast = useToast();
  const lineItem = rfq.items?.[0];
  const [form, setForm] = useState({
    quantity: lineItem?.quantity ? String(lineItem.quantity) : "",
    rate: "",
    gst: "0",
    freight: "0",
    discount: "0",
    otherCharges: "0",
    paymentTerms: "",
    deliveryTime: "",
    qualitySpecification: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.quantity || form.rate === "") {
      setError("Quantity and rate are required.");
      return;
    }
    setSaving(true);
    try {
      await createQuotation({
        rfqRef: rfq._id,
        vendor: rfq.vendor?._id || rfq.vendor,
        item: lineItem?.item?._id || lineItem?.item,
        quantity: Number(form.quantity),
        rate: Number(form.rate),
        gst: Number(form.gst) || 0,
        freight: Number(form.freight) || 0,
        discount: Number(form.discount) || 0,
        otherCharges: Number(form.otherCharges) || 0,
        paymentTerms: form.paymentTerms,
        deliveryTime: form.deliveryTime,
        qualitySpecification: form.qualitySpecification,
      });
      toast.success("Quotation recorded.");
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not record quotation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">Add quotation — {rfq.rfqNumber}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-navy-400 mb-3">
          Vendor: <span className="font-medium text-navy-600">{rfq.vendor?.name}</span> · Item:{" "}
          <span className="font-medium text-navy-600">{lineItem?.item?.name}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
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
              <label className="block text-xs font-medium text-navy-700 mb-1">Rate (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">GST (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.gst}
                onChange={(e) => setForm({ ...form, gst: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Freight (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.freight}
                onChange={(e) => setForm({ ...form, freight: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Discount (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Other (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.otherCharges}
                onChange={(e) => setForm({ ...form, otherCharges: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Payment terms</label>
              <input
                value={form.paymentTerms}
                onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                placeholder="e.g. 30 days credit"
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Delivery time</label>
              <input
                value={form.deliveryTime}
                onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })}
                placeholder="e.g. 7 days"
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Quality specification (optional)</label>
            <input
              value={form.qualitySpecification}
              onChange={(e) => setForm({ ...form, qualitySpecification: e.target.value })}
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
              {saving ? "Saving..." : "Add quotation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
