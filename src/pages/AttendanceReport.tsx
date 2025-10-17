import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Download, User, ChevronLeft, ChevronRight } from 'lucide-react';
// import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getAttendanceReportAll, downloadMonthlyAttendanceReport, type AttendanceReportItem } from '@/api/attendance';
import { useAuth } from '@/contexts/AuthContext';

// Helpers
const sanitizePhotoUrl = (url?: string) => {
  if (!url) return undefined;
  return url.replace(/[`'\"]/g, '').trim();
};

const normalizeStatus = (status?: string) => {
  if (!status) return 'Unknown';
  const s = status.toLowerCase();
  if (s === 'present') return 'Present';
  if (s === 'absent') return 'Absent';
  if (s === 'leave') return 'Leave';
  if (s === 'wfh') return 'WFH';
  if (s === 'late') return 'Late';
  return status;
};

const formatTime = (iso?: string | null) => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
};

const getDesignationPreview = (d?: string) => {
  if (!d) return '-';
  const parts = d.trim().split(/\s+/);
  const first = parts[0] || '';
  return parts.length > 1 ? `${first}...` : first;
};

const AttendanceReport = () => {
  const { organizationId } = useAuth();
  const [attendanceData, setAttendanceData] = useState<AttendanceReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const params: any = { month, year };
        const res = await getAttendanceReportAll(params);
        setAttendanceData(res.data || []);
        setCurrentPage(1);
      } catch (e) {
        setAttendanceData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [month, year]);

  const totalPages = Math.ceil(attendanceData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAttendanceData = attendanceData.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const getStatusBadgeColor = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'present':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
      case 'absent':
        return 'bg-red-100 text-red-800 border border-red-300';
      case 'leave':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      case 'wfh':
        return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'late':
        return 'bg-orange-100 text-orange-800 border border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  };

  const handleExportReport = async () => {
    try {
      const orgId = organizationId || localStorage.getItem('organizationId') || (JSON.parse(localStorage.getItem('user') || '{}')?.organizationId);
      if (!orgId) {
        // Fallback: prevent download without org id
        alert('Organization ID not found. Please ensure you are logged in.');
        return;
      }
      const response = await downloadMonthlyAttendanceReport({
        organizationId: String(orgId),
        month,
        year,
      });

      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cd = response.headers['content-disposition'];
      let filename = `monthly-attendance-${month}-${year}.xlsx`;
      if (cd) {
        const m = cd.match(/filename="(.+?)"/);
        if (m && m[1]) filename = m[1];
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to download report');
    }
  };

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden flex flex-col"
      style={{
        background:
          'linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)',
      }}
    >
      <div className="flex-1 overflow-x-hidden">
        <div className="w-full max-w-none space-y-6 px-1 py-4 md:px-6 md:py-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Attendance Report</h1>
              <p className="text-gray-600 font-medium" style={{ fontWeight: '500' }}>
                View and manage attendance information
              </p>
            </div>
            <Button
              className="flex items-center gap-2 hover:opacity-90 transition-opacity"
              onClick={handleExportReport}
              style={{
                backgroundColor: '#4CDC9C',
                color: '#2C373B',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
              }}
            >
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 items-end">
                {/* Month */}
                <div className="space-y-2">
                  <Label className="text-emerald-800 font-medium">Month</Label>
                  <Select value={String(month)} onValueChange={(val) => setMonth(Number(val))}>
                    <SelectTrigger className="bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200 h-9">
                      <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">January</SelectItem>
                      <SelectItem value="2">February</SelectItem>
                      <SelectItem value="3">March</SelectItem>
                      <SelectItem value="4">April</SelectItem>
                      <SelectItem value="5">May</SelectItem>
                      <SelectItem value="6">June</SelectItem>
                      <SelectItem value="7">July</SelectItem>
                      <SelectItem value="8">August</SelectItem>
                      <SelectItem value="9">September</SelectItem>
                      <SelectItem value="10">October</SelectItem>
                      <SelectItem value="11">November</SelectItem>
                      <SelectItem value="12">December</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Year */}
                <div className="space-y-2">
                  <Label className="text-emerald-800 font-medium">Year</Label>
                  <Select value={String(year)} onValueChange={(val) => setYear(Number(val))}>
                    <SelectTrigger className="bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200 h-9">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear All Filters Button */}
                <div className="space-y-2">
                  <Label className="text-transparent">Action</Label>
                  <Button
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 h-9"
                    onClick={() => {
                      const now = new Date();
                      setMonth(now.getMonth() + 1);
                      setYear(now.getFullYear());
                      setCurrentPage(1);
                    }}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading attendance data...</p>
                </div>
              ) : (
                <>
                  {/* Mobile View - Enhanced Card Layout */}
                  <div className="lg:hidden">
                    <div className="p-1 border-b border-emerald-200 bg-emerald-50">
                      <p className="text-xs text-emerald-700 font-medium">
                        Showing {attendanceData.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, attendanceData.length)} of {attendanceData.length} records
                      </p>
                    </div>
                    {attendanceData.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <p className="font-medium">No attendance data found</p>
                        <p className="text-sm mt-1">Try adjusting your filters</p>
                      </div>
                    ) : (
                      <div className="p-1 space-y-3">
                        {currentAttendanceData.map((item, index) => (
                          <div key={`${item.employeeCode}-${index}`} className="bg-white rounded-lg border border-emerald-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                            <div className="p-4 space-y-4">
                              {/* Employee Info Header */}
                              <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12 border-2 border-emerald-200">
                                  {item.profilePhotoUrl ? (
                                    <AvatarImage src={sanitizePhotoUrl(item.profilePhotoUrl)} alt={item.employeeName} />
                                  ) : (
                                    <AvatarFallback className="bg-emerald-100">
                                      <User className="h-6 w-6 text-emerald-600" />
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-emerald-900 text-base truncate">{item.employeeName}</div>
                                  <div className="text-emerald-700 text-sm truncate">
                                    {item.employeeCode} • 
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="cursor-help text-emerald-900" style={{fontSize: '14px', fontWeight: 500}}>{getDesignationPreview(item.designation)}</span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <span>{item.designation || '-'}</span>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </div>
                              </div>

                              {/* Attendance Details */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-emerald-700 font-semibold" style={{fontSize: '14px', fontWeight: '600'}}>Date:</span>
                                  <span className="text-emerald-900" style={{fontSize: '14px', fontWeight: 500}}>{format(new Date(item.date), 'PPP')}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-emerald-700 font-semibold" style={{fontSize: '14px', fontWeight: '600'}}>Status:</span>
                                  <Badge className={getStatusBadgeColor(item.status)}>{normalizeStatus(item.status)}</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-emerald-700 font-semibold" style={{fontSize: '14px', fontWeight: '600'}}>Check-In:</span>
                                  <span className="font-medium text-emerald-900">{formatTime(item.clockIn)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-emerald-700 font-semibold" style={{fontSize: '14px', fontWeight: '600'}}>Check-Out:</span>
                                  <span className="font-medium text-emerald-900">{formatTime(item.clockOut)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-emerald-700 font-semibold" style={{fontSize: '14px', fontWeight: '600'}}>Total Hours:</span>
                                  <span className="font-medium text-emerald-900">{item.totalWorkingHours || '-'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Desktop View */}
                  <div className="hidden lg:block">
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-emerald-300 scrollbar-track-emerald-100" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <table className="w-full min-w-[800px] divide-y divide-gray-200">
                        <thead className="border-b" style={{ background: '#2C373B', color: '#FFFFFF' }}>
                          <tr>
                            <th className="px-3 py-3 text-left text-sm font-semibold w-[200px] whitespace-nowrap" style={{ fontSize: '12px', fontWeight: 600, lineHeight: '18px', color: '#FFFFFF' }}>
                              Name
                            </th>
                            <th className="px-3 py-3 text-left text-sm font-semibold w-[120px] whitespace-nowrap" style={{ fontSize: '12px', fontWeight: 600, lineHeight: '18px', color: '#FFFFFF' }}>
                              Code
                            </th>
                            <th className="px-3 py-3 text-left text-sm font-semibold w-[160px] whitespace-nowrap" style={{ fontSize: '12px', fontWeight: 600, lineHeight: '18px', color: '#FFFFFF' }}>
                              Designation
                            </th>
                            <th className="px-3 py-3 text-left text-sm font-semibold w-[160px] whitespace-nowrap" style={{ fontSize: '12px', fontWeight: 600, lineHeight: '18px', color: '#FFFFFF' }}>
                              Date
                            </th>
                            <th className="px-3 py-3 text-center text-sm font-semibold w-[100px] whitespace-nowrap" style={{ fontSize: '12px', fontWeight: 600, lineHeight: '18px', color: '#FFFFFF' }}>
                              Status
                            </th>
                            <th className="px-3 py-3 text-center text-sm font-semibold w-[100px] whitespace-nowrap" style={{ fontSize: '12px', fontWeight: 600, lineHeight: '18px', color: '#FFFFFF' }}>
                              Check-In
                            </th>
                            <th className="px-3 py-3 text-center text-sm font-semibold w-[100px] whitespace-nowrap" style={{ fontSize: '12px', fontWeight: 600, lineHeight: '18px', color: '#FFFFFF' }}>
                              Check-Out
                            </th>
                            <th className="px-3 py-3 text-center text-sm font-semibold w-[120px] whitespace-nowrap" style={{ fontSize: '12px', fontWeight: 600, lineHeight: '18px', color: '#FFFFFF' }}>
                              Total Hours
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-emerald-100">
                          {attendanceData.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                                <p>No attendance data found</p>
                                <p className="text-sm mt-1">Try adjusting your filters</p>
                              </td>
                            </tr>
                          ) : (
                            currentAttendanceData.map((item, index) => (
                              <tr key={`${item.employeeCode}-${index}`}>
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9 border-2 border-emerald-200">
                                      {item.profilePhotoUrl ? (
                                        <AvatarImage src={sanitizePhotoUrl(item.profilePhotoUrl)} alt={item.employeeName} />
                                      ) : (
                                        <AvatarFallback className="bg-emerald-100">
                                          <User className="h-5 w-5 text-emerald-600" />
                                        </AvatarFallback>
                                      )}
                                    </Avatar>
                                    <div>
                                      <div className="text-emerald-900" style={{fontSize: '14px', fontWeight: 500}}>{item.employeeName}</div>
                                      <div className="text-emerald-700 text-sm">{item.employeeCode}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3" style={{fontSize: '14px', fontWeight: 500}}>{item.employeeCode}</td>
                                <td className="px-3 py-3">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-help">{getDesignationPreview(item.designation)}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <span>{item.designation || '-'}</span>
                                    </TooltipContent>
                                  </Tooltip>
                                </td>
                                <td className="px-3 py-3"><span className="text-emerald-900" style={{fontSize: '14px', fontWeight: 500}}>{format(new Date(item.date), 'PPP')}</span></td>
                                <td className="px-3 py-3 text-center">
                                  <Badge className={getStatusBadgeColor(item.status) + ' text-[14px] font-medium'}>{normalizeStatus(item.status)}</Badge>
                                </td>
                                <td className="px-3 py-3 text-center" style={{fontSize: '14px', fontWeight: 500}}>{formatTime(item.clockIn)}</td>
                                <td className="px-3 py-3 text-center" style={{fontSize: '14px', fontWeight: 500}}>{formatTime(item.clockOut)}</td>
                                <td className="px-3 py-3 text-center" style={{fontSize: '14px', fontWeight: 500}}>{item.totalWorkingHours || '-'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="bg-emerald-50 px-4 py-3 border-t border-emerald-200 sm:px-6">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-emerald-700">
                          Showing {startIndex + 1} to {Math.min(endIndex, attendanceData.length)} of {attendanceData.length} results
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">Previous</span>
                          </Button>

                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }

                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => goToPage(pageNum)}
                                  className={`w-8 h-8 p-0 ${
                                    currentPage === pageNum
                                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                      : 'border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                          >
                            <span className="hidden sm:inline">Next</span>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AttendanceReport;