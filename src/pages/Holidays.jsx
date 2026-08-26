import { useEffect, useState, useCallback } from "react";
import { Plus, X, Check, Ban, PartyPopper } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSiteScope } from "../context/SiteScopeContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getHolidays, proposeHoliday, decideHoliday } from "../api/endpoints.js";
import { SkeletonTableRows } from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import usePagination from "../hooks/usePagination.js";

const STATUS_STYLES = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
};

export default function Holidays() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { sites } = useSiteScope();
  const toast = useToast();

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getHolidays();
      setHolidays(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { page, setPage, pageItems, pageSize, total } = usePagination(holidays, 10);

  const handleReject = async (id) => {
    if (!confirm("Reject this proposed holiday?")) return;
    setRejectingId(id);
    try {
      await decideHoliday(id, { decision: "REJECTED" });
      toast.success("Holiday rejected.");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not reject holiday.");
    } finally {
      setRejectingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-navy-700">National holiday calendar</h1>
        <button
          onClick={() => setProposeOpen(true)}
          className="flex items-center gap-1.5 text-sm rounded-lg bg-navy-700 hover:bg-navy-900 text-white px-3 py-2"
        >
          <Plus size={16} />
          Propose holiday
        </button>
      </div>

      <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-300 border-b border-navy-100">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Applicable sites</th>
                <th className="px-4 py-2 font-medium">Proposed by</th>
                <th className="px-4 py-2 font-medium">Status</th>
                {isSuperAdmin && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={4} columns={isSuperAdmin ? 6 : 5} />}
              {!loading && holidays.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5}>
                    <EmptyState
                      icon={PartyPopper}
                      title="No holidays proposed yet."
                      description={isSuperAdmin ? "Holidays proposed by Admins will show up here for approval." : "Propose a national or site holiday for Super Admin approval."}
                    />
                  </td>
                </tr>
              )}
              {!loading &&
                pageItems.map((h) => (
                  <tr key={h._id} className="border-b border-navy-50 last:border-0">
                    <td className="px-4 py-2 text-navy-700 font-medium">{h.name}</td>
                    <td className="px-4 py-2 text-navy-500">{new Date(h.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-navy-500">
                      {h.sites?.length ? h.sites.map((s) => s.name).join(", ") : h.status === "PENDING" ? "To be confirmed" : "-"}
                    </td>
                    <td className="px-4 py-2 text-navy-500">{h.proposedBy?.name || "-"}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[h.status]}`}>
                        {h.status}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-2">
                        {h.status === "PENDING" ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => setDecisionTarget(h)}
                              title="Approve & choose sites"
                              className="p-1.5 rounded-lg hover:bg-green-50 text-green-700"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              onClick={() => handleReject(h._id)}
                              disabled={rejectingId === h._id}
                              title="Reject"
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-700 disabled:opacity-50"
                            >
                              <Ban size={15} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-navy-300">
                            {h.approvedBy?.name ? `by ${h.approvedBy.name}` : "-"}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="holidays" />
      </div>

      {proposeOpen && (
        <ProposeHolidayModal
          onClose={() => setProposeOpen(false)}
          onCreated={() => {
            setProposeOpen(false);
            load();
          }}
        />
      )}

      {decisionTarget && (
        <ApproveHolidayModal
          holiday={decisionTarget}
          sites={sites}
          onClose={() => setDecisionTarget(null)}
          onSaved={() => {
            setDecisionTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ProposeHolidayModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", date: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.date) {
      setError("Name and date are required.");
      return;
    }
    setSaving(true);
    try {
      await proposeHoliday(form);
      toast.success("Holiday proposed for approval.");
      onCreated();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not propose holiday.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">Propose holiday</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Holiday name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Diwali"
              className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
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
              {saving ? "Submitting..." : "Propose"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ApproveHolidayModal({ holiday, sites, onClose, onSaved }) {
  const toast = useToast();
  const [selectedSites, setSelectedSites] = useState(holiday.sites?.map((s) => s._id) || []);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleSite = (id) => {
    setSelectedSites((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (selectedSites.length === 0) {
      setError("Select at least one site this holiday applies to.");
      return;
    }
    setSaving(true);
    try {
      await decideHoliday(holiday._id, { decision: "APPROVED", sites: selectedSites });
      toast.success("Holiday approved.");
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not approve holiday.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">Approve holiday</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-navy-500 mb-3">
          {holiday.name} — {new Date(holiday.date).toLocaleDateString()}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-navy-700 mb-2">
              Applies to (holidays are not automatic across all sites)
            </label>
            <div className="space-y-1.5">
              {sites.map((s) => (
                <label key={s._id} className="flex items-center gap-2 text-sm text-navy-700">
                  <input
                    type="checkbox"
                    checked={selectedSites.includes(s._id)}
                    onChange={() => toggleSite(s._id)}
                  />
                  {s.name}
                </label>
              ))}
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
              {saving ? "Saving..." : "Approve"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
