import { Award, Scale } from "lucide-react";
import { SkeletonTableRows } from "./ui/Skeleton.jsx";
import EmptyState from "./ui/EmptyState.jsx";

/**
 * QuotationComparisonTable — the vendor-columns comparison grid used by
 * QuotationComparison.jsx (RA v2.0 §8, point 5). Built to take an arbitrary
 * number of vendor quotations; it doesn't care how many rows it's given.
 *
 * Props:
 *  - comparison: { count, quotations[], canSelect, minimumRequired, selectedVendor } | null
 *  - loading: bool
 *  - canDecide: bool — whether the "Select vendor" action column is shown
 *  - onSelectVendor(quotation): called when the person clicks "Select vendor"
 *  - emptyDescription: optional override for the empty-state copy
 */
export default function QuotationComparisonTable({
  comparison,
  loading = false,
  canDecide = false,
  onSelectVendor,
  emptyDescription = 'Log vendor quotations from the "RFQ & quotations" page first.',
}) {
  const columnCount = canDecide ? 9 : 8;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-navy-300 border-b border-navy-100">
            <th className="px-4 py-2 font-medium">Vendor</th>
            <th className="px-4 py-2 font-medium">Rate (₹)</th>
            <th className="px-4 py-2 font-medium">GST (₹)</th>
            <th className="px-4 py-2 font-medium">Freight (₹)</th>
            <th className="px-4 py-2 font-medium">Discount (₹)</th>
            <th className="px-4 py-2 font-medium">Other charges (₹)</th>
            <th className="px-4 py-2 font-medium">Landed cost (₹)</th>
            <th className="px-4 py-2 font-medium">Delivery</th>
            {canDecide && <th className="px-4 py-2 font-medium">Action</th>}
          </tr>
        </thead>
        <tbody>
          {loading && <SkeletonTableRows rows={3} columns={columnCount} />}
          {!loading && comparison && comparison.count === 0 && (
            <tr>
              <td colSpan={columnCount}>
                <EmptyState icon={Scale} title="No quotations logged for this RFQ yet." description={emptyDescription} />
              </td>
            </tr>
          )}
          {!loading &&
            comparison?.quotations.map((q) => (
              <tr key={q._id} className={`border-b border-navy-50 last:border-0 ${q.selected ? "bg-green-50/40" : ""}`}>
                <td className="px-4 py-2">
                  <p className="text-navy-700 font-medium flex items-center gap-1.5">
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
                  <p className="text-xs text-navy-300">{q.item?.name}</p>
                </td>
                <td className="px-4 py-2 text-navy-500">{q.rate?.toFixed(2)}</td>
                <td className="px-4 py-2 text-navy-500">{q.gst?.toFixed(2)}</td>
                <td className="px-4 py-2 text-navy-500">{q.freight?.toFixed(2)}</td>
                <td className="px-4 py-2 text-navy-500">{q.discount?.toFixed(2)}</td>
                <td className="px-4 py-2 text-navy-500">{q.otherCharges?.toFixed(2)}</td>
                <td className="px-4 py-2 font-semibold text-navy-700">{q.finalLandedCost?.toFixed(2)}</td>
                <td className="px-4 py-2 text-navy-500">{q.deliveryTime || "-"}</td>
                {canDecide && (
                  <td className="px-4 py-2">
                    {q.selected ? (
                      <span className="text-xs text-navy-300">{q.reasonForSelection ? q.reasonForSelection : "-"}</span>
                    ) : (
                      <button
                        onClick={() => onSelectVendor?.(q)}
                        disabled={!comparison.canSelect}
                        title={
                          comparison.canSelect
                            ? "Select this vendor"
                            : `Needs ${comparison.minimumRequired} quotations before a vendor can be selected`
                        }
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-900 text-white disabled:opacity-40 disabled:hover:bg-navy-700"
                      >
                        Select vendor
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
