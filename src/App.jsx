import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import DashboardLayout from "./components/DashboardLayout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Attendance from "./pages/Attendance.jsx";
import Employees from "./pages/Employees.jsx";
import WageMaster from "./pages/WageMaster.jsx";
import Salary from "./pages/Salary.jsx";
import Leave from "./pages/Leave.jsx";
import Holidays from "./pages/Holidays.jsx";

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/wage-master" element={<WageMaster />} />
              <Route path="/salary" element={<Salary />} />
              <Route path="/leave" element={<Leave />} />
              <Route path="/holidays" element={<Holidays />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
