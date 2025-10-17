import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getAttendance } from "@/api/attendance";
import { downloadAttendanceReport } from "@/api/attendance";
import { useAuth } from "@/contexts/AuthContext";

interface Employee {
  _id: string;
  name: string;
  employeeCode: string;
  designation: string;
  profilePhotoUrl?: string;
}

interface AttendanceRecord {
  _id: string;
  employee: Employee;
  status: string;
  clockIn: string | null;
  clockOut: string | null;
  totalWorkingHours: number | null;
  date: string;
}

interface AttendanceResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: AttendanceRecord[];
}

const Attendance = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: start, endDate: end };
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [attendanceData, setAttendanceData] = useState<AttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchAttendanceData = async () => {
      setLoading(true);
      try {
        const params: any = { page: currentPage, limit: 10 };
        
        // Add status filter if selected
        if (statusFilter) {
          // Use exact status values per API spec: 'present', 'absent', 'halfDay'
          params.status = statusFilter;
        }

        // Add date parameters for range selection
        if (dateRange.startDate) params.startDate = format(dateRange.startDate, 'yyyy-MM-dd');
        if (dateRange.endDate) params.endDate = format(dateRange.endDate, 'yyyy-MM-dd');

        // Resolve employeeId from auth if not manually set
        const id = employeeId || (user?._id || (user as any)?.id);
        if (!id) throw new Error('Missing employeeId');

        // Add search query if provided
        if (searchQuery && searchQuery.trim() !== '') {
          params.search = searchQuery.trim();
        }

        const response = await getAttendance({ ...params, employeeId: id });
        if (response && Array.isArray(response.items)) {
          const normalizedItems = response.items.map((item: any) => ({
            _id: item._id,
            employee: item.employee ? item.employee : {
              _id: item.employeeId || (user?._id || (user as any)?.id),
              name:
                (item.employee && item.employee.name) ||
                user?.name || `${(user as any)?.firstName || ''} ${(user as any)?.lastName || ''}`.trim() || 'Employee',
              employeeCode: (item.employee && item.employee.employeeCode) || (user as any)?.employeeCode || '',
              designation: (item.employee && item.employee.designation) || (user as any)?.designation || '',
              profilePhotoUrl: (item.employee && item.employee.profilePhotoUrl) || (user as any)?.profilePhotoUrl || (user as any)?.profileImage || undefined,
            },
            status: item.status,
            clockIn: item.clockIn ?? null,
            clockOut: item.clockOut ?? null,
            totalWorkingHours: typeof item.totalWorkingHours === 'string' ? item.totalWorkingHours : (item.totalWorkingHours ?? null),
            date: item.date,
          }));

          const normalized: AttendanceResponse = {
            page: response.page || 1,
            limit: response.limit || 10,
            total: response.total || normalizedItems.length,
            totalPages: response.totalPages || 1,
            items: normalizedItems,
          };
          setAttendanceData(normalized);
          setError(null);
        } else if (response && response.attendance) {
          // Fallback if API returns a single attendance object
          const rec = response.attendance;
          const normalized: AttendanceResponse = {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            items: [
              {
                _id: rec._id,
                employee: {
                  _id: rec.employeeId,
                  name: user?.name || `${(user as any)?.firstName || ''} ${(user as any)?.lastName || ''}`.trim() || 'Employee',
                  employeeCode: (user as any)?.employeeCode || '',
                  designation: (user as any)?.designation || '',
                  profilePhotoUrl: (user as any)?.profilePhotoUrl || (user as any)?.profileImage || undefined,
                },
                status: rec.status,
                clockIn: rec.clockIn,
                clockOut: rec.clockOut,
                totalWorkingHours: typeof rec.totalWorkingHours === 'string' ? rec.totalWorkingHours : (rec.totalWorkingHours ?? null),
                date: rec.date,
              }
            ]
          };
          setAttendanceData(normalized);
          setError(null);
        } else {
          throw new Error('Invalid response');
        }
        setError(null);
      } catch (err) {
        setError("Failed to load attendance data");
        setAttendanceData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [currentPage, statusFilter, dateRange, employeeId, searchQuery, user]);

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "present":
        return "bg-emerald-100 text-emerald-700";
      case "absent":
        return "bg-red-100 text-red-600";
      case "half day":
      case "half-day":
      case "halfday":
        return "bg-yellow-100 text-yellow-700";
      case "late":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "-";
    try {
      return new Date(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "-";
    }
  };

  const handleClearFilters = () => {
    setStatusFilter(null);
    setEmployeeId(null);
    setSearchQuery('');
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDateRange({ startDate: start, endDate: end });
    setCurrentPage(1);
  };

  const handleExportAll = async () => {
    try {
      const id = employeeId || (user?._id || (user as any)?.id);
      if (!id) {
        throw new Error('Missing employeeId');
      }

      const params: any = { employeeId: id };
      if (dateRange.startDate) params.startDate = format(dateRange.startDate, 'yyyy-MM-dd');
      if (dateRange.endDate) params.endDate = format(dateRange.endDate, 'yyyy-MM-dd');
      if (statusFilter) params.status = statusFilter;

      const response = await downloadAttendanceReport(params);

      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] || 'application/octet-stream' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const cd = response.headers['content-disposition'];
      let filename = 'attendance-report.xlsx';
      if (cd) {
        const match = cd.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
      alert('Failed to export attendance report');
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <h1 className="text-2xl font-semibold mb-1" style={{color: '#2C373B'}}>Attendance Records</h1>
        <p className="text-sm mb-6" style={{color: '#2C373B'}}>
          Overview of all employees' attendance with filters and details
        </p>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-3">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 text-sm border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-800 focus:border-emerald-400 focus:ring-0 h-8"
                  style={{backgroundColor: 'rgb(209 250 229)', color: '#2C373B'}}
                >
                  <CalendarIcon className="h-4 w-4 text-emerald-600" />
                  Calendar
                  <ChevronDown className="h-4 w-4 text-emerald-600" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.startDate || undefined, to: dateRange.endDate || undefined }}
                  onSelect={(range) => {
                    if (range?.from) setDateRange({ startDate: range.from, endDate: range.to || null });
                  }}
                  className="rounded-md border [&_.rdp-day_button:hover:not([disabled])]:bg-emerald-100 [&_.rdp-day_button:hover:not([disabled])]:text-emerald-700 [&_.rdp-day_button:focus:not([disabled])]:bg-emerald-100 [&_.rdp-day_button:focus:not([disabled])]:text-emerald-700 [&_.rdp-day_button.rdp-day_selected]:bg-emerald-600 [&_.rdp-day_button.rdp-day_selected]:text-white"
                  classNames={{
                    cell:
                      "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-emerald-100 [&:has([aria-selected])]:text-emerald-700 [&:has([aria-selected].day-range-end)]:rounded-r-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                    day_selected:
                      "bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-600 focus:text-white",
                    day_range_middle:
                      "aria-selected:bg-emerald-100 aria-selected:text-emerald-700",
                  }}
                />
              </PopoverContent>
            </Popover>

            <Select
              value={statusFilter || "all"}
              onValueChange={(val) => setStatusFilter(val === "all" ? null : val)}
            >
              <SelectTrigger className="w-[120px] text-sm border-emerald-300 hover:bg-emerald-200 focus:border-emerald-400 focus:ring-0 h-8" style={{backgroundColor: 'rgb(209 250 229)', color: '#2C373B'}}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent style={{backgroundColor: 'rgb(209 250 229)'}}>
                <SelectItem value="all" className="hover:opacity-80" style={{backgroundColor: 'rgb(209 250 229)', color: '#2C373B'}}>All</SelectItem>
                <SelectItem value="present" className="hover:opacity-80" style={{backgroundColor: 'rgb(209 250 229)', color: '#2C373B'}}>Present</SelectItem>
                <SelectItem value="absent" className="hover:opacity-80" style={{backgroundColor: 'rgb(209 250 229)', color: '#2C373B'}}>Absent</SelectItem>
                <SelectItem value="halfDay" className="hover:opacity-80" style={{backgroundColor: 'rgb(209 250 229)', color: '#2C373B'}}>Half Day</SelectItem>
                {/* 'late' option removed as requested */}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className="text-sm border-emerald-300 hover:bg-emerald-200 h-8"
              style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
              onClick={handleClearFilters}
            >
              Clear filters
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              className="text-sm h-8"
              style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
              onClick={handleExportAll}
            >
              Export All
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <p style={{color: '#2C373B'}}>Loading attendance data...</p>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center p-8">
              <p style={{color: '#2C373B'}}>{error}</p>
            </div>
          ) : attendanceData && attendanceData.items.length > 0 ? (
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="min-w-full text-sm">
                <thead className="border-b" style={{ backgroundColor: '#2C373B' }}>
                  <tr>
                    <th className="px-4 py-2 text-left" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>Date</th>
                    <th className="px-4 py-2 text-left" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>Status</th>
                    <th className="px-4 py-2 text-left" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>Clockin</th>
                    <th className="px-4 py-2 text-left" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>Clockout</th>
                    <th className="px-4 py-2 text-left" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>Working hours</th>
                    <th className="px-4 py-2 text-left" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>Marked by</th>
                    <th className="px-4 py-2 text-left" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                {attendanceData.items.map((record) => (
                  <tr key={record._id} className="border-b last:border-0 hover:bg-emerald-50 transition-colors">
                    <td className="px-4 py-2" style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>{format(new Date(record.date), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-2">
                      <Badge className={cn("capitalize", getStatusBadgeClass(record.status))}>
                        {record.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2" style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>{formatTime(record.clockIn)}</td>
                    <td className="px-4 py-2" style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>{formatTime(record.clockOut)}</td>
                    
                    <td className="px-4 py-2" style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>
                      {typeof record.totalWorkingHours === 'number' ? `${record.totalWorkingHours}` : (record.totalWorkingHours || '-')}
                    </td>
                    <td className="px-4 py-2" style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>
                      {(record as any).markedBy || 'Admin'}
                    </td>
                    <td className="px-4 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-3 py-1 rounded-md text-xs font-semibold"
                        style={{ backgroundColor: '#4CDC9C', color: '#2C373B' }}
                        onClick={() =>
                          navigate('/regularization/submit', {
                            state: {
                              employeeId: record.employee?._id,
                              employeeName: record.employee?.name,
                              employeeCode: record.employee?.employeeCode,
                              date: record.date,
                            },
                          })
                        }
                      >
                        Regularize
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          ) : (
            <div className="flex justify-center items-center p-8">
              <p style={{color: '#2C373B'}}>No attendance records found</p>
            </div>
          )}

          {/* Pagination */}
          {attendanceData && attendanceData.totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t bg-white">
              <Button
                variant="ghost"
                size="sm"
                className="text-sm"
                style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>

              <div className="flex gap-1">
                {Array.from({ length: attendanceData.totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={p === currentPage ? "default" : "outline"}
                    style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </Button>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-sm"
                style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                disabled={currentPage === attendanceData.totalPages}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance;
