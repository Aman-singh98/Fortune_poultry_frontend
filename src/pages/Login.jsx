import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Egg, Loader2, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!authLoading && isAuthenticated) {
    const from = location.state?.from?.pathname || "/dashboard";
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-5 bg-navy-900">
      {/* Left panel — brand / signature element (egg-carton dot grid) */}
      <div className="hidden lg:flex lg:col-span-2 relative overflow-hidden bg-navy-900">
        <svg
          className="absolute inset-0 h-full w-full opacity-40"
          aria-hidden="true"
        >
          <defs>
            <pattern id="eggGrid" width="56" height="56" patternUnits="userSpaceOnUse">
              <ellipse cx="28" cy="30" rx="14" ry="17" fill="none" stroke="#2E75B6" strokeWidth="1.2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#eggGrid)" />
        </svg>
        <div className="relative z-10 flex flex-col justify-between p-12 text-navy-50 w-full">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-accent-500 flex items-center justify-center">
              <Egg size={20} className="text-white" />
            </div>
            <span className="font-semibold tracking-wide text-lg">Fortune Poultry</span>
          </div>

          <div>
            <h1 className="text-4xl font-semibold leading-tight mb-4">
              Every site,<br />one clear picture.
            </h1>
            <p className="text-navy-100/80 max-w-sm text-sm leading-relaxed">
              Attendance, wages, leave, and holidays across all four sites —
              tracked daily, approved centrally, and audit-ready.
            </p>
          </div>

          <p className="text-xs text-navy-100/50">
            Fortune Poultry Management Software
          </p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="col-span-1 lg:col-span-3 flex items-center justify-center bg-[#f4f6fb] p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="h-9 w-9 rounded-lg bg-accent-500 flex items-center justify-center">
              <Egg size={20} className="text-white" />
            </div>
            <span className="font-semibold tracking-wide text-lg text-navy-700">
              Fortune Poultry
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-navy-100 p-8">
            <h2 className="text-xl font-semibold text-navy-700 mb-1">Sign in</h2>
            <p className="text-sm text-navy-500/80 mb-6">
              Use your registered email and password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-navy-700 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-navy-100 px-3.5 py-2.5 text-sm text-navy-900 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  placeholder="you@fortunepoultry.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-navy-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-navy-100 pl-3.5 pr-10 py-2.5 text-sm text-navy-900 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-300 hover:text-navy-500"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium py-2.5 transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-navy-300 mt-6">
            Trouble signing in? Contact your Super Admin.
          </p>
        </div>
      </div>
    </div>
  );
}
