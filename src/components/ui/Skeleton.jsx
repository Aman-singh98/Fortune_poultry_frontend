/** A single pulsing bar. Compose these for bespoke skeletons. */
export function SkeletonBar({ className = "" }) {
  return <div className={`animate-pulse rounded bg-navy-100/70 ${className}`} />;
}

/** Skeleton rows for a <table><tbody>, matching a given column count. */
export function SkeletonTableRows({ rows = 5, columns = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-navy-50 last:border-0">
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <SkeletonBar className={`h-3.5 ${c === 0 ? "w-24" : "w-16"}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Skeleton grid matching the app's stat-card layout. */
export function SkeletonStatCards({ count = 4 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-navy-100 p-4 flex items-center gap-3">
          <SkeletonBar className="h-9 w-9 rounded-lg shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBar className="h-2.5 w-16" />
            <SkeletonBar className="h-4 w-10" />
          </div>
        </div>
      ))}
    </>
  );
}

/** Skeleton for a stack of browsable cards (used by list-style pages). */
export function SkeletonCards({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-navy-100 p-4 space-y-2">
          <SkeletonBar className="h-3.5 w-1/3" />
          <SkeletonBar className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
