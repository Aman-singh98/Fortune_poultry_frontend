import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShoppingBag,
  HandCoins,
  AlertTriangle,
  Route,
  Paperclip,
  X,
  Trash2,
  Pencil,
  Check,
  Search,
  UserRound,
  Users,
  FileText,
  Image as ImageIcon,
  Info,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  getSalaryLedgerEntries,
  createSalaryLedgerEntry,
  deleteSalaryLedgerEntry,
  getTravelRate,
  updateTravelRate,
} from "../api/endpoints.js";
import { SkeletonTableRows } from "./ui/Skeleton.jsx";
import EmptyState from "./ui/EmptyState.jsx";
import Select from "./ui/Select.jsx";
import Pagination from "./ui/Pagination.jsx";
import usePagination from "../hooks/usePagination.js";

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024; // 5MB, matches the backend's Cloudinary upload cap

// True if the given employee (plain object) is visible/operable at siteId — home
// site, an extra assigned site, or flagged visible on every site. Mirrors the same
// helper already used elsewhere on the Attendance page.
function worksAtSite(emp, siteId) {
  if (!siteId) return false;
  if (emp.allSites) return true;
  if ((emp.site?._id || emp.site) === siteId) return true;
  return (emp.sites || []).some((s) => (s?._id || s) === siteId);
}

function personIdLabel(emp) {
  return emp.employeeType === "PERMANENT" ? emp.employeeCode || emp.labourId : emp.labourId;
}

export const ENTRY_TYPES = [
  {
    key: "DAILY_DEDUCTION",
    label: "Daily Deduction",
    icon: ShoppingBag,
    hint: "Birds, eggs, or anything else bought against salary today.",
    amountLabel: "Amount deducted",
    tone: "text-orange-600 bg-orange-50 border-orange-200",
  },
  {
    key: "ADVANCE",
    label: "Advance",
    icon: HandCoins,
    hint: "Cash advance paid out, to be recovered from salary.",
    amountLabel: "Advance amount",
    tone: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    key: "FINE",
    label: "Fine",
    icon: AlertTriangle,
    hint: "Penalty/fine to be deducted from salary.",
    amountLabel: "Fine amount",
    tone: "text-red-600 bg-red-50 border-red-200",
  },
  {
    key: "TRAVEL",
    label: "Travel",
    icon: Route,
    hint: "Trip made for work — reimbursed at the rate/km below and added to salary.",
    amountLabel: "Amount (auto)",
    tone: "text-teal-600 bg-teal-50 border-teal-200",
  },
];

const emptyForm = {
  employeeId: "",
  date: "",
  amount: "",
  km: "",
  remark: "",
  document: null, // { name, mimeType, data }
};

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Card for logging day-to-day Daily Deduction / Advance / Fine / Travel entries
 * against Employees or Labour/Wages workers, and browsing their history. Entries
 * sit as PENDING until the person's monthly salary is next generated, at which
 * point the backend automatically folds them in (deductions or, for Travel,
 * added to earnings) and marks them SETTLED.
 */
