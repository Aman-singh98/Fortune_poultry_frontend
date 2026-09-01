import { useState } from "react";
import { Check, X, XCircle } from "lucide-react";
import { useToast } from "../context/ToastContext.jsx";

/**
 * ApprovalActions — a small Approve/Reject button pair with a remark field,
 * reusable across Purchase Requisitions and Quotations (and Purchase Orders
 * too, if OP-7 is ever resolved to "yes, a separate PO approval gate is
 * needed" — see Task List §5).
 *
 * Two exports:
 *  - ApprovalButtons: the compact ✓/✗ icon pair for a table row.
 *  - ApprovalRemarkModal: the confirm dialog with an optional remark field
 *    that actually submits the decision.
 */

export function ApprovalButtons({ onApprove, onReject, approveTitle = "Approve", rejectTitle = "Reject", disabled = false }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onApprove}
        disabled={disabled}
        title={approveTitle}
        className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Check size={15} />
      </button>
      {onReject && (
        <button
          type="button"
          onClick={onReject}
          disabled={disabled}
          title={rejectTitle}
          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}

/**
 * Generic decision modal: shows a title, an optional subtitle describing
 * what's being decided, a remark/reason textarea, and Approve/Reject styled
 * submit buttons. The caller owns the actual API call via `onSubmit`.
 *
 * Props:
 *  - decision: "APPROVED" | "REJECTED" — controls button color/label
 *  - title, subtitle
 *  - remarkLabel, remarkPlaceholder, remarkRequired
 *  - onSubmit(remark): async fn — throw to show the error text
 *  - onClose()
 *  - successMessage: shown via toast on success
 */
export function ApprovalRemarkModal({
  decision,
  title,
  subtitle,
  remarkLabel = "Remark (optional)",
  remarkPlaceholder = "",
  remarkRequired = false,
  approveLabel = "Approve",
  rejectLabel = "Reject",
  onSubmit,
  onClose,
  successMessage,
}) {
  const toast = useToast();
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isApprove = decision === "APPROVED";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (remarkRequired && !remark.trim()) {
      setError("A remark is required for this decision.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(remark);
      if (successMessage) toast.success(successMessage);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not record decision.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <XCircle size={18} />
          </button>
        </div>

        {subtitle && <p className="text-sm text-navy-500 mb-3">{subtitle}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">{remarkLabel}</label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
              placeholder={remarkPlaceholder}
              className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-sm px-3 py-2 rounded-lg text-navy-500 hover:bg-navy-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`text-sm px-4 py-2 rounded-lg text-white disabled:opacity-60 ${
                isApprove ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {saving ? "Saving..." : isApprove ? approveLabel : rejectLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
