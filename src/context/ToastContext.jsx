import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const STYLES = {
  success: "bg-white border-green-100 text-navy-700 [&_svg]:text-green-600",
  error: "bg-white border-red-100 text-navy-700 [&_svg]:text-red-600",
  info: "bg-white border-navy-100 text-navy-700 [&_svg]:text-accent-600",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, message, opts = {}) => {
      const id = ++idRef.current;
      const duration = opts.duration ?? (type === "error" ? 6000 : 4000);
      setToasts((prev) => [...prev, { id, type, message }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const toast = {
    success: (message, opts) => push("success", message, opts),
    error: (message, opts) => push("error", message, opts),
    info: (message, opts) => push("info", message, opts),
    dismiss,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 sm:w-80"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div
              key={t.id}
              role="alert"
              className={`flex items-start gap-2.5 rounded-xl border shadow-lg px-3.5 py-3 text-sm animate-[toast-in_0.18s_ease-out] ${STYLES[t.type] || STYLES.info}`}
            >
              <Icon size={18} className="shrink-0 mt-0.5" />
              <p className="flex-1 min-w-0 leading-snug">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 p-0.5 rounded-md text-navy-300 hover:text-navy-600 hover:bg-navy-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
