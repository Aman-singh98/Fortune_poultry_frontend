import EmployeeDirectory from "./EmployeeDirectory.jsx";

// Labour / Wages workers — a separate section from Employees, but the same
// attendance marking and salary calculation flows apply to both.
export default function LabourWages() {
  return (
    <EmployeeDirectory
      lockedType="WAGES"
      pageTitle="Labour / Wages"
      emptyLabel="Add your first labour record to start tracking site-wise attendance and wages."
    />
  );
}
