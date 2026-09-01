import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Common pagination bar used under every data table in the app.
 *
 *   <Pagination page={page} pageSize={10} total={rows.length} onPageChange={setPage} itemLabel="employees" />
 *
 * Renders nothing when there's only one page's worth of rows (or none), so
 * pages don't show an empty pagination bar for small lists.
 */
export default function Pagination({ page, pageSize, total, onPageChange, itemLabel = "records" }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0 || totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages = getPageNumbers(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-navy-100">
      <p className="text-xs text-navy-300">
        Showing <span className="font-medium text-navy-600">{start}–{end}</span> of{" "}
        <span className="font-medium text-navy-600">{total}</span> {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-navy-100 text-navy-500 hover:bg-navy-50 disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs text-navy-300 select-none">
              …
            </span>
          ) : (
            <button
              type="button"
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={`h-7 min-w-7 px-1.5 rounded-lg text-xs font-medium transition-colors ${
                p === page ? "bg-navy-700 text-white" : "text-navy-500 hover:bg-navy-50"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-navy-100 text-navy-500 hover:bg-navy-50 disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/** Builds a compact page list like [1, "...", 4, 5, 6, "...", 12]. */
function getPageNumbers(current, total) {
  const delta = 1;
  const middle = [];
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    middle.push(i);
  }

  const pages = [1];
  if (middle[0] > 2) pages.push("...");
  pages.push(...middle);
  if (middle[middle.length - 1] < total - 1) pages.push("...");
  if (total > 1) pages.push(total);
  return pages;
}
