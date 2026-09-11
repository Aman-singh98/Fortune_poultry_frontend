/**
 * Centered icon + message for empty lists/tables.
 * Render inside a <td colSpan={n}> for tables, or standalone for card lists.
 */
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-1.5 py-8 px-4">
      {Icon && (
        <div className="h-10 w-10 rounded-full bg-navy-50 flex items-center justify-center mb-1">
          <Icon size={18} className="text-navy-300" />
        </div>
      )}
      <p className="text-sm font-medium text-navy-500">{title}</p>
      {description && <p className="text-xs text-navy-300 max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
