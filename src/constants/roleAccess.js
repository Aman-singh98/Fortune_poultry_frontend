/**
 * Canonical role list for the app.
 *
 * Backend source of truth: backend/src/models/User.js role enum.
 * AuthContext.jsx / RoleRoute.jsx don't hardcode a role list themselves —
 * RoleRoute takes an `allow` array per-route — so this file is that list,
 * kept in one place so App.jsx and Sidebar.jsx never drift apart.
 */
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGEMENT: "MANAGEMENT",
  PURCHASE_MANAGER: "PURCHASE_MANAGER",
  ACCOUNTS: "ACCOUNTS",
  STORE_KEEPER: "STORE_KEEPER",
};

export const ALL_ROLES = Object.values(ROLES);

/**
 * Who can open each Stock, Purchase & Inventory page.
 * SUPER_ADMIN is included everywhere, matching how it already has
 * unrestricted access across the HR module pages.
 *
 * This is route/nav-level access only (can the page open at all).
 * Field- and action-level rules (e.g. only Management sees the
 * approve/reject buttons on Purchase Requisitions) still live inside
 * each page component, the same way Holidays.jsx / Salary.jsx already
 * do with `isSuperAdmin`.
 */
export const STOCK_MODULE_ACCESS = {
  ITEM_MASTER: [ROLES.SUPER_ADMIN, ROLES.MANAGEMENT, ROLES.PURCHASE_MANAGER, ROLES.ACCOUNTS, ROLES.STORE_KEEPER, ROLES.ADMIN],
  VENDOR_MASTER: [ROLES.SUPER_ADMIN, ROLES.MANAGEMENT, ROLES.PURCHASE_MANAGER, ROLES.ACCOUNTS, ROLES.STORE_KEEPER, ROLES.ADMIN],
  PURCHASE_REQUISITIONS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGEMENT, ROLES.PURCHASE_MANAGER],
  RFQ_QUOTATIONS: [ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER],
  QUOTATION_COMPARISON: [ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER, ROLES.MANAGEMENT],
  PURCHASE_ORDERS: [ROLES.SUPER_ADMIN, ROLES.ACCOUNTS, ROLES.PURCHASE_MANAGER],
  GOODS_RECEIPTS: [ROLES.SUPER_ADMIN, ROLES.STORE_KEEPER, ROLES.ACCOUNTS],
  BILLS: [ROLES.SUPER_ADMIN, ROLES.ACCOUNTS],
  STOCK: [ROLES.SUPER_ADMIN, ROLES.MANAGEMENT, ROLES.PURCHASE_MANAGER, ROLES.ACCOUNTS, ROLES.STORE_KEEPER, ROLES.ADMIN],
  ITEM_ISSUE_SLIPS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  GATE_PASS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STORE_KEEPER],
};
