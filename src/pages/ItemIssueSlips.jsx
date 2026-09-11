import { useEffect, useState, useCallback, useMemo } from "react";
import { Search, X, PackageMinus, ClipboardList, PackageCheck, ArrowRightCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getItemRequirements, processItemRequirement, getItemIssueSlips, getStock } from "../api/endpoints.js";
import { SkeletonTableRows } from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Select from "../components/ui/Select.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import usePagination from "../hooks/usePagination.js";
import StatusBadge from "../components/StatusBadge.jsx";


export default function ItemIssueSlips() {
  const { user } = useAuth();
  const toast = useToast();
  // Fulfilment (processing a requirement) is Admin's action — Super Admin
  // included the same way it has unrestricted access elsewhere in the app.
  const canProcess = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  const [tab, setTab] = useState("requirements"); // "requirements" | "history"
  const [requirements, setRequirements] = useState([]);
  const [slips, setSlips] = useState([]);
  const [stock, setStock] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [processTarget, setProcessTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, slipsRes, stockRes] = await Promise.all([
        getItemRequirements(),
        getItemIssueSlips(),
        getStock(),
      ]);
      setRequirements(reqRes.data.data);
      setSlips(slipsRes.data.data);
      setStock(stockRes.data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load item requirements.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Available on-hand quantity per item+site, used to show what a Process
  // action would actually issue before the Admin commits to it.
  const availabilityMap = useMemo(() => {
    const map = new Map();
    stock.forEach((s) => {
      if (s.item?._id && s.site?._id) map.set(`${s.item._id}_${s.site._id}`, s.quantity);
    });
    return map;
  }, [stock]);

  const actionableRequirements = useMemo(
    () => requirements.filter((r) => r.status !== "FULFILLED"),
    [requirements]
  );

  const filteredRequirements = useMemo(() => {
    return actionableRequirements.filter((r) => {
      const matchesSearch =
        !search ||
        r.department?.toLowerCase().includes(search.toLowerCase()) ||
        r.item?.name?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !statusFilter || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [actionableRequirements, search, statusFilter]);

  const filteredSlips = useMemo(() => {
    return slips.filter((s) => {
      return (
        !search ||
        s.issueSlipNumber?.toLowerCase().includes(search.toLowerCase()) ||
        s.item?.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.issuedTo?.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [slips, search]);

  const reqPagination = usePagination(filteredRequirements, 10);
  const slipPagination = usePagination(filteredSlips, 10);
  const { page, setPage, pageItems, pageSize, total } = tab === "requirements" ? reqPagination : slipPagination;

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, tab, setPage]);

  const reqColumnCount = canProcess ? 7 : 6;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-navy-700">Item issue slips</h1>
        <p className="text-sm text-navy-300 mt-0.5">Fulfil an item requirement once stock is available; issuing reduces the running stock balance.</p>
      </div>

      <div className="flex gap-1 border-b border-navy-100">
        <button
          onClick={() => setTab("requirements")}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "requirements" ? "border-navy-700 text-navy-700" : "border-transparent text-navy-300 hover:text-navy-500"
          }`}
        >
          Requirements to fulfil
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "history" ? "border-navy-700 text-navy-700" : "border-transparent text-navy-300 hover:text-navy-500"
          }`}
        >
          Issue history
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "requirements" ? "Search by department or item" : "Search by issue slip #, item or issued to"}
            className="w-full pl-9 pr-3 py-2 text-sm border border-navy-100 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
        {tab === "requirements" && (
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-40">
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIAL">Partial</option>
          </Select>
        )}
      </div>

      {tab === "requirements" ? (
        <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-navy-300 border-b border-navy-100">
                  <th className="px-4 py-2 font-medium">Department</th>
                  <th className="px-4 py-2 font-medium">Item</th>
                  <th className="px-4 py-2 font-medium">Site</th>
                  <th className="px-4 py-2 font-medium">Remaining</th>
                  <th className="px-4 py-2 font-medium">Available</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  {canProcess && <th className="px-4 py-2 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading && <SkeletonTableRows rows={5} columns={reqColumnCount} />}
                {!loading && filteredRequirements.length === 0 && (
                  <tr>
                    <td colSpan={reqColumnCount}>
                      <EmptyState
                        icon={ClipboardList}
                        title="No open item requirements."
                        description="Everything raised so far has been fully issued."
                      />
                    </td>
                  </tr>
                )}
                {!loading &&
                  tab === "requirements" &&
                  pageItems.map((r) => {
                    const remaining = r.quantity - (r.quantityIssued || 0);
                    const available = availabilityMap.get(`${r.item?._id}_${r.site?._id}`) || 0;
                    return (
                      <tr key={r._id} className="border-b border-navy-50 last:border-0">
                        <td className="px-4 py-2 text-navy-700 font-medium">{r.department}</td>
                        <td className="px-4 py-2 text-navy-500">
                          {r.item?.name || "-"}
                          {r.quantityIssued > 0 && (
                            <span className="block text-xs text-navy-300">{r.quantityIssued} of {r.quantity} issued so far</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-navy-500">{r.site?.name || "-"}</td>
                        <td className="px-4 py-2 text-navy-700 font-medium">
                          {remaining} {r.item?.unit || ""}
                        </td>
                        <td className="px-4 py-2">
                          <span className={available > 0 ? "text-green-700 font-medium" : "text-navy-300"}>
                            {available} {r.item?.unit || ""}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <StatusBadge value={r.status} />
                        </td>
                        {canProcess && (
                          <td className="px-4 py-2">
                            <button
                              onClick={() => setProcessTarget(r)}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-900 text-white"
                            >
                              <ArrowRightCircle size={12} />
                              Process
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="requirements" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-navy-300 border-b border-navy-100">
                  <th className="px-4 py-2 font-medium">Issue slip #</th>
                  <th className="px-4 py-2 font-medium">Item</th>
                  <th className="px-4 py-2 font-medium">Issued to</th>
                  <th className="px-4 py-2 font-medium">Site</th>
                  <th className="px-4 py-2 font-medium">Quantity</th>
                  <th className="px-4 py-2 font-medium">Issued by</th>
                </tr>
              </thead>
              <tbody>
                {loading && <SkeletonTableRows rows={5} columns={6} />}
                {!loading && filteredSlips.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState icon={PackageMinus} title="No item issue slips yet." description="Issued slips will show up here once requirements are processed." />
                    </td>
                  </tr>
                )}
                {!loading &&
                  pageItems.map((s) => (
                    <tr key={s._id} className="border-b border-navy-50 last:border-0">
                      <td className="px-4 py-2 font-mono text-xs text-navy-500">{s.issueSlipNumber}</td>
                      <td className="px-4 py-2 text-navy-700 font-medium">{s.item?.name || "-"}</td>
                      <td className="px-4 py-2 text-navy-500">{s.issuedTo || "-"}</td>
                      <td className="px-4 py-2 text-navy-500">{s.site?.name || "-"}</td>
                      <td className="px-4 py-2 text-navy-700 font-medium">
                        {s.quantity} {s.item?.unit || ""}
                      </td>
                      <td className="px-4 py-2 text-navy-500">{s.issuedBy?.name || "-"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="issue slips" />
        </div>
      )}

      {processTarget && (
        <ProcessRequirementModal
          requirement={processTarget}
          available={availabilityMap.get(`${processTarget.item?._id}_${processTarget.site?._id}`) || 0}
          onClose={() => setProcessTarget(null)}
          onProcessed={() => {
            setProcessTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ProcessRequirementModal({ requirement, available, onClose, onProcessed }) {
  const toast = useToast();
  const remaining = requirement.quantity - (requirement.quantityIssued || 0);
  const [purpose, setPurpose] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [requiredDate, setRequiredDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const willIssue = Math.min(available, remaining);
  const willShortfall = remaining - willIssue;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const { data } = await processItemRequirement(requirement._id, {
        purpose,
        priority,
        ...(requiredDate ? { requiredDate } : {}),
      });
      toast.success(data.message || "Requirement processed.");
      onProcessed();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not process this requirement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-700">Process requirement</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400">
            <X size={18} />
          </button>
        </div>

        <div className="rounded-lg bg-navy-50 px-3 py-2.5 mb-4 space-y-1">
          <p className="text-sm font-medium text-navy-700">
            {requirement.department} · {requirement.item?.name}
          </p>
          <p className="text-xs text-navy-400">
            Remaining {remaining} {requirement.item?.unit}, {available} {requirement.item?.unit} available at {requirement.site?.name}
          </p>
        </div>

        {willIssue > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-2">
            <PackageCheck size={14} />
            Will issue {willIssue} {requirement.item?.unit} now from available stock.
          </p>
        )}
        {willShortfall > 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">
            {willIssue > 0 ? "The remaining" : "The full"} {willShortfall} {requirement.item?.unit} will be raised as a Purchase Requisition for the shortfall.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {willShortfall > 0 && (
            <>
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">Purpose (for the requisition)</label>
                <input
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Optional"
                  className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-navy-700 mb-1">Priority</label>
                  <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-700 mb-1">Required by</label>
                  <input
                    type="date"
                    value={requiredDate}
                    onChange={(e) => setRequiredDate(e.target.value)}
                    className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              </div>
            </>
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
              {saving ? "Processing..." : "Process"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
