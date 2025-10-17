import API from "./auth";

export const getDashboardStats = async () => {
  const res = await API.get("/dashboard");
  return res.data;
};

// Fetch employee-specific dashboard data
export const getEmployeeDashboard = async (employeeId: string) => {
  const res = await API.get(`/dashboard/employee/${employeeId}`);
  return res.data as {
    attendance: { totalDays: number; totalAttendance: number; present: number; absent: number };
    leaveBalance: { total: number; casual: number; earned: number; medical: number };
    leavePolicy: { activePolicyCount: number; policies: Array<{ name: string; leaveTypes: Array<{ type: string; allocation: number }> }> };
    payroll: { netSalary: number; paymentDate: string | null };
    monthStart: string;
    monthEnd: string;
  };
};
