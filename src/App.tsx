import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleRoute from "./components/auth/RoleRoute";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import Leaves from "./pages/Leaves";
import LeavePolicy from "./pages/LeavePolicy";
import LeaveRequests from "./pages/LeaveRequests";
import LeaveAllotment from "./pages/LeaveAllotment";
import LeaveAllotmentHistory from "./pages/LeaveAllotmentHistory";
import ApplyLeave from "./pages/ApplyLeave";
import LeaveBalance from "./pages/LeaveBalance";
import TrackLeaveRequest from "./pages/TrackLeaveRequest";
import Employees from "./pages/Employees";
import Profile from "./pages/Profile";
import OrganizationSettings from "./pages/OrganizationSettings";
import Settings from "./pages/Settings";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import AddEmployeeStepper from "./pages/AddEmployeeStepper";
import HR from "./pages/HR";
import Regularization from "./pages/Regularization";
import SubmitRegularization from "./pages/SubmitRegularization";
import Payroll from "./pages/Payroll";
import SalarySlips from "./pages/SalarySlips";  
import Reports from "./pages/Reports";
import EmployeesReport from "./pages/EmployeesReport";
import LeaveRequestsReport from "./pages/LeaveRequestsReport";
import PayrollReport from "./pages/PayrollReport";
import AttendanceReport from "./pages/AttendanceReport";
import CreateOrganization from "./pages/CreateOrganization";
import OrganizationDetails from "./pages/OrganizationDetails";
import EmployeeAttendanceDetail from "./pages/EmployeeAttendanceDetail";

// Layout
import MainLayout from "./components/layout/MainLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <SidebarProvider>
                  <MainLayout>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route
                        path="/employees"
                        element={
                          <RoleRoute allowedRoles={["companyAdmin","hr"]} redirectTo="/dashboard">
                            <Employees />
                          </RoleRoute>
                        }
                      />
                      <Route path="/add-employee" element={<AddEmployeeStepper />} />
                      {/* SuperAdmin-only routes */}
                      <Route
                        path="/hr"
                        element={
                          <RoleRoute allowedRoles={["superAdmin"]} redirectTo="/dashboard">
                            <HR />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/hr/:id"
                        element={
                          <RoleRoute allowedRoles={["superAdmin"]} redirectTo="/dashboard">
                            <HR />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/admin"
                        element={
                          <RoleRoute allowedRoles={["superAdmin"]} redirectTo="/dashboard">
                            <AdminPanel />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/regularization"
                        element={
                          <RoleRoute allowedRoles={["companyAdmin","hr","employee"]} redirectTo="/dashboard">
                            <Regularization />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/regularization/submit"
                        element={
                          <RoleRoute allowedRoles={["companyAdmin","hr","employee"]} redirectTo="/dashboard">
                            <SubmitRegularization />
                          </RoleRoute>
                        }
                      />
                      <Route path="/organizations/:id" element={<OrganizationDetails />} />
                      {/* CompanyAdmin-only routes */}
                      <Route
                        path="/payroll"
                        element={
                          <RoleRoute allowedRoles={["companyAdmin","hr","employee"]} redirectTo="/dashboard">
                            <Payroll />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/salary-slips"
                        element={
                          <RoleRoute allowedRoles={["companyAdmin","hr","employee"]} redirectTo="/dashboard">
                            <SalarySlips />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/attendance"
                        element={
                          <RoleRoute allowedRoles={["companyAdmin","hr","employee"]} redirectTo="/dashboard">
                            <Attendance />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/attendance/employee/:id"
                        element={
                          <RoleRoute allowedRoles={["companyAdmin","hr"]} redirectTo="/dashboard">
                            <EmployeeAttendanceDetail />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/apply-leave"
                        element={
                          <RoleRoute allowedRoles={["companyAdmin","hr","employee"]} redirectTo="/dashboard">
                            <ApplyLeave />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/leaves"
                        element={
                          <RoleRoute allowedRoles={["companyAdmin","hr"]} redirectTo="/dashboard">
                            <Leaves />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/leaves/policy"
                        element={
                          <RoleRoute allowedRoles={["companyAdmin","hr","employee"]} redirectTo="/dashboard">
                            <LeavePolicy />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/leaves/balance"
                        element={
                          <RoleRoute allowedRoles={["companyAdmin","hr","employee"]} redirectTo="/dashboard">
                            <LeaveBalance />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/leaves/track"
                        element={
                          <RoleRoute allowedRoles={["companyAdmin","hr","employee"]} redirectTo="/dashboard">
                            <TrackLeaveRequest />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/leaves/requests"
                        element={
                          <RoleRoute allowedRoles={["companyAdmin","hr"]} redirectTo="/dashboard">
                            <LeaveRequests />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/leaves/allotment"
                        element={
                          <RoleRoute allowedRoles={["companyAdmin","hr"]} redirectTo="/dashboard">
                            <LeaveAllotment />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/leaves/allotment/history/:employeeId"
                        element={
                          <RoleRoute allowedRoles={["companyAdmin","hr"]} redirectTo="/dashboard">
                            <LeaveAllotmentHistory />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/reports/employees"
                        element={
                          <RoleRoute allowedRoles={["companyAdmin","hr"]} redirectTo="/dashboard">
                            <EmployeesReport />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/reports/leave-requests"
                        element={
                          <RoleRoute allowedRoles={["companyAdmin","hr"]} redirectTo="/dashboard">
                            <LeaveRequestsReport />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/reports/payroll"
                        element={
                          <RoleRoute allowedRoles={["companyAdmin","hr"]} redirectTo="/dashboard">
                            <PayrollReport />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/reports/attendance"
                        element={
                          <RoleRoute allowedRoles={["companyAdmin","hr"]} redirectTo="/dashboard">
                            <AttendanceReport />
                          </RoleRoute>
                        }
                      />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/organization-settings" element={<OrganizationSettings />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route
                        path="/create-organization"
                        element={
                          <RoleRoute allowedRoles={["superAdmin"]} redirectTo="/dashboard">
                            <CreateOrganization />
                          </RoleRoute>
                        }
                      />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </MainLayout>
                </SidebarProvider>
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;