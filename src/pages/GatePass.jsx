import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Search, X, DoorOpen, Undo2, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getGatePasses, createGatePass, updateGatePassReturn, getSites, getItems, getUsers } from "../api/endpoints.js";
import { SkeletonTableRows } from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Select from "../components/ui/Select.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import usePagination from "../hooks/usePagination.js";

// Site is forced to the logged-in user's own site for these two roles on
// create (see backend/src/controllers/gatePassController.js); Super Admin
// can raise a gate pass for any site.
const SITE_LOCKED_ROLES = ["ADMIN", "STORE_KEEPER"];

export default function GatePass() {
  const { user } = useAuth();
  const toast = useToast();
  const canCreate = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || user?.role === "STORE_KEEPER";
  const isSiteLocked = SITE_LOCKED_ROLES.includes(user?.role);

  const [gatePasses, setGatePasses] = useState([]);
  const [sites, setSites] = useState([]);
  const [items, setItems] = useState([]);
  const [approvers, setApprovers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gpRes, sitesRes, itemsRes, usersRes] = await Promise.all([
        getGatePasses(),
        getSites(),
        getItems({ isActive: true }),
        getUsers(),
      ]);
      setGatePasses(gpRes.data.data);
      setSites(sitesRes.data.data);
      setItems(itemsRes.data.data);
      setApprovers(usersRes.data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load gate passes.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredGatePasses = useMemo(() => {
    return gatePasses.filter((g) => {
      const matchesSearch =
        !search ||
        g.gatePassNumber?.toLowerCase().includes(search.toLowerCase()) ||
        g.materialName?.toLowerCase().includes(search.toLowerCase()) ||
        g.partyOrVendorName?.toLowerCase().includes(search.toLowerCase()) ||
        g.vehicleNumber?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        !statusFilter || (statusFilter === "RETURNED" ? g.materialReturned : !g.materialReturned);
      return matchesSearch && matchesStatus;
    });
  }, [gatePasses, search, statusFilter]);

  const { page, setPage, pageItems, pageSize, total } = usePagination(filteredGatePasses, 10);
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, setPage]);

  const columnCount = canCreate ? 8 : 7;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-navy-700">Gate pass</h1>
        {canCreate && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 text-sm rounded-lg bg-navy-700 hover:bg-navy-900 text-white px-3 py-2"
          >
            <Plus size={16} />
            Create gate pass
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by gate pass #, material, party or vehicle"
            className="w-full pl-9 pr-3 py-2 text-sm border border-navy-100 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-40">
          <option value="">All</option>
          <option value="OUT">Out</option>
          <option value="RETURNED">Returned</option>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-300 border-b border-navy-100">
                <th className="px-4 py-2 font-medium">Gate pass #</th>
                <th className="px-4 py-2 font-medium">Material</th>
                <th className="px-4 py-2 font-medium">Party / vendor</th>
                <th className="px-4 py-2 font-medium">Site</th>
                <th className="px-4 py-2 font-medium">Approved by</th>
                <th className="px-4 py-2 font-medium">Expected return</th>
                <th className="px-4 py-2 font-medium">Status</th>
                {canCreate && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={5} columns={columnCount} />}
              {!loading && filteredGatePasses.length === 0 && (
                <tr>
                  <td colSpan={columnCount}>
                    <EmptyState
                      icon={DoorOpen}
                      title="No gate passes found."
                      description={canCreate ? "Create a gate pass when material leaves the site expecting to come back." : "No gate passes match this search."}
                    />
                  </td>
                </tr>
              )}
              {!loading &&
                pageItems.map((g) => (
                  <tr key={g._id} className="border-b border-navy-50 last:border-0">
                    <td className="px-4 py-2 font-mono text-xs text-navy-500">{g.gatePassNumber}</td>
                    <td className="px-4 py-2 text-navy-700 font-medium">
                      {g.materialName}
                      <span className="block text-xs text-navy-300 font-normal">
                        {g.quantity} {g.unit}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-navy-500">{g.partyOrVendorName || "-"}</td>
                    <td className="px-4 py-2 text-navy-500">{g.site?.name || "-"}</td>
                    <td className="px-4 py-2 text-navy-500">{g.approvedBy?.name || "-"}</td>
                    <td className="px-4 py-2 text-navy-500">
                      {g.returnExpectedDate ? new Date(g.returnExpectedDate).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                          g.materialReturned ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {g.materialReturned ? "Returned" : "Out"}
                      </span>
                    </td>
                    {canCreate && (
                      <td className="px-4 py-2">
                        {!g.materialReturned ? (
                          <button
                            onClick={() => setReturnTarget(g)}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-900 text-white"
                          >
                            <Undo2 size={12} />
                            Record return
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-navy-300">
                            <ShieldCheck size={12} />
                            by {g.securityVerifiedBy?.name || "security"}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="gate passes" />
      </div>

      {createOpen && (
        <CreateGatePassModal
          sites={sites}
          items={items}
          approvers={approvers}
          user={user}
          isSiteLocked={isSiteLocked}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}

      {returnTarget && (
        <RecordReturnModal
          gatePass={returnTarget}
          onClose={() => setReturnTarget(null)}
          onRecorded={() => {
            setReturnTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateGatePassModal({ sites, items, approvers, user, isSiteLocked, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    department: "",
    partyOrVendorName: "",
    vehicleNumber: "",
    driverName: "",
    driverMobile: "",
    item: "",
    materialName: "",
    quantity: "",
    unit: "",
    purpose: "",
    returnExpectedDate: "",
    conditionAtDispatch: "",
    site: isSiteLocked ? user?.site?._id || user?.site || "" : "",
    approvedBy: "",
    remarks: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleItemSelect = (itemId) => {
    const selected = items.find((i) => i._id === itemId);
    setForm({
      ...form,
      item: itemId,
      materialName: selected ? selected.name : form.materialName,
      unit: selected ? selected.unit : form.unit,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.materialName || !form.quantity || !form.site || !form.approvedBy) {
      setError("Material name, quantity, site and Approved By are required.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await createGatePass({
        ...form,
        item: form.item || null,
        quantity: Number(form.quantity),
      });
      toast.success(`${data.data.gatePassNumber} created.`);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not create gate pass.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">Create gate pass</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Department</label>
              <input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Party / vendor name</label>
              <input
                value={form.partyOrVendorName}
                onChange={(e) => setForm({ ...form, partyOrVendorName: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Item (optional — links to the master)</label>
            <Select value={form.item} onChange={(e) => handleItemSelect(e.target.value)} className="w-full">
              <option value="">No linked item</option>
              {items.map((i) => (
                <option key={i._id} value={i._id}>
                  {i.itemCode} — {i.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-navy-700 mb-1">Material name</label>
              <input
                value={form.materialName}
                onChange={(e) => setForm({ ...form, materialName: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Unit</label>
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="Nos."
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

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
              <label className="block text-xs font-medium text-navy-700 mb-1">Site</label>
              {isSiteLocked ? (
                <input
                  disabled
                  value={user?.site?.name || "Your site"}
                  className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 bg-navy-50 text-navy-400"
                />
              ) : (
                <Select value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} className="w-full">
                  <option value="">Select site</option>
                  {sites.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Vehicle number</label>
              <input
                value={form.vehicleNumber}
                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Driver name</label>
              <input
                value={form.driverName}
                onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Driver mobile</label>
              <input
                value={form.driverMobile}
                onChange={(e) => setForm({ ...form, driverMobile: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Expected return date</label>
              <input
                type="date"
                value={form.returnExpectedDate}
                onChange={(e) => setForm({ ...form, returnExpectedDate: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Purpose</label>
            <input
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              placeholder="e.g. repair, job-work, on approval"
              className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Condition at dispatch</label>
              <input
                value={form.conditionAtDispatch}
                onChange={(e) => setForm({ ...form, conditionAtDispatch: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Approved by</label>
              <Select value={form.approvedBy} onChange={(e) => setForm({ ...form, approvedBy: e.target.value })} className="w-full">
                <option value="">Select approver</option>
                {approvers.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name} ({a.role})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Remarks</label>
            <input
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
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
              {saving ? "Saving..." : "Create gate pass"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordReturnModal({ gatePass, onClose, onRecorded }) {
  const toast = useToast();
  const [form, setForm] = useState({
    returnQuantity: String(gatePass.quantity || 0),
    receiverNameSignature: "",
    conditionAtReturn: "",
    securityVerification: true,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.receiverNameSignature.trim()) {
      setError("Receiver name / signature is required.");
      return;
    }
    setSaving(true);
    try {
      await updateGatePassReturn(gatePass._id, {
        returnQuantity: Number(form.returnQuantity) || 0,
        receiverNameSignature: form.receiverNameSignature,
        conditionAtReturn: form.conditionAtReturn,
        securityVerification: form.securityVerification,
      });
      toast.success(`${gatePass.gatePassNumber} marked returned.`);
      onRecorded();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not record the return.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">Record return — {gatePass.gatePassNumber}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-navy-500 mb-3">
          {gatePass.materialName} · Dispatched {gatePass.quantity} {gatePass.unit}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Return quantity</label>
              <input
                type="number"
                min="0"
                value={form.returnQuantity}
                onChange={(e) => setForm({ ...form, returnQuantity: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Condition at return</label>
              <input
                value={form.conditionAtReturn}
                onChange={(e) => setForm({ ...form, conditionAtReturn: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Receiver name / signature</label>
            <input
              value={form.receiverNameSignature}
              onChange={(e) => setForm({ ...form, receiverNameSignature: e.target.value })}
              className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-navy-700">
            <input
              type="checkbox"
              checked={form.securityVerification}
              onChange={(e) => setForm({ ...form, securityVerification: e.target.checked })}
              className="rounded border-navy-100 text-accent-500 focus:ring-accent-500"
            />
            Security verified this return
          </label>

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
              {saving ? "Saving..." : "Record return"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
