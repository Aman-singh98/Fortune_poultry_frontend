import EmployeeDirectory from "./EmployeeDirectory.jsx";

// Permanent staff only. Labour / Wages workers have their own section — see
// pages/LabourWages.jsx — even though both share attendance & salary features.
export default function Employees() {
  return (
    <EmployeeDirectory
      lockedType="PERMANENT"
      pageTitle="Employees"
      emptyLabel="Add your first employee to start tracking attendance and salary."
    />
  );
}
