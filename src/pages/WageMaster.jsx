import { useEffect, useState, useCallback } from "react";
import { Plus, X, TrendingUp, Pencil, Wallet, Trash2, SlidersHorizontal } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  getWageMasters,
  createWageMaster,
  updateWageMaster,
  deleteWageMaster,
  manualOverrideWageMaster,
  applyYearlyIncrement,
} from "../api/endpoints.js";
import { SkeletonTableRows } from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Select from "../components/ui/Select.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import usePagination from "../hooks/usePagination.js";

const APPLIES_TO = [
  { value: "PERMANENT", label: "Permanent" },
  { value: "CONSTRUCTION_LABOUR", label: "Construction labour" },
  { value: "PAINTER", label: "Painter" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "ELECTRICIAN", label: "Electrician" },
];

export default function WageMaster() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const toast = useToast();

  const [wageMasters, setWageMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [incrementingId, setIncrementingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getWageMasters();
      setWageMasters(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { page, setPage, pageItems, pageSize, total } = usePagination(wageMasters, 10);

  const handleDelete = async (wm) => {
    if (!confirm(`Delete "${wm.name}"? This cannot be undone.`)) return;
    try {
      await deleteWageMaster(wm._id);
      toast.success(`${wm.name} deleted.`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete wage master.");
    }
  };

  const handleIncrement = async (id) => {
    if (!confirm("Apply the configured yearly increment to this wage master?")) return;
    setIncrementingId(id);
    try {
      await applyYearlyIncrement(id);
      toast.success("Yearly increment applied.");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not apply increment.");
    } finally {
      setIncrementingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-navy-700">Wage master</h1>
        {isSuperAdmin && (
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 text-sm rounded-lg bg-navy-700 hover:bg-navy-900 text-white px-3 py-2"
          >
            <Plus size={16} />
            Add wage master
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-300 border-b border-navy-100">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Applies to</th>
                <th className="px-4 py-2 font-medium">Day rate</th>
                <th className="px-4 py-2 font-medium">OT rate/hr</th>
                <th className="px-4 py-2 font-medium">Yearly increment</th>
                {isSuperAdmin && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={4} columns={6} />}
              {!loading && wageMasters.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Wallet}
                      title="No wage masters yet."
                      description={isSuperAdmin ? "Add one to start assigning pay rates to employees." : "Ask your Super Admin to set up pay rates."}
                    />
                  </td>
                </tr>
              )}
              {!loading &&
                pageItems.map((wm) => (
                  <tr key={wm._id} className="border-b border-navy-50 last:border-0">
                    <td className="px-4 py-2 text-navy-700 font-medium">{wm.name}</td>
                    <td className="px-4 py-2 text-navy-500">
                      {APPLIES_TO.find((a) => a.value === wm.appliesTo)?.label}
                    </td>
                    <td className="px-4 py-2 text-navy-700">₹{wm.dayRate}</td>
                    <td className="px-4 py-2 text-navy-500">₹{wm.overtimeRatePerHour}</td>
                    <td className="px-4 py-2 text-navy-500">{wm.yearlyIncrementPercent}%</td>
                    {isSuperAdmin && (
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditTarget(wm)}
                            title="Edit wage master"
                            className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-500"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setOverrideTarget(wm)}
                            title="Manual override"
                            className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-500"
                          >
                            <SlidersHorizontal size={15} />
                          </button>
                          <button
                            onClick={() => handleIncrement(wm._id)}
                            disabled={incrementingId === wm._id}
                            title="Apply yearly increment"
                            className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-500 disabled:opacity-50"
                          >
                            <TrendingUp size={15} className={incrementingId === wm._id ? "animate-pulse" : ""} />
                          </button>
                          <button
                            onClick={() => handleDelete(wm)}
                            title="Delete wage master"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="wage masters" />
      </div>

      {addOpen && (
        <AddWageMasterModal
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setAddOpen(false);
            load();
          }}
        />
      )}

      {editTarget && (
        <EditWageMasterModal
          wageMaster={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            load();
          }}
        />
      )}

      {overrideTarget && (
        <OverrideModal
          wageMaster={overrideTarget}
          onClose={() => setOverrideTarget(null)}
          onSaved={() => {
            setOverrideTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function AddWageMasterModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    appliesTo: "PERMANENT",
    dayRate: "",
    overtimeRatePerHour: "",
    yearlyIncrementPercent: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.dayRate) {
      setError("Name and day rate are required.");
      return;
    }
    setSaving(true);
    try {
      await createWageMaster({
        name: form.name,
        appliesTo: form.appliesTo,
        dayRate: Number(form.dayRate),
        overtimeRatePerHour: Number(form.overtimeRatePerHour) || 0,
        yearlyIncrementPercent: Number(form.yearlyIncrementPercent) || 0,
      });
      toast.success(`${form.name} added.`);
      onCreated();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not create wage master.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">Add wage master</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Wages A"
              className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Applies to</label>
            <Select
              value={form.appliesTo}
              onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}
              className="w-full"
            >
              {APPLIES_TO.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Day rate</label>
              <input
                type="number"
                value={form.dayRate}
                onChange={(e) => setForm({ ...form, dayRate: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">OT rate/hr</label>
              <input
                type="number"
                value={form.overtimeRatePerHour}
                onChange={(e) => setForm({ ...form, overtimeRatePerHour: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Yearly increment %</label>
            <input
              type="number"
              value={form.yearlyIncrementPercent}
              onChange={(e) => setForm({ ...form, yearlyIncrementPercent: e.target.value })}
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
              {saving ? "Saving..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OverrideModal({ wageMaster, onClose, onSaved }) {
  const toast = useToast();
  const [newRate, setNewRate] = useState(wageMaster.dayRate);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!reason.trim()) {
      setError("A reason is required for a manual override.");
      return;
    }
    setSaving(true);
    try {
      await manualOverrideWageMaster(wageMaster._id, { newRate: Number(newRate), reason });
      toast.success("Rate override applied.");
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not apply override.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">Manual rate override</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-navy-500 mb-3">{wageMaster.name} — current rate ₹{wageMaster.dayRate}/day</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">New day rate</label>
            <input
              type="number"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Reason (mandatory)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
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
              {saving ? "Saving..." : "Apply override"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditWageMasterModal({ wageMaster, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: wageMaster.name || "",
    appliesTo: wageMaster.appliesTo,
    overtimeRatePerHour: wageMaster.overtimeRatePerHour ?? "",
    yearlyIncrementPercent: wageMaster.yearlyIncrementPercent ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    try {
      await updateWageMaster(wageMaster._id, {
        name: form.name,
        appliesTo: form.appliesTo,
        overtimeRatePerHour: Number(form.overtimeRatePerHour) || 0,
        yearlyIncrementPercent: Number(form.yearlyIncrementPercent) || 0,
      });
      toast.success(`${form.name} updated.`);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not update wage master.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">Edit wage master</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Applies to</label>
            <Select
              value={form.appliesTo}
              onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}
              className="w-full"
            >
              {APPLIES_TO.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">OT rate/hr</label>
            <input
              type="number"
              value={form.overtimeRatePerHour}
              onChange={(e) => setForm({ ...form, overtimeRatePerHour: e.target.value })}
              className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Yearly increment %</label>
            <input
              type="number"
              value={form.yearlyIncrementPercent}
              onChange={(e) => setForm({ ...form, yearlyIncrementPercent: e.target.value })}
              className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          <p className="text-xs text-navy-300">
            To change the day rate, use the manual override action instead — it keeps a reasoned audit trail.
          </p>

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
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
