import { useEffect, useState, useMemo } from "react";

/**
 * Client-side pagination over an already-loaded/filtered array. Pairs with
 * <Pagination /> for a consistent "10 rows, then page through" pattern across
 * every data table in the app.
 *
 *   const { page, setPage, pageItems, pageSize, total } = usePagination(rows, 10);
 *   ...render pageItems instead of rows...
 *   <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
 *
 * Automatically snaps back to a valid page if the underlying list shrinks
 * (e.g. a filter removes rows) so you never land on a blank page.
 */
export default function usePagination(items = [], pageSize = 10) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { page, setPage, pageItems, pageSize, total };
}
