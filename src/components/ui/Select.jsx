import { ChevronDown } from "lucide-react";

/**
 * Styled wrapper around a native <select>, used everywhere in the app so every
 * dropdown looks and behaves the same: custom arrow, consistent border/radius,
 * a hover state, and a visible focus ring.
 *
 * Usage is a drop-in replacement for <select>:
 *   <Select value={x} onChange={...}>{options}</Select>
 *
 * - `className` sizes/positions the control itself (e.g. "w-full", "w-40",
 *   "flex-1"). Leave it empty for a select that shrinks to fit its content,
 *   same as a native <select>.
 * - `size="sm"` gives the compact style used in dense toolbars/table cells.
 * - `selectClassName` is for one-off look overrides on the <select> itself
 *   (e.g. a status badge's colour), applied after the base styles.
 */
export default function Select({
  className = "",
  selectClassName = "",
  size = "md",
  disabled = false,
  children,
  ...props
}) {
  const hasWidthClass = /(^|\s)(w-|flex-)/.test(className);
  const sizeClasses =
    size === "sm" ? "text-xs py-1.5 pl-2.5 pr-7" : "text-sm py-2 pl-3 pr-8";
  // If the caller supplies its own colours (e.g. a status badge), don't also
  // apply our default navy border/bg/text — two colour utilities of equal
  // specificity have an unpredictable winner, so we simply don't emit both.
  const hasCustomColors = /(border-|bg-|text-)/.test(selectClassName);
  const colorClasses = hasCustomColors
    ? ""
    : "border-navy-100 bg-white text-navy-700 hover:border-navy-300";

  return (
    <div className={hasWidthClass ? `relative ${className}` : `relative inline-block ${className}`}>
      <select
        disabled={disabled}
        {...props}
        className={`${hasWidthClass ? "w-full" : ""} appearance-none rounded-lg border ${sizeClasses} ${colorClasses} focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-navy-100 cursor-pointer ${selectClassName}`}
      >
        {children}
      </select>
      <ChevronDown
        size={size === "sm" ? 12 : 14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-navy-400"
      />
    </div>
  );
}
