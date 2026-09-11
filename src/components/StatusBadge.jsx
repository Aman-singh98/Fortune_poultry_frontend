/**
 * StatusBadge — one colored pill component for every status/priority value
 * used across the Stock, Purchase & Inventory pages (and reusable by the HR
 * pages too). Centralizes the `bg-*-50 text-*-700 rounded-full` styling that
 * used to be copy-pasted per page (PurchaseRequisitions, RfqQuotations,
 * PurchaseOrders, Bills, GoodsReceipts, ItemIssueSlips, Leave, Holidays).
 *
 * Usage:
 *   <StatusBadge value={requisition.status} />
 *   <StatusBadge value={requisition.priority} type="priority" />
 *   <StatusBadge value="Selected" tone="success" />   // free-form override
 */

// One style map per "family" of values, so the same word (e.g. PENDING)
// still gets the right tone whether it's a PR status, a GRN quality status,
// or a bill match status — they all happen to agree here, but keeping them
// as named families makes it obvious where to add a new value later.
const STATUS_STYLES = {
  // Approval-style workflow statuses (PR, Leave, Holiday)
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",

  // RFQ / Purchase Order lifecycle
  OPEN: "bg-amber-50 text-amber-700",
  CLOSED: "bg-navy-50 text-navy-400",
  CANCELLED: "bg-red-50 text-red-700",

  // Bill 3-way match
  MATCHED: "bg-green-50 text-green-700",
  MISMATCH: "bg-red-50 text-red-700",

  // Item Requirement / Issue Slip fulfilment
  PARTIAL: "bg-accent-100 text-accent-700",
  FULFILLED: "bg-green-50 text-green-700",

  // GRN quality check
  PASSED: "bg-green-50 text-green-700",
  FAILED: "bg-red-50 text-red-700",
};

const PRIORITY_STYLES = {
  LOW: "bg-navy-50 text-navy-400",
  MEDIUM: "bg-amber-50 text-amber-700",
  HIGH: "bg-red-50 text-red-700",
};

const TONE_STYLES = {
  neutral: "bg-navy-50 text-navy-400",
  success: "bg-green-50 text-green-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  accent: "bg-accent-100 text-accent-700",
};

const FALLBACK_STYLE = "bg-navy-50 text-navy-400";

export default function StatusBadge({ value, type = "status", tone, label, className = "" }) {
  if (!value && !label) return null;

  const styles = tone
    ? TONE_STYLES[tone] || FALLBACK_STYLE
    : type === "priority"
    ? PRIORITY_STYLES[value] || FALLBACK_STYLE
    : STATUS_STYLES[value] || FALLBACK_STYLE;

  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${styles} ${className}`}
    >
      {label ?? value}
    </span>
  );
}
