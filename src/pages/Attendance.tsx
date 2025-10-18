import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Eye, User } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import EmpAttendance from "../EmpAttendance";

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
  isOnWFH?: boolean;
}

interface AttendanceResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: AttendanceRecord[];
}

const AdminAttendanceView = () => {
  const [date, setDate] = useState<Date>(new Date());
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
        const formattedDate = format(date, 'yyyy-MM-dd');
        const params: any = { page: currentPage, limit: 10 };
        
        // Add status filter if selected
        if (statusFilter) {
          params.status = statusFilter.toLowerCase();
        }

        // Add date parameters for single date selection
        params.startDate = formattedDate;
        params.endDate = formattedDate;

        // Add employee ID if selected
        if (employeeId) {
          params.employeeId = employeeId;
        }

        // Add search query if provided
        if (searchQuery && searchQuery.trim() !== '') {
          params.search = searchQuery.trim();
        }

        const data = await getAttendance(params);
        setAttendanceData(data);
        setError(null);
      } catch (err) {
        setError("Failed to load attendance data");
        setAttendanceData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [currentPage, statusFilter, date, employeeId, searchQuery]);

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "present":
        return "bg-emerald-100 text-emerald-700";
      case "absent":
        return "bg-red-100 text-red-600";
      case "half day":
      case "half-day":
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
    setDate(new Date());
    setCurrentPage(1);
  };

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden p-6"
      style={{
        background:
          "linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)",
      }}
    >
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
                  className="flex items-center gap-2 text-sm border-emerald-300 hover:bg-emerald-200 focus:border-emerald-400 focus:ring-0 h-8"
                  style={{backgroundColor: 'rgb(209 250 229)', color: '#2C373B'}}
                >
                  <CalendarIcon className="h-4 w-4 text-emerald-600" />
                  <span>{format(date, "MMM d, yyyy")}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                mode="single"
                selected={date}
                onSelect={(date) => {
                  if (date) {
                    setDate(date);
                  }
                }}
                initialFocus
                className="rounded-md border [&_.rdp-day_button:hover:not([disabled])]:bg-emerald-100 [&_.rdp-day_button:hover:not([disabled])]:text-emerald-700 [&_.rdp-day_button:focus:not([disabled])]:bg-emerald-100 [&_.rdp-day_button:focus:not([disabled])]:text-emerald-700 [&_.rdp-day_button.rdp-day_selected]:bg-emerald-600 [&_.rdp-day_button.rdp-day_selected]:text-white"
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
                <SelectItem value="late" className="hover:opacity-80" style={{backgroundColor: 'rgb(209 250 229)', color: '#2C373B'}}>Late</SelectItem>
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
                <thead className="border-b" style={{ background: '#2C373B', color: '#FFFFFF' }}>
                  <tr>
                    <th className="px-3 py-2 text-left" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>Employee</th>
                    <th className="px-3 py-2 text-left" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>Status</th>
                    <th className="px-3 py-2 text-left" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>Clock In</th>
                    <th className="px-3 py-2 text-left" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>Clock Out</th>
                    <th className="px-3 py-2 text-left" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>WFH</th>
                    <th className="px-3 py-2 text-left" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                {attendanceData.items.map((record) => (
                  <tr key={record._id} className="border-b last:border-0 hover:bg-emerald-50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {record.employee.profilePhotoUrl ? (
                            <AvatarImage src={record.employee.profilePhotoUrl} alt={record.employee.name} />
                          ) : (
                            <AvatarFallback>
                              <User className="h-5 w-5" style={{color: '#2C373B'}} />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <div style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>{record.employee.name}</div>
                          <div className="text-xs" style={{color: '#2C373B'}}>{record.employee.designation}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={cn("capitalize", getStatusBadgeClass(record.status))}>
                        {record.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2" style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>{formatTime(record.clockIn)}</td>
                    <td className="px-3 py-2" style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>{formatTime(record.clockOut)}</td>
                    <td className="px-3 py-2">
                      <Badge className={record.isOnWFH ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}>
                        {record.isOnWFH ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        variant="link"
                        size="icon"
                        className="h-8 w-8 p-0"
                        style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
                        onClick={() => navigate(`/attendance/employee/${record.employee._id}`, {
                          state: {
                            employeeName: record.employee.name,
                            employeeDesignation: record.employee.designation,
                            profilePhotoUrl: record.employee.profilePhotoUrl
                          }
                        })}
                      >
                        <Eye className="w-5 h-5" />
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

// Wrapper component: show employee view for employees, admin view otherwise
const Attendance = () => {
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();
  if (role === "employee") {
    return <EmpAttendance />;
  }
  return <AdminAttendanceView />;
};

export default Attendance;
