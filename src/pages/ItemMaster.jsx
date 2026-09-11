import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Search, X, Package, Pencil, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getItems, createItem, updateItem, getVendors } from "../api/endpoints.js";
import { SkeletonTableRows } from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Select from "../components/ui/Select.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import usePagination from "../hooks/usePagination.js";

const UNITS = ["Kg", "Bag", "Nos.", "Ltr.", "Box", "Ton"];

export default function ItemMaster() {
  const { user } = useAuth();
  const toast = useToast();
  // Super Admin and Management can create/edit items; every other role
  // that can open this page (Purchase Manager, Accounts, Store Keeper,
  // Admin) gets a view-only list, per the Task 3.3 access table.
  const canEdit = user?.role === "SUPER_ADMIN" || user?.role === "MANAGEMENT";

  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [lowStockIds, setLowStockIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, vendorsRes, lowStockRes] = await Promise.all([
        getItems(),
        getVendors({ isActive: true }),
        getItems({ lowStock: true }),
      ]);
      setItems(itemsRes.data.data);
      setVendors(vendorsRes.data.data);
      // getItems({ lowStock: true }) returns Stock positions (populated item), not Items directly.
      setLowStockIds(new Set(lowStockRes.data.data.map((pos) => pos.item?._id).filter(Boolean)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category).filter(Boolean))].sort(),
    [items]
  );

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      const matchesSearch =
        !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.itemCode.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !categoryFilter || i.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, categoryFilter]);

  const { page, setPage, pageItems, pageSize, total } = usePagination(filteredItems, 10);
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, setPage]);

  const columnCount = canEdit ? 8 : 7;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-navy-700">Item master</h1>
        {canEdit && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 text-sm rounded-lg bg-navy-700 hover:bg-navy-900 text-white px-3 py-2"
          >
            <Plus size={16} />
            Add item
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or item code"
            className="w-full pl-9 pr-3 py-2 text-sm border border-navy-100 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full sm:w-44">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-300 border-b border-navy-100">
                <th className="px-4 py-2 font-medium">Item code</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Unit</th>
                <th className="px-4 py-2 font-medium">Reorder level</th>
                <th className="px-4 py-2 font-medium">Standard rate</th>
                <th className="px-4 py-2 font-medium">Status</th>
                {canEdit && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={5} columns={columnCount} />}
              {!loading && filteredItems.length === 0 && (
                <tr>
                  <td colSpan={columnCount}>
                    <EmptyState
                      icon={Package}
                      title="No items found."
                      description={canEdit ? "Add your first item to start building the master list." : "No items match this search."}
                    />
                  </td>
                </tr>
              )}
              {!loading &&
                pageItems.map((item) => {
                  const isLow = lowStockIds.has(item._id);
                  return (
                    <tr key={item._id} className="border-b border-navy-50 last:border-0">
                      <td className="px-4 py-2 font-mono text-xs text-navy-500">{item.itemCode}</td>
                      <td className="px-4 py-2 text-navy-700 font-medium">
                        {item.name}
                        {item.subCategory && <span className="block text-xs text-navy-300 font-normal">{item.subCategory}</span>}
                      </td>
                      <td className="px-4 py-2 text-navy-500">{item.category || "-"}</td>
                      <td className="px-4 py-2 text-navy-500">{item.unit}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                            isLow ? "bg-amber-50 text-amber-700 font-medium" : "text-navy-500"
                          }`}
                          title={isLow ? "Stock is at or below reorder level" : undefined}
                        >
                          {isLow && <AlertTriangle size={12} />}
                          {item.reorderLevel}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-navy-500">₹{item.standardRate?.toFixed(2)}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                            item.isActive ? "bg-green-50 text-green-700" : "bg-navy-50 text-navy-400"
                          }`}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-2">
                          <button
                            onClick={() => setEditTarget(item)}
                            title="Edit item"
                            className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-500"
                          >
                            <Pencil size={15} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="items" />
      </div>

      {createOpen && (
        <ItemFormModal
          vendors={vendors}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}

      {editTarget && (
        <ItemFormModal
          item={editTarget}
          vendors={vendors}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ItemFormModal({ item, vendors, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!item;
  const [form, setForm] = useState({
    name: item?.name || "",
    category: item?.category || "",
    subCategory: item?.subCategory || "",
    unit: item?.unit || "",
    minStockLevel: item?.minStockLevel ?? 0,
    reorderLevel: item?.reorderLevel ?? 0,
    maxStockLevel: item?.maxStockLevel ?? 0,
    preferredVendor: item?.preferredVendor?._id || item?.preferredVendor || "",
    standardRate: item?.standardRate ?? 0,
    gstPercent: item?.gstPercent ?? 0,
    hsnCode: item?.hsnCode || "",
    isActive: item?.isActive ?? true,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.unit) {
      setError("Name and unit are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        category: form.category,
        subCategory: form.subCategory,
        unit: form.unit,
        minStockLevel: Number(form.minStockLevel) || 0,
        reorderLevel: Number(form.reorderLevel) || 0,
        maxStockLevel: Number(form.maxStockLevel) || 0,
        preferredVendor: form.preferredVendor || null,
        standardRate: Number(form.standardRate) || 0,
        gstPercent: Number(form.gstPercent) || 0,
        hsnCode: form.hsnCode,
      };
      if (isEdit) {
        await updateItem(item._id, { ...payload, isActive: form.isActive });
        toast.success(`${form.name} updated.`);
      } else {
        await createItem(payload);
        toast.success(`${form.name} added.`);
      }
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || `Could not ${isEdit ? "update" : "create"} item.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">{isEdit ? "Edit item" : "Add item"}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-navy-700 mb-1">Item name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Maize"
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Category</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Feed"
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Sub-category</label>
              <input
                value={form.subCategory}
                onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Unit</label>
              <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full">
                <option value="">Select unit</option>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Preferred vendor</label>
              <Select
                value={form.preferredVendor}
                onChange={(e) => setForm({ ...form, preferredVendor: e.target.value })}
                className="w-full"
              >
                <option value="">None</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Min stock</label>
              <input
                type="number"
                min="0"
                value={form.minStockLevel}
                onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Reorder level</label>
              <input
                type="number"
                min="0"
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Max stock</label>
              <input
                type="number"
                min="0"
                value={form.maxStockLevel}
                onChange={(e) => setForm({ ...form, maxStockLevel: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Standard rate (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.standardRate}
                onChange={(e) => setForm({ ...form, standardRate: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">GST %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.gstPercent}
                onChange={(e) => setForm({ ...form, gstPercent: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">HSN code</label>
              <input
                value={form.hsnCode}
                onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 text-sm text-navy-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Active
            </label>
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
              {saving ? "Saving..." : isEdit ? "Save changes" : "Add item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
