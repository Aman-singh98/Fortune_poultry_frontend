import { useEffect, useState, useCallback, useMemo } from "react";
import { Search, Boxes, AlertTriangle, PackageX } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getStock, getSites } from "../api/endpoints.js";
import { SkeletonStatCards, SkeletonTableRows } from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Select from "../components/ui/Select.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import usePagination from "../hooks/usePagination.js";

// Admin and Store Keeper are forced to their own site server-side
// (GET /api/stock — see backend/src/controllers/stockController.js), so the
// site filter only makes sense to show for the global roles.
const SITE_LOCKED_ROLES = ["ADMIN", "STORE_KEEPER"];

function StatCard({ icon: Icon, label, value, tone = "default" }) {
  const toneClasses =
    tone === "warning" ? "bg-amber-100 text-amber-700" : tone === "danger" ? "bg-red-100 text-red-700" : "bg-accent-100 text-accent-700";
  return (
    <div className="bg-white rounded-xl border border-navy-100 p-4 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${toneClasses}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-navy-300 truncate">{label}</p>
        <p className="text-lg font-semibold text-navy-700">{value}</p>
      </div>
    </div>
  );
}

export default function Stock() {
  const { user } = useAuth();
  const toast = useToast();
  const isSiteLocked = SITE_LOCKED_ROLES.includes(user?.role);

  const [stock, setStock] = useState([]);
  const [sites, setSites] = useState([]);
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stockRes, sitesRes] = await Promise.all([getStock(), getSites()]);
      setStock(stockRes.data.data);
      setSites(sitesRes.data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load stock.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(
    () => stock.map((s) => ({ ...s, isLow: s.quantity <= (s.item?.reorderLevel ?? 0) })),
    [stock]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((s) => {
      const matchesSearch =
        !search ||
        s.item?.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.item?.itemCode?.toLowerCase().includes(search.toLowerCase());
      const matchesSite = !siteFilter || String(s.site?._id) === siteFilter;
      const matchesLowStock = !lowStockOnly || s.isLow;
      return matchesSearch && matchesSite && matchesLowStock;
    });
  }, [rows, search, siteFilter, lowStockOnly]);

  const { page, setPage, pageItems, pageSize, total } = usePagination(filteredRows, 10);
  useEffect(() => {
    setPage(1);
  }, [search, siteFilter, lowStockOnly, setPage]);

  const lowStockCount = useMemo(() => rows.filter((s) => s.isLow).length, [rows]);
  const outOfStockCount = useMemo(() => rows.filter((s) => s.quantity <= 0).length, [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-navy-700">Stock</h1>
        <p className="text-sm text-navy-300 mt-0.5">
          {isSiteLocked ? `Running stock balance for ${user?.site?.name || "your site"}.` : "Running stock balance per item per site."}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {loading ? (
          <SkeletonStatCards count={3} />
        ) : (
          <>
            <StatCard icon={Boxes} label="Stock positions" value={rows.length} />
            <StatCard icon={AlertTriangle} label="At/below reorder level" value={lowStockCount} tone="warning" />
            <StatCard icon={PackageX} label="Out of stock" value={outOfStockCount} tone="danger" />
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by item name or item code"
            className="w-full pl-9 pr-3 py-2 text-sm border border-navy-100 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
        {!isSiteLocked && (
          <Select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="w-full sm:w-44">
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}
        <button
          type="button"
          onClick={() => setLowStockOnly((v) => !v)}
          className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition-colors ${
            lowStockOnly
              ? "bg-amber-50 border-amber-200 text-amber-700"
              : "bg-white border-navy-100 text-navy-500 hover:bg-navy-50"
          }`}
        >
          <AlertTriangle size={14} />
          Low stock only
        </button>
      </div>

      <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-300 border-b border-navy-100">
                <th className="px-4 py-2 font-medium">Item code</th>
                <th className="px-4 py-2 font-medium">Item</th>
                {!isSiteLocked && <th className="px-4 py-2 font-medium">Site</th>}
                <th className="px-4 py-2 font-medium">Quantity</th>
                <th className="px-4 py-2 font-medium">Reorder level</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={5} columns={isSiteLocked ? 5 : 6} />}
              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={isSiteLocked ? 5 : 6}>
                    <EmptyState
                      icon={Boxes}
                      title="No stock records found."
                      description={
                        lowStockOnly ? "Nothing is at or below its reorder level right now." : "Stock is populated once goods receipts are verified."
                      }
                    />
                  </td>
                </tr>
              )}
              {!loading &&
                pageItems.map((s) => (
                  <tr key={s._id} className="border-b border-navy-50 last:border-0">
                    <td className="px-4 py-2 font-mono text-xs text-navy-500">{s.item?.itemCode || "-"}</td>
                    <td className="px-4 py-2 text-navy-700 font-medium">{s.item?.name || "-"}</td>
                    {!isSiteLocked && <td className="px-4 py-2 text-navy-500">{s.site?.name || "-"}</td>}
                    <td className="px-4 py-2 text-navy-700 font-medium">
                      {s.quantity} {s.item?.unit || ""}
                    </td>
                    <td className="px-4 py-2 text-navy-500">
                      {s.item?.reorderLevel ?? 0} {s.item?.unit || ""}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                          s.quantity <= 0
                            ? "bg-red-50 text-red-700"
                            : s.isLow
                            ? "bg-amber-50 text-amber-700"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {s.isLow && <AlertTriangle size={12} />}
                        {s.quantity <= 0 ? "Out of stock" : s.isLow ? "Low stock" : "OK"}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="stock positions" />
      </div>
    </div>
  );
}
