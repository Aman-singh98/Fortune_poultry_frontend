// Simple segmented tab control, e.g. for switching a list between
// "Employee" and "Wages & Labour" employee types.
export default function Tabs({ tabs, value, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 bg-navy-50 border border-navy-100 rounded-lg p-1">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors " +
              (active
                ? "bg-white text-navy-700 shadow-sm"
                : "text-navy-400 hover:text-navy-600")
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
