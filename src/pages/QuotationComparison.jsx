import { useEffect, useState, useCallback, useMemo } from "react";
import { Scale, Award, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getRfqs, compareQuotations, decideQuotation } from "../api/endpoints.js";
import EmptyState from "../components/ui/EmptyState.jsx";
import Select from "../components/ui/Select.jsx";
import QuotationComparisonTable from "../components/QuotationComparisonTable.jsx";
import { ApprovalRemarkModal } from "../components/ApprovalActions.jsx";

export default function QuotationComparison() {
  const { user } = useAuth();
  const toast = useToast();
  // Management holds the vendor-selection approval gate; Purchase Manager
  // (and Super Admin, everywhere) get a read-only comparison view.
  const canDecide = user?.role === "SUPER_ADMIN" || user?.role === "MANAGEMENT";

  const [rfqs, setRfqs] = useState([]);
  const [rfqsLoading, setRfqsLoading] = useState(true);
  const [selectedRfqId, setSelectedRfqId] = useState("");

  const [comparison, setComparison] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [selectTarget, setSelectTarget] = useState(null);

  const loadRfqs = useCallback(async () => {
    setRfqsLoading(true);
    try {
      const { data } = await getRfqs();
      setRfqs(data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load RFQs.");
    } finally {
      setRfqsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRfqs();
  }, [loadRfqs]);

  const loadComparison = useCallback(async (rfqId) => {
    if (!rfqId) {
      setComparison(null);
      return;
    }
    setComparisonLoading(true);
    try {
      const { data } = await compareQuotations(rfqId);
      setComparison(data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load comparison.");
    } finally {
      setComparisonLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadComparison(selectedRfqId);
  }, [selectedRfqId, loadComparison]);

  const selectedRfq = useMemo(() => rfqs.find((r) => r._id === selectedRfqId) || null, [rfqs, selectedRfqId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-navy-700">Quotation comparison</h1>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-80">
          <label className="block text-xs font-medium text-navy-700 mb-1">RFQ</label>
          <Select
            value={selectedRfqId}
            onChange={(e) => setSelectedRfqId(e.target.value)}
            className="w-full"
            disabled={rfqsLoading}
          >
            <option value="">{rfqsLoading ? "Loading RFQs..." : "Select an RFQ to compare"}</option>
            {rfqs.map((rfq) => (
              <option key={rfq._id} value={rfq._id}>
                {rfq.rfqNumber} — {rfq.items?.map((li) => li.item?.name).filter(Boolean).join(", ")} (
                {rfq.vendor?.name})
              </option>
            ))}
          </Select>
        </div>
        {selectedRfq && (
          <p className="text-xs text-navy-400 pb-2">
            PR {selectedRfq.prRef?.prNumber || "-"} · Status {selectedRfq.status}
          </p>
        )}
      </div>

      {!selectedRfqId && (
        <div className="bg-white rounded-xl border border-navy-100">
          <EmptyState
            icon={Scale}
            title="Select an RFQ to compare vendor quotations."
            description="Rate, GST, freight, other charges and the computed landed cost are shown side-by-side for every vendor who quoted."
          />
        </div>
      )}

      {selectedRfqId && (
        <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
          {comparison && comparison.count > 0 && (
            <div className="px-4 py-3 border-b border-navy-100 flex flex-wrap items-center gap-2">
              {comparison.canSelect ? (
                <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-full px-2.5 py-1">
                  <CheckCircle2 size={13} />
                  {comparison.count} quotations logged — ready for Management's decision.
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-full px-2.5 py-1">
                  <AlertTriangle size={13} />
                  {comparison.count} of {comparison.minimumRequired} minimum quotations logged. A vendor can't be
                  selected yet.
                </span>
              )}
              {comparison.selectedVendor && (
                <span className="flex items-center gap-1.5 text-xs text-navy-500 bg-navy-50 rounded-full px-2.5 py-1">
                  <Award size={13} />
                  Selected: {comparison.selectedVendor.name}
                </span>
              )}
            </div>
          )}

          <QuotationComparisonTable
            comparison={comparison}
            loading={comparisonLoading}
            canDecide={canDecide}
            onSelectVendor={setSelectTarget}
          />
        </div>
      )}

      {selectTarget && (
        <ApprovalRemarkModal
          decision="APPROVED"
          title={`Select ${selectTarget.vendor?.name}`}
          subtitle={`Landed cost ₹${selectTarget.finalLandedCost?.toFixed(2)} for ${
            selectTarget.item?.name
          }. Any other quotation currently selected for this RFQ/item will be unselected.`}
          remarkLabel="Reason for selection (optional)"
          remarkPlaceholder="e.g. Lowest landed cost with acceptable delivery time"
          approveLabel="Select vendor"
          successMessage={`${selectTarget.vendor?.name} selected as the vendor.`}
          onSubmit={async (reason) => {
            await decideQuotation(selectTarget._id, { decision: "APPROVED", reasonForSelection: reason });
            loadComparison(selectedRfqId);
          }}
          onClose={() => setSelectTarget(null)}
        />
      )}
    </div>
  );
}
