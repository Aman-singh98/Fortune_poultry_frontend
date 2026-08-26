import api from "./axios.js";

// --- Sites ---
export const getSites = () => api.get("/sites");
export const createSite = (payload) => api.post("/sites", payload);
export const updateSite = (id, payload) => api.put(`/sites/${id}`, payload);

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
