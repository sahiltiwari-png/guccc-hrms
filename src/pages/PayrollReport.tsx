import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Download, Search, User, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getPayrollReport, downloadPayrollReport, PayrollReportItem } from '@/api/payroll';
import { getEmployees, Employee } from '@/api/employees';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

// Currency helpers
const formatCurrency = (value: number | string | null | undefined) => {
  const num = Number(value) || 0;
  return num.toLocaleString('en-IN');
};

const shortenCurrencyDigits = (value: number | string | null | undefined, digits: number = 5) => {
  const full = formatCurrency(value);
  const totalDigits = full.replace(/\D/g, '').length;
  if (totalDigits <= digits) return `₹${full}`;
  let count = 0;
  let res = '';
  for (const ch of full) {
    if (/\d/.test(ch)) {
      if (count >= digits) break;
      count++;
    }
    res += ch;
  }
  return `₹${res}...`;
};

interface SelectedEmployee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  designation?: string;
  profilePhotoUrl?: string;
}

const PayrollReport = () => {
  const [payrollData, setPayrollData] = useState<PayrollReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>("All Status");
  const [selectedEmployees, setSelectedEmployees] = useState<SelectedEmployee[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [employeeSearchResults, setEmployeeSearchResults] = useState<Employee[]>([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const statusOptions = [
    "All Status",
    "pending",
    "processed",
    "paid",
    "hold",
    "cancelled"
  ];

  // Load all employees when input is focused
  const loadAllEmployees = async () => {
    try {
      setIsLoadingEmployees(true);
      const response = await getEmployees({ limit: 50 }); // Load first 50 employees
      setEmployeeSearchResults(response.items || []);
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployeeSearchResults([]);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  // Search employees
  const searchEmployees = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      // If search term is empty, load all employees
      await loadAllEmployees();
      return;
    }

    try {
      setIsLoadingEmployees(true);
      const response = await getEmployees({ search: searchTerm, limit: 20 });
      setEmployeeSearchResults(response.items || []);
    } catch (error) {
      console.error('Error searching employees:', error);
      setEmployeeSearchResults([]);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  // Fetch payroll data
  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const params: any = {};

      if (selectedEmployees.length > 0) {
        params.employeeId = selectedEmployees.map(emp => emp._id).join(',');
      }
      
      if (startDate) {
        params.startDate = format(startDate, 'yyyy-MM-dd');
      }
      
      if (endDate) {
        params.endDate = format(endDate, 'yyyy-MM-dd');
      }

      if (statusFilter && statusFilter !== "All Status") {
        params.status = statusFilter;
      }

      const response = await getPayrollReport(params);
      setPayrollData(response.data || []);
    } catch (error) {
      console.error('Error fetching payroll data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payroll data",
        variant: "destructive",
      });
      setPayrollData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = (employee: Employee) => {
    const newEmployee: SelectedEmployee = {
      _id: employee._id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeCode: employee.employeeCode || '',
      designation: employee.designation,
      profilePhotoUrl: employee.profilePhotoUrl
    };
    
    // Single selection - replace any existing selection
    setSelectedEmployees([newEmployee]);
    setEmployeeSearchTerm("");
    setShowEmployeeDropdown(false);
    setCurrentPage(1);
  };

  const removeSelectedEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => prev.filter(emp => emp._id !== employeeId));
    setCurrentPage(1);
  };

  const handleExportReport = async () => {
    try {
      const params: any = {};

      // Add employee filter
      if (selectedEmployees.length > 0) {
        params.employeeId = selectedEmployees[0]._id; // Single employee selection
      }
      
      // Add date filters
      if (startDate) {
        params.startDate = format(startDate, 'yyyy-MM-dd');
      }
      
      if (endDate) {
        params.endDate = format(endDate, 'yyyy-MM-dd');
      }

      // Add status filter
      if (statusFilter && statusFilter !== "All Status") {
        params.status = statusFilter;
      }

      toast({
        title: "Exporting Report",
        description: "Your payroll report is being prepared for download...",
      });

      const response = await downloadPayrollReport(params);
      
      // Create blob and download file
      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers or create default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `payroll_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Payroll report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error exporting payroll report:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting the report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const clearAllFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setStatusFilter("All Status");
    setSelectedEmployees([]);
    setEmployeeSearchTerm("");
    setEmployeeSearchResults([]);
    setCurrentPage(1);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'processed':
        return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'paid':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'hold':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  // Pagination
  const totalPages = Math.ceil(payrollData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayrollData = payrollData.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  useEffect(() => {
    fetchPayrollData();
  }, [currentPage, startDate, endDate, statusFilter, selectedEmployees]);

  useEffect(() => {
    if (employeeSearchTerm && showEmployeeDropdown) {
      const debounceTimer = setTimeout(() => {
        searchEmployees(employeeSearchTerm);
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [employeeSearchTerm, showEmployeeDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.employee-search-container')) {
        setShowEmployeeDropdown(false);
      }
    };

    if (showEmployeeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmployeeDropdown]);

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden flex flex-col"
      style={{
        background:
          "linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)",
      }}
    >
      <div className="flex-1 overflow-x-hidden">
        <div className="w-full max-w-none space-y-6 px-1 py-4 md:px-6 md:py-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Payroll Report
              </h1>
              <p className="text-gray-600 font-medium" style={{ fontWeight: '500' }}>
                View and manage payroll information
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
                border: 'none'
              }}
            >
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 items-end">
                {/* Start Date */}
                <div className="space-y-2">
                  <Label className="text-emerald-800 font-medium">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200 h-9",
                          !startDate && "text-emerald-600"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-emerald-600" />
                        {startDate ? format(startDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label className="text-emerald-800 font-medium">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200 h-9",
                          !endDate && "text-emerald-600"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-emerald-600" />
                        {endDate ? format(endDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label className="text-emerald-800 font-medium">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200 h-9">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Employee Search */}
                <div className="space-y-2 relative employee-search-container">
                  <Label className="text-emerald-800 font-medium">Employee</Label>
                  <div className="relative">
                    <div className="h-9 w-full bg-emerald-100 border border-emerald-300 rounded-md text-emerald-700 hover:bg-emerald-200 focus-within:bg-emerald-50 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-2 transition-all duration-200">
                      <div className="flex flex-wrap gap-1.5 items-center p-2">
                        {/* Selected Employee Tags - Styled to look like part of input */}
                        {selectedEmployees.map((employee) => (
                          <div
                            key={employee._id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/80 text-emerald-800 rounded-md text-xs border border-emerald-200 shadow-sm backdrop-blur-sm"
                          >
                            <Avatar className="h-4 w-4 border border-emerald-200">
                              <AvatarImage src={employee.profilePhotoUrl} />
                              <AvatarFallback className="text-xs bg-emerald-100">
                                <User className="h-2.5 w-2.5" />
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-emerald-900">
                              {employee.firstName} {employee.lastName}
                            </span>
                            <span className="text-emerald-600 font-mono text-xs">
                              {employee.employeeCode}
                            </span>
                            <button
                              onClick={() => removeSelectedEmployee(employee._id)}
                              className="text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 rounded-full p-0.5 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        
                        {/* Search Input - Seamlessly integrated */}
                        <input
                          type="text"
                          placeholder={selectedEmployees.length > 0 ? "Search more employees..." : "Search employees..."}
                          value={employeeSearchTerm}
                          onChange={(e) => {
                            setEmployeeSearchTerm(e.target.value);
                            setShowEmployeeDropdown(true);
                            searchEmployees(e.target.value);
                          }}
                          onFocus={async () => {
                            setShowEmployeeDropdown(true);
                            if (employeeSearchResults.length === 0) {
                              await loadAllEmployees();
                            }
                          }}
                          className="flex-1 min-w-[140px] bg-transparent border-none outline-none text-emerald-700 placeholder-emerald-500 text-sm py-1"
                        />
                        
                        {/* Clear All Button */}
                        {selectedEmployees.length > 0 && (
                          <button
                            onClick={() => {
                              setSelectedEmployees([]);
                              setEmployeeSearchTerm("");
                            }}
                            className="text-emerald-400 hover:text-emerald-600 hover:bg-emerald-200 rounded-full p-1.5 transition-colors"
                            title="Clear all selected employees"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {showEmployeeDropdown && (
                      <div className="absolute top-full left-0 right-0 z-50 bg-white border border-emerald-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                        {isLoadingEmployees ? (
                          <div className="px-3 py-4 text-center text-emerald-600">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
                            <div className="mt-2 text-sm">Loading employees...</div>
                          </div>
                        ) : employeeSearchResults.length > 0 ? (
                          employeeSearchResults.map((employee) => (
                            <button
                              key={employee._id}
                              onClick={() => handleEmployeeSelect(employee)}
                              className="w-full px-3 py-2 text-left hover:bg-emerald-50 flex items-center gap-3 border-b border-emerald-100 last:border-b-0"
                            >
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarImage src={employee.profilePhotoUrl} />
                                <AvatarFallback>
                                  <User className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-emerald-800 truncate">
                                  {employee.firstName} {employee.lastName}
                                </div>
                                <div className="text-sm text-emerald-600 truncate">
                                  {employee.employeeCode} • {employee.designation}
                                </div>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-4 text-center text-emerald-600 text-sm">
                            No employees found
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>

                {/* Clear All Filters Button */}
                <div className="space-y-2">
                  <Label className="text-transparent">Action</Label>
                  <Button 
                    onClick={clearAllFilters} 
                    variant="outline" 
                    size="sm"
                    className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>

              {/* Selected Employees Tags */}
              {selectedEmployees.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm font-medium mb-2 block text-emerald-800">Selected Employees:</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmployees.map((employee) => (
                      <Badge
                        key={employee._id}
                        variant="secondary"
                        className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300"
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={employee.profilePhotoUrl} />
                          <AvatarFallback className="text-xs bg-emerald-200 text-emerald-700">
                            {employee.firstName[0]}{employee.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {employee.firstName} {employee.lastName}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedEmployees(prev => 
                              prev.filter(emp => emp._id !== employee._id)
                            );
                          }}
                          className="ml-1 hover:bg-emerald-200 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>

        {/* Content */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading payroll data...</p>
              </div>
            ) : (
            <>
              {/* Mobile View - Enhanced Card Layout */}
              <div className="lg:hidden">
                <div className="p-1 border-b border-emerald-200 bg-emerald-50">
                  <p className="text-xs text-emerald-700 font-medium">
                    Showing {payrollData.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, payrollData.length)} of {payrollData.length} records
                  </p>
                </div>
                {payrollData.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p className="font-medium">No payroll data found</p>
                    <p className="text-sm mt-1">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="p-1 space-y-3">
                    {currentPayrollData.map((item, index) => (
                      <div key={`${item.employeeCode}-${index}`} className="bg-white rounded-lg border border-emerald-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="p-4 space-y-4">
                          {/* Employee Info Header */}
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 border-2 border-emerald-200">
                              {item.profilePhotoUrl ? (
                                <AvatarImage src={item.profilePhotoUrl} alt={item.employeeName} />
                              ) : (
                                <AvatarFallback className="bg-emerald-100">
                                  <User className="h-6 w-6 text-emerald-600" />
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-emerald-900 truncate" style={{fontSize: '14px', fontWeight: '600'}}>
                                {item.employeeName}
                              </h3>
                              <p className="text-emerald-600 truncate" style={{fontSize: '12px', fontWeight: '500'}}>
                                {item.employeeCode} • {item.designation}
                              </p>
                            </div>
                            <Badge className={getStatusBadgeColor(item.status)} style={{fontSize: '11px'}}>
                              {item.status}
                            </Badge>
                          </div>

                          {/* Salary Details Grid */}
                          <div className="bg-emerald-50 rounded-lg p-3">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="flex justify-between">
                                <span className="text-emerald-600 font-medium" style={{fontSize: '12px'}}>Basic:</span>
                                <span className="font-semibold text-emerald-800" style={{fontSize: '12px', fontWeight: '600'}}>₹{(item.basic ?? 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-emerald-600 font-medium" style={{fontSize: '12px'}}>HRA:</span>
                                <span className="font-semibold text-emerald-800" style={{fontSize: '12px', fontWeight: '600'}}>₹{(item.hra ?? 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-emerald-600 font-medium" style={{fontSize: '12px'}}>Gross:</span>
                                <span className="font-semibold text-emerald-800" style={{fontSize: '12px', fontWeight: '600'}}>₹{item.grossEarnings?.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-emerald-600 font-medium" style={{fontSize: '12px'}}>Deductions:</span>
                                <span className="font-semibold text-red-600" style={{fontSize: '12px', fontWeight: '600'}}>₹{parseFloat(item.deductions || '0').toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-emerald-200">
                              <div className="flex justify-between items-center">
                                <span className="text-emerald-700 font-semibold" style={{fontSize: '14px', fontWeight: '600'}}>Net Salary:</span>
                                <span className="font-bold text-emerald-900 text-lg">₹{parseFloat(item.netPayable || '0').toLocaleString()}</span>
                              </div>
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
                          Employee Code
                        </th>
                        <th className="px-3 py-3 text-right text-sm font-semibold w-[100px] whitespace-nowrap" style={{ fontSize: '12px', fontWeight: 600, lineHeight: '18px', color: '#FFFFFF' }}>
                          Basic
                        </th>
                        <th className="px-3 py-3 text-right text-sm font-semibold w-[100px] whitespace-nowrap" style={{ fontSize: '12px', fontWeight: 600, lineHeight: '18px', color: '#FFFFFF' }}>
                          HRA
                        </th>
                        <th className="px-3 py-3 text-right text-sm font-semibold w-[120px] whitespace-nowrap" style={{ fontSize: '12px', fontWeight: 600, lineHeight: '18px', color: '#FFFFFF' }}>
                          Gross Earning
                        </th>
                        <th className="px-3 py-3 text-right text-sm font-semibold w-[100px] whitespace-nowrap" style={{ fontSize: '12px', fontWeight: 600, lineHeight: '18px', color: '#FFFFFF' }}>
                          Deduction
                        </th>
                        <th className="px-3 py-3 text-right text-sm font-semibold w-[120px] whitespace-nowrap" style={{ fontSize: '12px', fontWeight: 600, lineHeight: '18px', color: '#FFFFFF' }}>
                          Net Salary
                        </th>
                        <th className="px-3 py-3 text-center text-sm font-semibold w-[100px] whitespace-nowrap" style={{ fontSize: '12px', fontWeight: 600, lineHeight: '18px', color: '#FFFFFF' }}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-emerald-100">
                      {payrollData.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                            <p>No payroll data found</p>
                            <p className="text-sm mt-1">Try adjusting your filters</p>
                          </td>
                        </tr>
                      ) : (
                        currentPayrollData.map((item, index) => (
                          <tr key={`${item.employeeCode}-${index}`} className="hover:bg-emerald-50">
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  {item.profilePhotoUrl ? (
                                    <AvatarImage src={item.profilePhotoUrl} alt={item.employeeName} />
                                  ) : (
                                    <AvatarFallback>
                                      <User className="h-4 w-4" />
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-emerald-900 truncate" style={{fontSize: '14px', fontWeight: '500'}}>
                                    {item.employeeName}
                                  </div>
                                  <div className="text-sm text-emerald-600 truncate" style={{fontSize: '14px', fontWeight: '500'}}>
                                    {item.designation}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-sm text-emerald-700" style={{fontSize: '14px', fontWeight: '500'}}>
                              {item.employeeCode}
                            </td>
                            <td className="px-3 py-3 text-right text-sm text-emerald-700" style={{fontSize: '14px', fontWeight: '500'}}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-block max-w-[100px] truncate cursor-help">
                                    {shortenCurrencyDigits(item.basic ?? 0, 5)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                ₹{formatCurrency(item.basic ?? 0)}
                              </TooltipContent>
                              </Tooltip>
                            </td>
                            <td className="px-3 py-3 text-right text-sm text-emerald-700" style={{fontSize: '14px', fontWeight: '500'}}>
                              ₹{(item.hra ?? 0).toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right text-sm font-medium text-emerald-800" style={{fontSize: '14px', fontWeight: '500'}}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-block max-w-[120px] truncate cursor-help">
                                    {shortenCurrencyDigits(item.grossEarnings ?? 0, 5)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                ₹{formatCurrency(item.grossEarnings ?? 0)}
                              </TooltipContent>
                              </Tooltip>
                            </td>
                            <td className="px-3 py-3 text-right text-sm text-red-600" style={{fontSize: '14px', fontWeight: '500'}}>
                              ₹{parseFloat(item.deductions || '0').toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right text-sm font-semibold text-emerald-900" style={{fontSize: '14px', fontWeight: '500'}}>
                              ₹{parseFloat(item.netPayable || '0').toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <Badge className={getStatusBadgeColor(item.status)}>
                                {item.status}
                              </Badge>
                            </td>
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
                      Showing {startIndex + 1} to {Math.min(endIndex, payrollData.length)} of {payrollData.length} results
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
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => goToPage(pageNum)}
                              className={`w-8 h-8 p-0 ${
                                currentPage === pageNum 
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                                  : "border-emerald-300 text-emerald-700 hover:bg-emerald-100"
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

          {/* Click outside to close dropdown */}
          {showEmployeeDropdown && (
            <div
              className="fixed inset-0 z-0"
              onClick={() => setShowEmployeeDropdown(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PayrollReport;