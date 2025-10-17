import { useEffect, useState, useContext, useRef } from "react";
import { getOrganizations } from "@/api/organizations";
import { getDashboardStats } from "@/api/dashboard";
import { getHolidayCalendar, saveHolidayCalendar } from "@/api/holidayCalendar";
import { uploadFile } from "@/api/uploadFile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OrgSearchContext } from "@/components/layout/MainLayout";
import { Plus, Building, Users, X, LogIn, LogOut, ClipboardList, Calculator, FileText } from "lucide-react";
import { getEmployeeById } from "@/api/employees";
import { getAttendance, clockInEmployee, clockOutEmployee } from "@/api/attendance";
import { format } from "date-fns";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import EmployeeList from "@/components/employees/EmployeeList";
import { toast } from "@/hooks/use-toast";
const Dashboard = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Dashboard stats state for companyAdmin
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const { search } = useContext(OrgSearchContext);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [calendarData, setCalendarData] = useState<{calendarFile?: string; calendarFileName?: string} | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [employee, setEmployee] = useState<any | null>(null);
  const [attendanceToday, setAttendanceToday] = useState<any | null>(null);
  const [clocking, setClocking] = useState<{in:boolean; out:boolean}>({in:false, out:false});
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);

  useEffect(() => {
    // Show access denied message when redirected from restricted routes
    const state = location.state as any;
    if (state?.accessDenied && state?.from) {
      toast({
        title: "Access denied",
        description: `You don’t have access to ${state.from}. Redirected to dashboard.`,
        variant: "destructive",
      });
    }
  }, [location.state]);

  useEffect(() => {
    if (user?.role === 'superAdmin') {
      const fetchOrganizations = async () => {
        try {
          setLoading(true);
          const data = await getOrganizations();
          setOrganizations(Array.isArray(data) ? data : (Array.isArray(data?.organizations) ? data.organizations : []));
        } catch (err) {
          setError("Failed to load organizations");
        } finally {
          setLoading(false);
        }
      };
      fetchOrganizations();
    }
  }, [user?.role]);

  // Company Admin & HR Dashboard UI (matches provided image)
  useEffect(() => {
    if (user?.role === 'companyAdmin' || user?.role === 'hr') {
      setDashboardLoading(true);
      setDashboardError("");
      getDashboardStats()
        .then((data) => setDashboardStats(data))
        .catch(() => setDashboardError("Failed to load dashboard stats"))
        .finally(() => setDashboardLoading(false));
      // Fetch holiday calendar with organizationId
      setCalendarLoading(true);
      if (user?.organizationId) {
        getHolidayCalendar(user.organizationId)
          .then((response) => {
            if (response?.data) {
              setCalendarData(response.data);
            } else {
              setCalendarData(null);
            }
          })
          .catch((error) => {
            console.error("Error fetching holiday calendar:", error);
            setCalendarData(null);
          })
          .finally(() => setCalendarLoading(false));
      } else {
        console.error("Missing organizationId for holiday calendar");
        setCalendarLoading(false);
      }
    }
  }, [user?.role, user?.organizationId]);

  // Fetch employee profile and today's attendance for banner
  useEffect(() => {
    if (user?.role === 'companyAdmin' || user?.role === 'hr') {
      const id = user?._id || user?.id;
      if (!id) return;
      // Employee details
      getEmployeeById(id)
        .then((data) => setEmployee(data))
        .catch(() => setEmployee(null));
      // Today's attendance
      const today = format(new Date(), 'yyyy-MM-dd');
      getAttendance({ page: 1, limit: 1, startDate: today, endDate: today, employeeId: id })
        .then((res: any) => {
          const item = Array.isArray(res?.items) ? res.items[0] : null;
          setAttendanceToday(item);
        })
        .catch(() => setAttendanceToday(null));
    }
  }, [user?.role, user?._id, user?.id]);

  const getGeolocation = (): Promise<{lat:number; lng:number}> => {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) {
        resolve({ lat: 12.9716, lng: 77.5946 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: 12.9716, lng: 77.5946 }),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  const handleClockIn = async () => {
    if (clocking.in) return;
    const id = user?._id || user?.id;
    if (!id) return;
    setClocking((s) => ({ ...s, in: true }));
    try {
      const { lat, lng } = await getGeolocation();
      const res = await clockInEmployee(id, { latitude: lat, longitude: lng, markedBy: 'user' });
      setAttendanceToday(res?.attendance || attendanceToday);
      toast({ title: 'Clock in recorded', description: res?.message || 'You have clocked in.' });
    } catch (err: any) {
      toast({ title: 'Clock in failed', description: err?.response?.data?.message || err?.message || 'Please try again.' });
    } finally {
      setClocking((s) => ({ ...s, in: false }));
    }
  };

  const handleClockOut = async () => {
    if (clocking.out) return;
    const id = user?._id || user?.id;
    if (!id) return;
    setClocking((s) => ({ ...s, out: true }));
    try {
      const { lat, lng } = await getGeolocation();
      const res = await clockOutEmployee(id, { latitude: lat, longitude: lng });
      setAttendanceToday(res?.attendance || attendanceToday);
      toast({ title: 'Clock out recorded', description: res?.message || 'You have clocked out.' });
    } catch (err: any) {
      toast({ title: 'Clock out failed', description: err?.response?.data?.message || err?.message || 'Please try again.' });
    } finally {
      setClocking((s) => ({ ...s, out: false }));
    }
  };

  const handleCalendarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user?.organizationId) {
      console.log('No file selected or missing organizationId');
      return;
    }
    setCalendarLoading(true);
    try {
      const file = e.target.files[0];
      console.log('Selected file:', file);
      // Reset the input so the same file can be uploaded again
      if (fileInputRef.current) fileInputRef.current.value = "";
      console.log('Calling uploadFile API...');
      const url = await uploadFile(file);
      console.log('uploadFile API returned URL:', url);
      // Send the full image URL as calendarFileName
      const saveRes = await saveHolidayCalendar(user.organizationId, url);
      console.log('saveHolidayCalendar response:', saveRes);
      setCalendarUrl(url);
    } catch (err) {
      console.error('Calendar upload error:', err);
      alert('Upload failed: ' + (err?.message || err));
    } finally {
      setCalendarLoading(false);
    }
  };

  if (user?.role === 'companyAdmin' || user?.role === 'hr') {
    return (
      <div
        className="min-h-screen py-6 px-2 md:px-8"
        style={{
          background:
            'linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)'
        }}
      >
        {/* Image Modal */}
        {showImageModal && calendarData?.calendarFile && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="relative max-w-md w-full bg-white rounded-lg overflow-hidden shadow-xl">
              <div className="p-4 max-h-[70vh] overflow-y-auto">
                <img 
                  src={calendarData.calendarFile} 
                  alt="Holiday Calendar" 
                  className="w-full" 
                />
              </div>
              <button 
                onClick={() => setShowImageModal(false)}
                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-lg"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        )}
        
        {dashboardLoading && (
          <div className="max-w-5xl mx-auto text-center py-8">
            <span className="text-lg text-gray-600">Loading dashboard...</span>
          </div>
        )}
        {dashboardError && (
          <div className="max-w-5xl mx-auto text-center py-8 text-red-500">{dashboardError}</div>
        )}
        {/* Header Card */}
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl bg-[#23292F] flex flex-col md:flex-row items-stretch justify-between px-4 sm:px-5 md:px-0 md:pl-8 md:pr-0 pt-6 pb-0 mb-8 shadow-lg">
            {/* Left: Greeting + Profile */}
            <div className="w-full md:w-auto mb-4 md:mb-0">
              <div className="text-white text-base font-semibold mb-2">Hello <span role="img" aria-label="waving hand">👋</span></div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden">
                  {employee?.profilePhotoUrl ? (
                    <img src={employee.profilePhotoUrl} alt={(employee?.name) || `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim()} className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full block bg-gray-300" />
                  )}
                </div>
                <div>
                  <div className="text-lg font-semibold text-green-300">{(employee?.name) || `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || user?.name || '-'}</div>
                  <div className="text-sm text-white opacity-80">{employee?.designation || user?.designation || '—'}</div>
                </div>
              </div>
            </div>
            {/* Right: Buttons above summary box (aligned left edges) */}
            <div className="flex flex-col justify-between md:items-start w-full md:flex-1 md:min-h-[120px] items-stretch">
              <div className="md:self-end md:w-auto w-full h-full flex flex-col">
                <div className="mt-auto flex flex-col">
                  <div className="flex gap-2 md:gap-2 mb-3 sm:mb-4 md:mb-1">
                  <button
                    type="button"
                    onClick={handleClockIn}
                    disabled={clocking.in || !!attendanceToday?.clockIn}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition ${clocking.in ? 'opacity-60 cursor-not-allowed' : ''} ${attendanceToday?.clockIn ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                  >
                    <LogIn className="h-4 w-4" />
                    {attendanceToday?.clockIn ? 'Clocked in' : 'Clock in'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClockOut}
                    disabled={clocking.out || !attendanceToday?.clockIn || !!attendanceToday?.clockOut}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition ${clocking.out ? 'opacity-60 cursor-not-allowed' : ''} ${(attendanceToday?.clockOut || !attendanceToday?.clockIn) ? 'bg-gray-200 text-gray-500' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                  >
                    <LogOut className="h-4 w-4" />
                    {attendanceToday?.clockOut ? 'Clocked out' : 'Clock Out'}
                  </button>
                  </div>
                  <div className="bg-white rounded-t-lg rounded-b-none px-3 sm:px-4 py-2 w-full md:w-auto flex flex-col md:flex-row gap-4 items-start md:items-center shadow">
                   <div className="text-xs text-gray-500 text-left"><span className="font-semibold text-[#1C1C1E]">Date</span><br /><span className="text-base text-gray-800 font-normal">{format(new Date(), 'dd/MM/yyyy')}</span></div>
                   <div className="text-xs text-gray-500 text-left md:text-right"><span className="font-semibold text-[#1C1C1E]">Clockin</span><br /><span className="text-base text-gray-800 font-normal">{attendanceToday?.clockIn ? format(new Date(attendanceToday.clockIn), 'HH:mm:ss') : '-'}</span></div>
                   <div className="text-xs text-gray-500 text-left md:text-right"><span className="font-semibold text-[#1C1C1E]">Clockout</span><br /><span className="text-base text-gray-800 font-normal">{attendanceToday?.clockOut ? format(new Date(attendanceToday.clockOut), 'HH:mm:ss') : '-'}</span></div>
                   <div className="text-xs text-gray-500 text-left md:text-right"><span className="font-semibold text-[#1C1C1E]">Working hours</span><br /><span className="text-base text-gray-800 font-normal">{attendanceToday?.totalWorkingHours != null ? `${attendanceToday.totalWorkingHours}` : '-'}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Main Content */}
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6 items-stretch">
          {/* Left: Events (static for now) */}
          <div className="md:w-1/3 h-full">
            <div className="bg-white rounded-2xl shadow p-6 flex flex-col h-full">
              <div className="text-gray-500 text-sm mb-4 font-semibold">Today</div>
              <div className="w-full flex-1 flex flex-col items-center">
                {calendarLoading ? (
                  <div className="w-full flex justify-center items-center h-full"><span className="text-gray-400">Loading...</span></div>
                ) : calendarData?.calendarFile ? (
                  <>
                    <img 
                      src={calendarData.calendarFile} 
                      alt="Holiday Calendar" 
                      className="w-full h-full object-cover rounded border cursor-pointer" 
                      onClick={() => setShowImageModal(true)}
                    />
                  </>
                ) : (
                  <span className="text-gray-400 mb-2">No calendar uploaded</span>
                )}
              </div>
              <input
                id="calendar-upload-input"
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleCalendarUpload}
              />
              <button
                type="button"
                className="flex items-center gap-2 text-green-600 hover:text-green-800 text-xs font-semibold border border-green-200 rounded px-3 py-1 bg-green-50 mt-2"
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.click();
                }}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 16v-8M8 12h8" stroke="#3CC78F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="3" width="18" height="18" rx="4" stroke="#3CC78F" strokeWidth="1.5"/></svg>
                Upload Calendar
              </button>
            </div>
          </div>
          {/* Right: Cards */}  
          <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
            {/* Total Employees (full width) */}
            <div className="bg-white rounded-2xl border-[1.5px] border-[#2C373B]/30 shadow-none p-3 sm:p-4 sm:col-span-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full bg-[#4CDC9C26]"></div>
                    <div className="absolute inset-1 rounded-full bg-[#2C373B]"></div>
                    <div className="absolute inset-2 rounded-full bg-[#2C373B] flex items-center justify-center shadow-sm">
                      <Users className="h-6 w-6 text-[#FFBB31]" />
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-700 text-base font-semibold flex items-center gap-2">
                      <span>Total Employees</span>
                      <span className="text-3xl font-bold leading-none text-[#4CDC9C]">{dashboardStats?.employees?.total ?? '-'}</span>
                    </div>
                    <div className="flex gap-4 text-xs mt-2">
                      <span className="text-[#9E9E9E] font-medium">Active <span className="text-green-600 font-medium">{dashboardStats?.employees?.active ?? '-'}</span></span>
                      <span className="text-[#9E9E9E] font-medium">Inactive <span className="text-red-500 font-medium">{dashboardStats?.employees?.inactive ?? '-'}</span></span>
                    </div>
                  </div>
                </div>
                <button
                  className="w-full sm:w-auto bg-[#4CDC9C] text-[#2C373B] hover:bg-[#3fd190] rounded-lg px-4 py-2 text-sm font-medium transition"
                  onClick={() => navigate('/employees')}
                >
                  Manage Employees
                </button>
              </div>
            </div>
            {/* Total Leave Requests (full width) */}
            <div className="bg-white rounded-2xl border-[1.5px] border-[#2C373B]/30 shadow-none p-3 sm:p-4 sm:col-span-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full bg-[#4CDC9C26]"></div>
                    <div className="absolute inset-1 rounded-full bg-[#2C373B]"></div>
                    <div className="absolute inset-2 rounded-full bg-[#2C373B] flex items-center justify-center shadow-sm">
                      <ClipboardList className="h-6 w-6 text-[#FFBB31]" />
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-700 text-base font-semibold flex items-center gap-2">
                      <span>Total Leave requests</span>
                      <span className="text-3xl font-bold leading-none text-[#4CDC9C]">{dashboardStats?.leaves?.total ?? '-'}</span>
                    </div>
                    <div className="flex gap-4 text-xs mt-2">
                      <span className="text-[#9E9E9E] font-medium">Approved <span className="text-green-600 font-medium">{dashboardStats?.leaves?.approved ?? '-'}</span></span>
                      <span className="text-[#9E9E9E] font-medium">Declined <span className="text-red-500 font-medium">{dashboardStats?.leaves?.declined ?? '-'}</span></span>
                      <span className="text-[#9E9E9E] font-medium">Pending <span className="text-yellow-500 font-medium">{dashboardStats?.leaves?.pending ?? '-'}</span></span>
                    </div>
                  </div>
                </div>
                <button
                  className="w-full sm:w-auto bg-[#4CDC9C] text-[#2C373B] hover:bg-[#3fd190] rounded-lg px-4 py-2 text-sm font-medium transition"
                  onClick={() => navigate('/leaves/requests')}
                >
                  Manage leaves requests
                </button>
              </div>
            </div>
            {/* Leave Policy */}
            <div className="bg-white rounded-2xl border-[1.5px] border-[#2C373B]/30 shadow-none px-1 sm:px-2 pt-1 pb-1 flex flex-col h-[195px]">
              <div className="flex items-center gap-3 mb-1">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full bg-[#4CDC9C26]"></div>
                  <div className="absolute inset-1 rounded-full bg-[#2C373B]"></div>
                  <div className="absolute inset-2 rounded-full bg-[#2C373B] flex items-center justify-center shadow-sm">
                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" fill="none"/><path d="M8.5 10.5h7M8.5 13.5h4M12 7.5v9" stroke="#FFBB31" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
                <span className="text-gray-700 font-semibold text-base">Leave Policy</span>
              </div>
              <div className="flex items-end gap-2 mb-0">
                <span className="text-3xl font-bold leading-none text-[#4CDC9C]">{dashboardStats?.leavePolicies?.activePolicies ?? '-'}</span>
                <span className="text-base text-gray-700 font-medium mb-1">active policy</span>
              </div>
              <div className="flex gap-4 text-xs font-medium mb-0">
                <span className="text-gray-400">Maternity <span className="text-green-500 font-bold">{dashboardStats?.leavePolicies?.leaveTypesSummary?.maternity?.intervalValue ?? '-'}</span></span>
                <span className="text-gray-400">Earned <span className="text-yellow-500 font-bold">{dashboardStats?.leavePolicies?.leaveTypesSummary?.earned?.intervalValue ?? '-'}</span></span>
              </div>
              <button 
                className="w-full mt-auto mb-2 bg-[#4CDC9C] text-[#2C373B] hover:bg-[#3fd190] rounded-lg py-2 text-sm font-medium transition shadow-none"
                onClick={() => navigate('/leaves/policy')}
              >
                Manage Leave Policy
              </button>
            </div>
            {/* Payroll Processed */}
            <div className="bg-white rounded-2xl border-[1.5px] border-[#2C373B]/30 shadow-none px-1 sm:px-2 pt-1 pb-1 flex flex-col h-[195px]">
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full bg-[#4CDC9C26]"></div>
                    <div className="absolute inset-1 rounded-full bg-[#2C373B]"></div>
                    <div className="absolute inset-2 rounded-full bg-[#2C373B] flex items-center justify-center shadow-sm">
                      <Calculator className="h-6 w-6 text-[#FFBB31]" />
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-700 text-base font-semibold">Payroll Processed</div>
                    <div className="text-xs text-gray-400 -mt-1">this month</div>
                  </div>
                </div>
                <div>
                  <span className="text-3xl sm:text-4xl font-bold leading-none text-[#4CDC9C]">
                    {dashboardStats?.payroll?.processed ?? '-'}/{dashboardStats?.payroll?.totalEmployees ?? dashboardStats?.employees?.total ?? '-'}
                  </span>
                  <span className="text-sm text-gray-700 font-medium ml-2">employees</span>
                </div>
                <div className="text-xs mb-0">
                  <span className="text-[#9E9E9E] font-medium">Pending employees <span className="text-red-500 font-medium">{dashboardStats?.payroll?.pending ?? '-'}</span></span>
                </div>
              </div>
              <button 
                className="w-full mt-auto mb-2 bg-[#4CDC9C] text-[#2C373B] hover:bg-[#3fd190] rounded-lg py-2 text-sm font-medium transition"
                onClick={() => navigate('/payroll')}
              >
                Manage Payroll
              </button>
            </div>
            {/* Reports card removed */}
          </div>
        </div>
      </div>
    );
  }
  // Super Admin Dashboard UI (default)
  return (
    <div
      className="min-h-screen w-full overflow-x-hidden p-6"
      style={{
        background:
          "linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)",
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-black">Create and Manage all organizations in one place</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Create Organization Card - always first */}
        <Card
          className="hover:shadow-lg transition-shadow flex flex-col items-center p-0 border-2 border-dashed border-green-600 bg-green-50 cursor-pointer group min-h-[220px]"
          onClick={() => window.location.href = '/create-organization'}
        >
          <div className="flex-1 w-full flex flex-col items-center justify-center p-8">
            <Plus className="h-10 w-10 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-lg text-green-700 text-center mb-2">Create Organization</h3>
            <p className="text-green-800 text-center text-sm">Start a new organization</p>
          </div>
        </Card>
        {/* Organization Cards */}
        {loading ? (
          <div className="col-span-full flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : error ? (
          <div className="col-span-full text-center text-destructive p-4">{error}</div>
        ) : organizations.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center h-40 text-center">
            <Building className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Organizations Found</h3>
            <p className="text-muted-foreground mt-1">Create your first organization to get started</p>
          </div>
        ) : (
          organizations
            .filter(org => org.name?.toLowerCase().includes(search.toLowerCase()))
            .map((org, index) => (
              <Card key={org._id || index} className="hover:shadow-md transition-shadow flex flex-col items-center p-0">
                {org.logoUrl && (
                  <img src={org.logoUrl} alt={org.name} className="w-full h-32 object-cover rounded-t" />
                )}
                <div className="flex-1 w-full flex flex-col items-center p-4">
                  <h3 className="font-bold text-xl text-center mb-4 w-full">{org.name}</h3>
                  <Button className="w-full mt-auto bg-green-600 hover:bg-green-700 text-white" asChild>
                    <Link to={`/organizations/${org._id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </Card>
            ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;