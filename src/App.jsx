import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import RoleRoute from "./components/RoleRoute.jsx";
import DashboardLayout from "./components/DashboardLayout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Attendance from "./pages/Attendance.jsx";
import Employees from "./pages/Employees.jsx";
import WageMaster from "./pages/WageMaster.jsx";
import Salary from "./pages/Salary.jsx";
import Leave from "./pages/Leave.jsx";
import Holidays from "./pages/Holidays.jsx";
import ItemMaster from "./pages/ItemMaster.jsx";
import VendorMaster from "./pages/VendorMaster.jsx";
import PurchaseRequisitions from "./pages/PurchaseRequisitions.jsx";
import RfqQuotations from "./pages/RfqQuotations.jsx";
import QuotationComparison from "./pages/QuotationComparison.jsx";
import PurchaseOrders from "./pages/PurchaseOrders.jsx";
import GoodsReceipts from "./pages/GoodsReceipts.jsx";
import Bills from "./pages/Bills.jsx";
import Stock from "./pages/Stock.jsx";
import ItemIssueSlips from "./pages/ItemIssueSlips.jsx";
import GatePass from "./pages/GatePass.jsx";
import { STOCK_MODULE_ACCESS } from "./constants/roleAccess.js";

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

              {/* Stock, Purchase & Inventory module — each page sits behind
                  a RoleRoute using the shared access list in constants/roleAccess.js,
                  the same list Sidebar.jsx uses to decide what to show in nav. */}
              <Route element={<RoleRoute allow={STOCK_MODULE_ACCESS.ITEM_MASTER} />}>
                <Route path="/items" element={<ItemMaster />} />
              </Route>
              <Route element={<RoleRoute allow={STOCK_MODULE_ACCESS.VENDOR_MASTER} />}>
                <Route path="/vendors" element={<VendorMaster />} />
              </Route>
              <Route element={<RoleRoute allow={STOCK_MODULE_ACCESS.PURCHASE_REQUISITIONS} />}>
                <Route path="/purchase-requisitions" element={<PurchaseRequisitions />} />
              </Route>
              <Route element={<RoleRoute allow={STOCK_MODULE_ACCESS.RFQ_QUOTATIONS} />}>
                <Route path="/rfq-quotations" element={<RfqQuotations />} />
              </Route>
              <Route element={<RoleRoute allow={STOCK_MODULE_ACCESS.QUOTATION_COMPARISON} />}>
                <Route path="/quotation-comparison" element={<QuotationComparison />} />
              </Route>
              <Route element={<RoleRoute allow={STOCK_MODULE_ACCESS.PURCHASE_ORDERS} />}>
                <Route path="/purchase-orders" element={<PurchaseOrders />} />
              </Route>
              <Route element={<RoleRoute allow={STOCK_MODULE_ACCESS.GOODS_RECEIPTS} />}>
                <Route path="/goods-receipts" element={<GoodsReceipts />} />
              </Route>
              <Route element={<RoleRoute allow={STOCK_MODULE_ACCESS.BILLS} />}>
                <Route path="/bills" element={<Bills />} />
              </Route>
              <Route element={<RoleRoute allow={STOCK_MODULE_ACCESS.STOCK} />}>
                <Route path="/stock" element={<Stock />} />
              </Route>
              <Route element={<RoleRoute allow={STOCK_MODULE_ACCESS.ITEM_ISSUE_SLIPS} />}>
                <Route path="/item-issue-slips" element={<ItemIssueSlips />} />
              </Route>
              <Route element={<RoleRoute allow={STOCK_MODULE_ACCESS.GATE_PASS} />}>
                <Route path="/gate-pass" element={<GatePass />} />
              </Route>
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
