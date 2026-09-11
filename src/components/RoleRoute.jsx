import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Restricts nested routes to a set of allowed roles, e.g. <RoleRoute allow={["SUPER_ADMIN"]} />
 * Must be used inside a <ProtectedRoute /> so `user` is already guaranteed to exist.
 */
export default function RoleRoute({ allow = [] }) {
  const { user } = useAuth();

  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
