import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Search, X, Truck, Pencil, Power } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getVendors, createVendor, updateVendor, toggleVendorActive } from "../api/endpoints.js";
import { SkeletonTableRows } from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Select from "../components/ui/Select.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import usePagination from "../hooks/usePagination.js";

export default function VendorMaster() {
  const { user } = useAuth();
  const toast = useToast();
  // Super Admin and Management can create/edit vendors and toggle status;
  // every other role that can open this page gets a view-only list.
  const canEdit = user?.role === "SUPER_ADMIN" || user?.role === "MANAGEMENT";

  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [toggleBusyId, setToggleBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getVendors();
      setVendors(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const matchesSearch =
        !search ||
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.vendorCode.toLowerCase().includes(search.toLowerCase()) ||
        (v.contactPerson || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        !statusFilter || (statusFilter === "ACTIVE" ? v.isActive : !v.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [vendors, search, statusFilter]);

  const { page, setPage, pageItems, pageSize, total } = usePagination(filteredVendors, 10);
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, setPage]);

  const handleToggle = async (vendor) => {
    setToggleBusyId(vendor._id);
    try {
      await toggleVendorActive(vendor._id);
      toast.success(`${vendor.name} marked ${vendor.isActive ? "inactive" : "active"}.`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update vendor status.");
    } finally {
      setToggleBusyId(null);
    }
  };

  const columnCount = canEdit ? 7 : 6;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-navy-700">Vendor master</h1>
        {canEdit && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 text-sm rounded-lg bg-navy-700 hover:bg-navy-900 text-white px-3 py-2"
          >
            <Plus size={16} />
            Add vendor
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code or contact"
            className="w-full pl-9 pr-3 py-2 text-sm border border-navy-100 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-40">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-300 border-b border-navy-100">
                <th className="px-4 py-2 font-medium">Vendor code</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">GST number</th>
                <th className="px-4 py-2 font-medium">Payment terms</th>
                <th className="px-4 py-2 font-medium">Status</th>
                {canEdit && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={5} columns={columnCount} />}
              {!loading && filteredVendors.length === 0 && (
                <tr>
                  <td colSpan={columnCount}>
                    <EmptyState
                      icon={Truck}
                      title="No vendors found."
                      description={canEdit ? "Add your first vendor to start building the master list." : "No vendors match this search."}
                    />
                  </td>
                </tr>
              )}
              {!loading &&
                pageItems.map((vendor) => (
                  <tr key={vendor._id} className="border-b border-navy-50 last:border-0">
                    <td className="px-4 py-2 font-mono text-xs text-navy-500">{vendor.vendorCode}</td>
                    <td className="px-4 py-2 text-navy-700 font-medium">
                      {vendor.name}
                      {vendor.category && <span className="block text-xs text-navy-300 font-normal">{vendor.category}</span>}
                    </td>
                    <td className="px-4 py-2 text-navy-500">
                      {vendor.contactPerson || "-"}
                      {vendor.mobile && <span className="block text-xs text-navy-300">{vendor.mobile}</span>}
                    </td>
                    <td className="px-4 py-2 text-navy-500 font-mono text-xs">{vendor.gstNumber || "-"}</td>
                    <td className="px-4 py-2 text-navy-500">{vendor.paymentTerms || "-"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                          vendor.isActive ? "bg-green-50 text-green-700" : "bg-navy-50 text-navy-400"
                        }`}
                      >
                        {vendor.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditTarget(vendor)}
                            title="Edit vendor"
                            className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-500"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleToggle(vendor)}
                            disabled={toggleBusyId === vendor._id}
                            title={vendor.isActive ? "Mark inactive" : "Mark active"}
                            className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-500 disabled:opacity-50"
                          >
                            <Power size={15} className={toggleBusyId === vendor._id ? "animate-pulse" : ""} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="vendors" />
      </div>

      {createOpen && (
        <VendorFormModal
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}

      {editTarget && (
        <VendorFormModal
          vendor={editTarget}
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

function VendorFormModal({ vendor, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!vendor;
  const [form, setForm] = useState({
    name: vendor?.name || "",
    contactPerson: vendor?.contactPerson || "",
    mobile: vendor?.mobile || "",
    email: vendor?.email || "",
    address: vendor?.address || "",
    gstNumber: vendor?.gstNumber || "",
    pan: vendor?.pan || "",
    accountName: vendor?.bankDetails?.accountName || "",
    accountNumber: vendor?.bankDetails?.accountNumber || "",
    ifsc: vendor?.bankDetails?.ifsc || "",
    bankName: vendor?.bankDetails?.bankName || "",
    paymentTerms: vendor?.paymentTerms || "",
    creditDays: vendor?.creditDays ?? 0,
    category: vendor?.category || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name) {
      setError("Vendor name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        contactPerson: form.contactPerson,
        mobile: form.mobile,
        email: form.email,
        address: form.address,
        gstNumber: form.gstNumber,
        pan: form.pan,
        bankDetails: {
          accountName: form.accountName,
          accountNumber: form.accountNumber,
          ifsc: form.ifsc,
          bankName: form.bankName,
        },
        paymentTerms: form.paymentTerms,
        creditDays: Number(form.creditDays) || 0,
        category: form.category,
      };
      if (isEdit) {
        await updateVendor(vendor._id, payload);
        toast.success(`${form.name} updated.`);
      } else {
        await createVendor(payload);
        toast.success(`${form.name} added.`);
      }
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || `Could not ${isEdit ? "update" : "create"} vendor.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">{isEdit ? "Edit vendor" : "Add vendor"}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-navy-700 mb-1">Vendor name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Sharma Feeds Pvt. Ltd."
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Contact person</label>
              <input
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Mobile</label>
              <input
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Category</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Feed supplier"
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-navy-700 mb-1">Address</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">GST number</label>
              <input
                value={form.gstNumber}
                onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">PAN</label>
              <input
                value={form.pan}
                onChange={(e) => setForm({ ...form, pan: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Credit days</label>
              <input
                type="number"
                min="0"
                value={form.creditDays}
                onChange={(e) => setForm({ ...form, creditDays: e.target.value })}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Payment terms</label>
            <input
              value={form.paymentTerms}
              onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
              placeholder="e.g. Net 30"
              className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          <div className="pt-1 border-t border-navy-50">
            <p className="text-xs font-semibold text-navy-700 mt-3 mb-2">Bank details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">Account name</label>
                <input
                  value={form.accountName}
                  onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                  className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">Account number</label>
                <input
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                  className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">IFSC</label>
                <input
                  value={form.ifsc}
                  onChange={(e) => setForm({ ...form, ifsc: e.target.value })}
                  className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">Bank name</label>
                <input
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>
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
              {saving ? "Saving..." : isEdit ? "Save changes" : "Add vendor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