export default function SalaryLedgerCard({
  employees = [],
  siteId,
  defaultPersonType = "PERMANENT",
  // Optional controlled person-type — pass both to let a parent page (e.g. a
  // summary strip sitting above this card) stay in sync with the toggle below.
  // Falls back to internal state so existing callers (just `defaultPersonType`)
  // keep working unchanged.
  personType: personTypeProp,
  onPersonTypeChange,
  // Fired after an entry is successfully added or deleted, so a parent page
  // can refresh anything it derives from ledger entries (e.g. pending totals).
  onChanged,
}) {
  const { user } = useAuth();
  const toast = useToast();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  // Only Super Admin and Admin may delete a ledger entry (matches the backend's
  // route-level authorize check in salaryLedgerRoutes.js) — everyone else who
  // can view/add entries (e.g. Store Keeper) sees the history read-only.
  const canDelete = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  const [personTypeState, setPersonTypeState] = useState(defaultPersonType);
  const personType = personTypeProp ?? personTypeState;
  const setPersonType = onPersonTypeChange ?? setPersonTypeState;
  const [entryType, setEntryType] = useState("DAILY_DEDUCTION");
  const [statusFilter, setStatusFilter] = useState("");
  const [personSearch, setPersonSearch] = useState("");

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ ...emptyForm, date: todayStr() });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [travelRate, setTravelRate] = useState(null);
  const [rateEditing, setRateEditing] = useState(false);
  const [rateInput, setRateInput] = useState("");
  const [rateSaving, setRateSaving] = useState(false);

  const activeMeta = ENTRY_TYPES.find((t) => t.key === entryType);

  const loadTravelRate = useCallback(async () => {
    try {
      const { data } = await getTravelRate();
      setTravelRate(data.data.ratePerKm);
    } catch {
      // Non-critical — the add-entry form just won't show a live preview.
    }
  }, []);

  useEffect(() => {
    loadTravelRate();
  }, [loadTravelRate]);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getSalaryLedgerEntries({
        employeeType: personType,
        type: entryType,
        site: siteId || undefined,
        status: statusFilter || undefined,
      });
      setEntries(data.data);
    } catch {
      toast.error("Could not load history.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personType, entryType, siteId, statusFilter]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // People eligible for the current person-type toggle, at the current site,
  // narrowed further by the quick search box in the add-entry form.
  const peopleOptions = useMemo(() => {
    let list = employees.filter((e) => worksAtSite(e, siteId) && e.employeeType === personType);
    if (personSearch.trim()) {
      const q = personSearch.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.labourId || "").toLowerCase().includes(q) ||
          (e.employeeCode || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [employees, siteId, personType, personSearch]);

  useEffect(() => {
    // Switching person-type/site clears a form selection that may no longer be valid.
    setForm((f) => ({ ...emptyForm, date: f.date || todayStr() }));
    setFormError("");
  }, [personType, siteId]);

  const historyPagination = usePagination(entries, 8);

  const previewAmount =
    entryType === "TRAVEL" && travelRate && form.km
      ? Math.round(Number(form.km) * travelRate * 100) / 100
      : null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_DOCUMENT_BYTES) {
      toast.error("That document is too large — please keep it under 5MB.");
      e.target.value = "";
      return;
    }
    const data = await fileToBase64(file);
    setForm((f) => ({ ...f, document: { name: file.name, mimeType: file.type || "application/octet-stream", data } }));
    e.target.value = "";
  };

  const resetForm = () => setForm({ ...emptyForm, date: todayStr() });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.employeeId) return setFormError("Select a person.");
    if (!form.remark.trim()) return setFormError("A remark is required.");
    if (entryType === "TRAVEL") {
      if (!form.km || Number(form.km) <= 0) return setFormError("Enter the distance travelled in km.");
    } else if (!form.amount || Number(form.amount) <= 0) {
      return setFormError("Enter a valid amount.");
    }

    setSubmitting(true);
    try {
      await createSalaryLedgerEntry({
        employee: form.employeeId,
        type: entryType,
        date: form.date || undefined,
        amount: entryType === "TRAVEL" ? undefined : Number(form.amount),
        km: entryType === "TRAVEL" ? Number(form.km) : undefined,
        remark: form.remark.trim(),
        document: form.document || undefined,
      });
      toast.success(`${activeMeta.label} entry recorded.`);
      resetForm();
      loadEntries();
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save this entry.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSalaryLedgerEntry(id);
      toast.success("Entry deleted.");
      setEntries((prev) => prev.filter((e) => e._id !== id));
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete this entry.");
    }
  };

  const handleSaveRate = async () => {
    const value = Number(rateInput);
    if (!value || value <= 0) return toast.error("Enter a valid rate.");
    setRateSaving(true);
    try {
      const { data } = await updateTravelRate({ ratePerKm: value });
      setTravelRate(data.data.ratePerKm);
      setRateEditing(false);
      toast.success("Travel rate updated. Future trips will use the new rate.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update the rate.");
    } finally {
      setRateSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-navy-100">
      <div className="p-4 space-y-4">
        {/* Person-type toggle */}
        <div className="flex items-center gap-1 bg-navy-50/70 p-1 rounded-xl w-fit">
          {[
            { key: "PERMANENT", label: "Employees", icon: UserRound },
            { key: "WAGES", label: "Labour / Wages", icon: Users },
          ].map((t) => {
            const Icon = t.icon;
            const active = personType === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setPersonType(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active ? "bg-white text-navy-700 shadow-sm" : "text-navy-400 hover:text-navy-600"
                }`}
              >
                <Icon size={13} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Entry-type sub-tabs */}
        <div className="flex flex-wrap gap-2">
          {ENTRY_TYPES.map((t) => {
            const Icon = t.icon;
            const active = entryType === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setEntryType(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  active ? t.tone : "border-navy-100 text-navy-400 hover:bg-navy-50"
                }`}
              >
                <Icon size={13} />
                {t.label}
              </button>
            );
          })}
        </div>

        {entryType === "TRAVEL" && (
          <div className="flex items-center gap-2 text-xs bg-teal-50 border border-teal-100 rounded-lg px-3 py-2 text-teal-700 w-fit">
            <Info size={13} className="shrink-0" />
            {rateEditing ? (
              <>
                <span>₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  autoFocus
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="w-20 rounded border border-teal-200 px-1.5 py-0.5 text-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-400"
                />
                <span>/ km</span>
                <button
                  type="button"
                  onClick={handleSaveRate}
                  disabled={rateSaving}
                  className="p-1 rounded hover:bg-teal-100 disabled:opacity-50"
                  aria-label="Save rate"
                >
                  <Check size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setRateEditing(false)}
                  className="p-1 rounded hover:bg-teal-100"
                  aria-label="Cancel"
                >
                  <X size={13} />
                </button>
              </>
            ) : (
              <>
                <span>
                  Current travel rate: <span className="font-semibold">₹{Number(travelRate ?? 0).toFixed(2)} / km</span>
                </span>
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setRateInput(String(travelRate ?? ""));
                      setRateEditing(true);
                    }}
                    className="p-1 rounded hover:bg-teal-100"
                    aria-label="Edit travel rate"
                    title="Edit travel rate"
                  >
                    <Pencil size={12} />
                  </button>
                )}
                <span className="text-teal-500">— changes only apply to trips logged from now on.</span>
              </>
            )}
          </div>
        )}

        {/* Add-entry form */}
        <form onSubmit={handleSubmit} className="border border-navy-100 rounded-xl p-3.5 space-y-3 bg-navy-50/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="lg:col-span-2">
              <label className="text-[11px] font-medium text-navy-400 mb-1 block">Person</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-navy-300" />
                  <input
                    value={personSearch}
                    onChange={(e) => setPersonSearch(e.target.value)}
                    placeholder="Search name / ID..."
                    className="w-full text-sm border border-navy-100 rounded-lg pl-8 pr-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              </div>
              <Select
                className="w-full mt-2"
                value={form.employeeId}
                onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
              >
                <option value="">Select person...</option>
                {peopleOptions.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.name} ({personIdLabel(e)})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-navy-400 mb-1 block">Date</label>
              <input
                type="date"
                value={form.date}
                max={todayStr()}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>

            {entryType === "TRAVEL" ? (
              <div>
                <label className="text-[11px] font-medium text-navy-400 mb-1 block">Distance (km)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.km}
                  onChange={(e) => setForm((f) => ({ ...f, km: e.target.value }))}
                  placeholder="0"
                  className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
                {previewAmount !== null && (
                  <p className="text-[11px] text-navy-300 mt-1">= ₹{previewAmount.toFixed(2)} at current rate</p>
                )}
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-medium text-navy-400 mb-1 block">{activeMeta.amountLabel} (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-navy-400 mb-1 block">Remarks (required)</label>
              <textarea
                value={form.remark}
                onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
                rows={2}
                placeholder={activeMeta.hint}
                className="w-full text-sm border border-navy-100 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-navy-400 mb-1 block">Supporting document (optional)</label>
              {form.document ? (
                <div className="flex items-center gap-2 text-xs bg-white border border-navy-100 rounded-lg px-3 py-2">
                  {form.document.mimeType.startsWith("image/") ? (
                    <ImageIcon size={14} className="text-navy-400 shrink-0" />
                  ) : (
                    <FileText size={14} className="text-navy-400 shrink-0" />
                  )}
                  <span className="truncate flex-1 text-navy-600">{form.document.name}</span>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, document: null }))}
                    className="text-navy-300 hover:text-red-500"
                    aria-label="Remove document"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 text-xs border border-dashed border-navy-200 rounded-lg px-3 py-2 text-navy-400 cursor-pointer hover:border-accent-400 hover:text-accent-600 bg-white">
                  <Paperclip size={13} />
                  Attach receipt / bill / photo (max 5MB)
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
                </label>
              )}
            </div>
          </div>

          {formError && <p className="text-xs text-red-600">{formError}</p>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-navy-700 text-white text-xs font-medium hover:bg-navy-800 disabled:opacity-60"
            >
              {submitting ? "Saving..." : `Add ${activeMeta.label} Entry`}
            </button>
          </div>
        </form>

        {/* History */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-navy-400 uppercase tracking-wide">
              {activeMeta.label} History — {personType === "PERMANENT" ? "Employees" : "Labour / Wages"}
            </p>
            <Select size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="SETTLED">Settled (in salary)</option>
            </Select>
          </div>

          <div className="border border-navy-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-50/70 text-navy-400 text-[11px] uppercase tracking-wide">
                  <th className="text-left px-4 py-2.5 font-medium">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium">Person</th>
                  <th className="text-left px-4 py-2.5 font-medium">Amount</th>
                  <th className="text-left px-4 py-2.5 font-medium">Remark</th>
                  <th className="text-left px-4 py-2.5 font-medium">Document</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium">Added By</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonTableRows rows={4} columns={8} />
                ) : historyPagination.pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        icon={activeMeta.icon}
                        title={`No ${activeMeta.label.toLowerCase()} entries yet.`}
                        description="Entries you add above will show up here."
                      />
                    </td>
                  </tr>
                ) : (
                  historyPagination.pageItems.map((entry) => (
                    <tr key={entry._id} className="border-t border-navy-50 hover:bg-navy-50/40">
                      <td className="px-4 py-2.5 text-navy-500 whitespace-nowrap">
                        {new Date(entry.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-2.5 text-navy-700">
                        <div className="font-medium">{entry.employee?.name || "—"}</div>
                        <div className="text-[11px] text-navy-300">{entry.employee ? personIdLabel(entry.employee) : ""}</div>
                      </td>
                      <td className="px-4 py-2.5 text-navy-700 font-medium whitespace-nowrap">
                        ₹{Number(entry.amount).toFixed(2)}
                        {entry.type === "TRAVEL" && entry.km ? (
                          <div className="text-[11px] font-normal text-navy-300">
                            {entry.km} km @ ₹{Number(entry.ratePerKm).toFixed(2)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-navy-500 max-w-[220px] truncate" title={entry.remark}>
                        {entry.remark}
                      </td>
                      <td className="px-4 py-2.5">
                        {entry.document?.url ? (
                          <a
                            href={entry.document.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-accent-600 hover:underline text-xs"
                          >
                            <Paperclip size={12} /> View
                          </a>
                        ) : (
                          <span className="text-navy-200 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                            entry.status === "SETTLED"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {entry.status === "SETTLED" ? "In salary" : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-navy-400 text-xs whitespace-nowrap">{entry.addedBy?.name || "—"}</td>
                      <td className="px-4 py-2.5 text-right">
                        {entry.status === "PENDING" && canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(entry._id)}
                            className="p-1.5 rounded-lg text-navy-300 hover:text-red-600 hover:bg-red-50"
                            aria-label="Delete entry"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination
              page={historyPagination.page}
              pageSize={historyPagination.pageSize}
              total={historyPagination.total}
              onPageChange={historyPagination.setPage}
              itemLabel="entries"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
