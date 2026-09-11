import { Hammer } from "lucide-react";

/**
 * Temporary stand-in for Stock, Purchase & Inventory pages.
 * The route, role-guarding and nav entry for each page are already wired
 * up (Task 3.2) — this placeholder just holds the spot until Task 3.3
 * builds the real page.
 */
export default function PlaceholderPage({ title, note }) {
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-navy-700">{title}</h1>
      <div className="bg-white rounded-xl border border-navy-100 p-10 flex flex-col items-center text-center gap-3">
        <div className="h-10 w-10 rounded-full bg-navy-50 flex items-center justify-center text-navy-300">
          <Hammer size={18} />
        </div>
        <p className="text-sm font-medium text-navy-700">This page is coming soon.</p>
        <p className="text-sm text-navy-400 max-w-md">
          {note || "The route, permissions and navigation for this page are ready — the page itself is built in a later task."}
        </p>
      </div>
    </div>
  );
}
