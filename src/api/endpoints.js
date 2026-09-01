import api from "./axios.js";

// --- Sites ---
export const getSites = () => api.get("/sites");
export const createSite = (payload) => api.post("/sites", payload);
export const updateSite = (id, payload) => api.put(`/sites/${id}`, payload);

// --- Users (lightweight directory — e.g. Gate Pass "Approved By" picker) ---
export const getUsers = (params = {}) => api.get("/users", { params });

// --- Employees ---
export const getEmployees = (params = {}) => api.get("/employees", { params });
export const getEmployee = (id) => api.get(`/employees/${id}`);
export const createEmployee = (payload) => api.post("/employees", payload);
export const updateEmployee = (id, payload) => api.put(`/employees/${id}`, payload);
export const updateEmployeeStatus = (id, isActive) => api.patch(`/employees/${id}/status`, { isActive });
export const deleteEmployee = (id) => api.delete(`/employees/${id}`);

// --- Wage Masters ---
export const getWageMasters = () => api.get("/wage-masters");
export const createWageMaster = (payload) => api.post("/wage-masters", payload);
export const updateWageMaster = (id, payload) => api.put(`/wage-masters/${id}`, payload);
export const deleteWageMaster = (id) => api.delete(`/wage-masters/${id}`);
export const manualOverrideWageMaster = (id, payload) =>
  api.patch(`/wage-masters/${id}/manual-override`, payload);
export const applyYearlyIncrement = (id) => api.patch(`/wage-masters/${id}/apply-increment`);

// --- Attendance ---
export const getAttendanceSummary = (params = {}) => api.get("/attendance/summary", { params });
export const getAttendance = (params = {}) => api.get("/attendance", { params });
export const markAttendance = (payload) => api.post("/attendance/mark", payload);
export const markAllPresent = (payload) => api.post("/attendance/mark-all-present", payload);

// --- Salaries ---
export const getSalaries = (params = {}) => api.get("/salaries", { params });
export const generateSalary = (payload) => api.post("/salaries/generate", payload);
export const addSalaryDeduction = (id, payload) => api.post(`/salaries/${id}/deduction`, payload);

// --- Leave ---
export const getLeaves = (params = {}) => api.get("/leaves", { params });
export const createLeave = (payload) => api.post("/leaves", payload);
export const decideLeave = (id, payload) => api.patch(`/leaves/${id}/decision`, payload);

// --- Holidays ---
export const getHolidays = (params = {}) => api.get("/holidays", { params });
export const proposeHoliday = (payload) => api.post("/holidays", payload);
export const decideHoliday = (id, payload) => api.patch(`/holidays/${id}/decision`, payload);

// --- Items ---
export const getItems = (params = {}) => api.get("/items", { params });
export const getItem = (id) => api.get(`/items/${id}`);
export const createItem = (payload) => api.post("/items", payload);
export const updateItem = (id, payload) => api.put(`/items/${id}`, payload);

// --- Vendors ---
export const getVendors = (params = {}) => api.get("/vendors", { params });
export const getVendor = (id) => api.get(`/vendors/${id}`);
export const createVendor = (payload) => api.post("/vendors", payload);
export const updateVendor = (id, payload) => api.put(`/vendors/${id}`, payload);
export const toggleVendorActive = (id) => api.patch(`/vendors/${id}/toggle-active`);

// --- Item Requirements ---
export const getItemRequirements = (params = {}) => api.get("/item-requirements", { params });
export const getItemRequirement = (id) => api.get(`/item-requirements/${id}`);
export const createItemRequirement = (payload) => api.post("/item-requirements", payload);
export const processItemRequirement = (id, payload = {}) =>
  api.post(`/item-requirements/${id}/process`, payload);

// --- Purchase Requisitions ---
export const getPurchaseRequisitions = (params = {}) => api.get("/purchase-requisitions", { params });
export const getPurchaseRequisition = (id) => api.get(`/purchase-requisitions/${id}`);
export const createPurchaseRequisition = (payload) => api.post("/purchase-requisitions", payload);
export const decidePurchaseRequisition = (id, payload) =>
  api.patch(`/purchase-requisitions/${id}/decision`, payload);

// --- RFQs ---
export const getRfqs = (params = {}) => api.get("/rfqs", { params });
export const getRfq = (id) => api.get(`/rfqs/${id}`);
export const createRfq = (payload) => api.post("/rfqs", payload);
export const closeRfq = (id) => api.patch(`/rfqs/${id}/close`);

// --- Quotations ---
export const getQuotations = (params = {}) => api.get("/quotations", { params });
export const getQuotation = (id) => api.get(`/quotations/${id}`);
export const createQuotation = (payload) => api.post("/quotations", payload);
export const compareQuotations = (rfqId, params = {}) =>
  api.get(`/quotations/comparison/${rfqId}`, { params });
export const decideQuotation = (id, payload) => api.patch(`/quotations/${id}/decision`, payload);

// --- Purchase Orders ---
export const getPurchaseOrders = (params = {}) => api.get("/purchase-orders", { params });
export const getPurchaseOrder = (id) => api.get(`/purchase-orders/${id}`);
export const createPurchaseOrder = (payload) => api.post("/purchase-orders", payload);
export const closePurchaseOrder = (id) => api.patch(`/purchase-orders/${id}/close`);

// --- Goods Receipts ---
export const getGoodsReceipts = (params = {}) => api.get("/goods-receipts", { params });
export const getGoodsReceipt = (id) => api.get(`/goods-receipts/${id}`);
export const createGoodsReceipt = (payload) => api.post("/goods-receipts", payload);
export const verifyGoodsReceipt = (id, payload) => api.patch(`/goods-receipts/${id}/verify`, payload);

// --- Bills ---
export const getBills = (params = {}) => api.get("/bills", { params });
export const getBill = (id) => api.get(`/bills/${id}`);
export const createBill = (payload) => api.post("/bills", payload);
export const matchBill = (id) => api.patch(`/bills/${id}/match`);

// --- Item Issue Slips ---
export const getItemIssueSlips = (params = {}) => api.get("/item-issues", { params });
export const getItemIssueSlip = (id) => api.get(`/item-issues/${id}`);
export const createItemIssueSlip = (payload) => api.post("/item-issues", payload);

// --- Stock ---
export const getStock = (params = {}) => api.get("/stock", { params });
export const getLowStock = (params = {}) => api.get("/stock/low", { params });

// --- Gate Passes ---
export const getGatePasses = (params = {}) => api.get("/gate-passes", { params });
export const getGatePass = (id) => api.get(`/gate-passes/${id}`);
export const createGatePass = (payload) => api.post("/gate-passes", payload);
export const updateGatePassReturn = (id, payload) => api.patch(`/gate-passes/${id}/return`, payload);
