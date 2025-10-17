import { useEffect, useState, useRef } from "react";
import { getEmployeeDashboard } from "@/api/dashboard";
import { getHolidayCalendar, saveHolidayCalendar } from "@/api/holidayCalendar";
import { uploadFile } from "@/api/uploadFile";
import { Button } from "@/components/ui/button";
import { Users, X, LogIn, LogOut, ClipboardList, Calculator, FileText } from "lucide-react";
import { getEmployeeById } from "@/api/employees";
import { getAttendance, clockInEmployee, clockOutEmployee } from "@/api/attendance";
import { format } from "date-fns";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import { toast } from "@/hooks/use-toast";
const Dashboard = () => {
  // Employee-specific dashboard data state
  const [employeeDashboard, setEmployeeDashboard] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
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

 

  // Dashboard data (employee-specific) and holiday calendar for any authenticated user with organizationId
  useEffect(() => {
    setDashboardLoading(true);
    setDashboardError("");
    const id = user?._id || user?.id;
    if (id) {
      getEmployeeDashboard(id)
        .then((data) => setEmployeeDashboard(data))
        .catch(() => setDashboardError("Failed to load dashboard"))
        .finally(() => setDashboardLoading(false));
    } else {
      setDashboardLoading(false);
    }
    // Fetch holiday calendar with organizationId (if available)
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
  }, [user?.organizationId, user?._id, user?.id]);

  // Fetch employee profile and today's attendance for banner (any role)
  useEffect(() => {
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
  }, [user?._id, user?.id]);

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
      // Update local calendar preview state
      setCalendarData((prev) => ({ ...(prev || {}), calendarFile: url, calendarFileName: url }));
    } catch (err) {
      console.error('Calendar upload error:', err);
      alert('Upload failed: ' + (err?.message || err));
    } finally {
      setCalendarLoading(false);
    }
  };
  // Company Admin style Dashboard UI (shown to all roles)
  return (
      <div className="min-h-screen py-6 px-2 md:px-8" style={{ background: 'linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)' }}>
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
          <div className="rounded-2xl bg-[#23292F] flex flex-col md:flex-row items-center justify-between px-8 py-6 mb-8 shadow-lg">
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
            {/* Right: Clock icons + Metrics */}
            <div className="flex flex-col md:items-start w-full md:w-auto">
              <div className="flex gap-6 mb-3 self-start">
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
              <div className="bg-white rounded-lg px-6 py-3 w-full md:w-auto self-start flex flex-col md:flex-row gap-8 items-start md:items-center shadow mt-auto">
                <div className="text-xs text-gray-600 font-semibold text-left md:text-right space-y-2"><div>Today's Date</div><span className="text-[14px] text-gray-800 font-normal">{format(new Date(), 'dd/MM/yyyy')}</span></div>
                <div className="text-xs text-gray-600 font-semibold text-left md:text-right space-y-2"><div>Clockin</div><span className="text-[14px] text-gray-800 font-normal">{attendanceToday?.clockIn ? format(new Date(attendanceToday.clockIn), 'HH:mm:ss') : '-'}</span></div>
                <div className="text-xs text-gray-600 font-semibold text-left md:text-right space-y-2"><div>Clockout</div><span className="text-[14px] text-gray-800 font-normal">{attendanceToday?.clockOut ? format(new Date(attendanceToday.clockOut), 'HH:mm:ss') : '-'}</span></div>
                <div className="text-xs text-gray-600 font-semibold text-left md:text-right space-y-2"><div>Working hours</div><span className="text-[14px] text-gray-800 font-normal">{attendanceToday?.totalWorkingHours != null ? `${attendanceToday.totalWorkingHours}` : '-'}</span></div>
              </div>
            </div>
          </div>
        </div>
        {/* Main Content */}
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6 items-stretch px-3 sm:px-4">
          {/* Left: Events (static for now) */}
          <div className="w-full md:w-1/3 h-full mx-auto md:mx-0 self-stretch flex">
            <div className="bg-white rounded-2xl shadow p-6 flex flex-col h-full min-h-full w-full">
              <div className="text-gray-500 text-sm mb-4 font-semibold">Today</div>
              <div className="w-full flex-1 min-h-0 flex flex-col items-stretch">
                {calendarLoading ? (
                  <div className="w-full flex justify-center items-center h-full"><span className="text-gray-400">Loading...</span></div>
                ) : calendarData?.calendarFile ? (
                  <>
                    <img 
                      src={calendarData.calendarFile} 
                      alt="Holiday Calendar" 
                      className="w-full h-full object-contain rounded border cursor-pointer" 
                      onClick={() => setShowImageModal(true)}
                    />
                  </>
                ) : (
                  <span className="text-gray-400">No calendar uploaded</span>
                )}
              </div>
              {/* Upload Calendar input retained for future use; button removed as requested */}
              <input
                id="calendar-upload-input"
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleCalendarUpload}
              />
            </div>
          </div>
          {/* Right: Cards */}  
          <div className="w-full md:w-2/3 h-full self-stretch grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-4 items-start mx-auto md:mx-0">
            {/* Total Attendance (full width) */}
            <div className="bg-white rounded-2xl border-[1.5px] border-[#2C373B]/30 shadow-none px-3 pt-3 pb-3 sm:px-4 sm:pt-4 sm:pb-2 sm:col-span-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <span className="absolute inset-0 rounded-full bg-[#EAF9F2]" />
                    <span className="absolute top-2 left-2 w-8 h-8 rounded-full bg-[#2C373B] flex items-center justify-center">
                      <Users className="h-5 w-5 text-[#FFBB31]" />
                    </span>
                  </div>
                  <div>
                    <div className="text-gray-700 text-base font-semibold">Total Attendance</div>
                    <div className="text-xs text-gray-400 -mt-1">this month</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold leading-none text-[#4CDC9C]">{employeeDashboard?.attendance?.totalAttendance ?? '-'}</span>
                  <span className="text-gray-700 text-lg font-semibold">/{employeeDashboard?.attendance?.totalDays ?? '-'}</span>
                </div>
                <button
                  className="w-full sm:w-auto bg-[#4CDC9C] text-[#2C373B] hover:bg-[#3fd190] rounded-lg px-4 py-2 text-[14px] font-medium transition"
                  onClick={() => navigate('/attendance')}
                >
                  View Attendance
                </button>
              </div>
              <div className="flex gap-6 text-xs mt-2 sm:mt-1">
                <span className="text-[#9E9E9E] font-medium">Present <span className="text-green-600 font-medium">{employeeDashboard?.attendance?.present ?? '-'}</span></span>
                <span className="text-[#9E9E9E] font-medium">Absent <span className="text-red-500 font-medium">{employeeDashboard?.attendance?.absent ?? '-'}</span></span>
              </div>
            </div>
            {/* Leave Balance (full width) */}
            <div className="bg-white rounded-2xl border-[1.5px] border-[#2C373B]/30 shadow-none px-3 pt-3 pb-3 sm:px-4 sm:pt-4 sm:pb-2 sm:col-span-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <span className="absolute inset-0 rounded-full bg-[#EAF9F2]" />
                    <span className="absolute top-2 left-2 w-8 h-8 rounded-full bg-[#2C373B] flex items-center justify-center">
                      <ClipboardList className="h-5 w-5 text-[#FFBB31]" />
                    </span>
                  </div>
                  <div>
                    <div className="text-gray-700 text-base font-semibold">Leave Balance</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold leading-none text-[#4CDC9C]">{employeeDashboard?.leaveBalance?.total ?? '-'}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    className="bg-white border border-[#2C373B]/30 text-[#2C373B] rounded-lg px-3 py-2 text-[14px] font-medium transition hover:bg-gray-50"
                    onClick={() => navigate('/leaves/balance')}
                  >
                    View Balance
                  </button>
                  <button
                    className="bg-[#4CDC9C] text-[#2C373B] hover:bg-[#3fd190] rounded-lg px-3 py-2 text-[14px] font-medium transition"
                    onClick={() => navigate('/apply-leave')}
                  >
                    Apply Leave
                  </button>
                </div>
              </div>
              <div className="flex gap-6 text-xs mt-2">
                <span className="text-[#9E9E9E] font-medium">Casual <span className="text-green-600 font-medium">{employeeDashboard?.leaveBalance?.casual ?? '-'}</span></span>
                <span className="text-[#9E9E9E] font-medium">Earned <span className="text-yellow-500 font-medium">{employeeDashboard?.leaveBalance?.earned ?? '-'}</span></span>
                <span className="text-[#9E9E9E] font-medium">Medical <span className="text-red-500 font-medium">{employeeDashboard?.leaveBalance?.medical ?? '-'}</span></span>
              </div>
            </div>
            {/* Leave Policy */}
            <div className="bg-white rounded-2xl border-[1.5px] border-[#2C373B]/30 shadow-none px-3 pt-3 pb-3 sm:px-4 sm:pt-4 sm:pb-3 flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-2">
                <div className="relative w-12 h-12 flex-shrink-0">
                  <span className="absolute inset-0 rounded-full bg-[#EAF9F2]" />
                  <span className="absolute top-2 left-2 w-8 h-8 rounded-full bg-[#2C373B] flex items-center justify-center">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" fill="#FFBB31" fillOpacity="0.15"/><path d="M8.5 10.5h7M8.5 13.5h4M12 7.5v9" stroke="#FFBB31" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </div>
                <span className="text-gray-700 font-semibold text-base">Leave Policy</span>
              </div>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-3xl font-bold leading-none text-[#4CDC9C]">{employeeDashboard?.leavePolicy?.activePolicyCount ?? '-'}</span>
                <span className="text-base text-gray-700 font-medium mb-1">active policy</span>
              </div>
              <div className="flex gap-4 text-xs font-medium mb-1">
                <span className="text-gray-400">Medical <span className="text-green-500 font-bold">{employeeDashboard?.leaveBalance?.medical ?? '-'}</span></span>
                <span className="text-gray-400">Earned <span className="text-yellow-500 font-bold">{employeeDashboard?.leaveBalance?.earned ?? '-'}</span></span>
              </div>
              <button 
                className="w-full bg-[#4CDC9C] text-[#2C373B] hover:bg-[#3fd190] rounded-lg py-2 text-[14px] font-medium transition shadow-none"
                onClick={() => navigate('/leaves/policy')}
              >
                View Leave Policy
              </button>
            </div>
            {/* Payroll Processed */}
            <div className="bg-white rounded-2xl border-[1.5px] border-[#2C373B]/30 shadow-none px-3 pt-3 pb-3 sm:px-4 sm:pt-4 sm:pb-3 flex flex-col">
              <div className="flex flex-col gap-3 h-full">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <span className="absolute inset-0 rounded-full bg-[#EAF9F2]" />
                    <span className="absolute top-2 left-2 w-8 h-8 rounded-full bg-[#2C373B] flex items-center justify-center">
                      <Calculator className="h-5 w-5 text-[#FFBB31]" />
                    </span>
                  </div>
                  <div>
                    <div className="text-gray-700 text-base font-semibold">Payroll Processed</div>
                    <div className="text-xs text-gray-400 -mt-1">this month</div>
                  </div>
                </div>
                <div className="text-sm text-gray-700">
                  <div className="mb-1">Payment Date - {employeeDashboard?.payroll?.paymentDate ? format(new Date(employeeDashboard.payroll.paymentDate), 'dd/MM/yyyy') : '-'}</div>
                  <div>Net Salary <span className="text-[#4CDC9C] font-semibold">₹{employeeDashboard?.payroll?.netSalary ?? 0}</span></div>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button
                    className="bg-white border border-[#2C373B]/30 text-[#2C373B] rounded-lg px-3 py-2 text-[14px] font-medium transition hover:bg-gray-50"
                    onClick={() => navigate('/salary-slips')}
                  >
                    Salary Slip
                  </button>
                  <button 
                    className="bg-[#4CDC9C] text-[#2C373B] hover:bg-[#3fd190] rounded-lg px-3 py-2 text-[14px] font-medium transition"
                    onClick={() => navigate('/payroll')}
                  >
                    View Payroll
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
};

export default Dashboard;