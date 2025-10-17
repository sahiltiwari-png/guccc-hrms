import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User, ChevronDown, X, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { 
  getLeaveBalance, 
  LeaveBalanceEmployee, 
  LeaveBalance,
  getEmployees,
  EmployeeListItem,
  allocateLeave
} from "@/api/leaves";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { getLeavePolicies, type LeavePolicy } from "@/api/leavePolicy";

// Define all possible leave types
const LEAVE_TYPES = [
  { value: "casual", label: "Casual" },
  { value: "earned", label: "Earned" },
  { value: "medical", label: "Medical" },
  { value: "paternity", label: "Paternity" },
  { value: "maternity", label: "Maternity" },
  { value: "other", label: "Other" }
];

// Transformed employee data for display
interface EmployeeLeaveData {
  _id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  designation?: string;
  profilePhotoUrl?: string;
  leaveBalances: {
    casual: { allocated: number; used: number; balance: number };
    earned: { allocated: number; used: number; balance: number };
    medical: { allocated: number; used: number; balance: number };
    paternity: { allocated: number; used: number; balance: number };
    maternity: { allocated: number; used: number; balance: number };
    other: { allocated: number; used: number; balance: number };
  };
}

const LeaveAllotment = () => {
  const navigate = useNavigate();

  // Data states
  const [employees, setEmployees] = useState<EmployeeLeaveData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [selectedLeaveType, setSelectedLeaveType] = useState("all");
  const [selectedFilterEmployee, setSelectedFilterEmployee] = useState<EmployeeListItem | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const itemsPerPage = 10;

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);
  const [leaveType, setLeaveType] = useState("");
  const [days, setDays] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Employee search states
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeList, setEmployeeList] = useState<EmployeeListItem[]>([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  // New: dynamic leave types fetched from /leave-policy
  const [policyLeaveTypes, setPolicyLeaveTypes] = useState<string[]>([]);

  // Load leave types on demand when the Leave Type dropdown is opened
  const loadLeaveTypes = async () => {
    if (policyLeaveTypes.length > 0) return; // avoid refetching if already loaded
    try {
      const res = await getLeavePolicies();
      const policies: LeavePolicy[] = Array.isArray(res?.data) ? res.data : [];
      const uniqueTypes = new Set<string>();
      policies
        .filter(p => p.isActive)
        .forEach(p => {
          p.leaveTypes.forEach(lt => {
            if (lt?.type) uniqueTypes.add(lt.type.toLowerCase());
          });
        });
      const typesArray = Array.from(uniqueTypes);
      // Fallback to static list if API returns none
      setPolicyLeaveTypes(typesArray.length > 0 ? typesArray : LEAVE_TYPES.map(t => t.value));
    } catch (err) {
      console.error("Failed to load leave policies", err);
      setPolicyLeaveTypes(LEAVE_TYPES.map(t => t.value));
    }
  };

  // Fetch leave balance data
  const fetchLeaveBalance = async (page: number = 1, leaveType?: string, employeeId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getLeaveBalance(page, itemsPerPage, leaveType, employeeId);
      
      if (response.success) {
        const transformedData = transformLeaveBalanceData(response.data);
        setEmployees(transformedData);
        setTotalPages(response.totalPages);
        setTotalEmployees(response.total);
      } else {
        setError("Failed to fetch leave balance data");
        setEmployees([]);
        setTotalPages(1);
        setTotalEmployees(0);
      }
    } catch (err) {
      console.error("Error fetching leave balance:", err);
      setError("Failed to load leave balance data. Please try again.");
      setEmployees([]);
      setTotalPages(1);
      setTotalEmployees(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees for dropdown
  const fetchEmployees = async (search?: string) => {
    try {
      setLoadingEmployees(true);
      const response = await getEmployees(1, 50, search);
      
      if (response.items) {
        setEmployeeList(response.items);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive",
      });
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Handle employee search
  const handleEmployeeSearch = (value: string) => {
    setEmployeeSearch(value);
    if (value.length > 0) {
      fetchEmployees(value);
    }
  };

  // Select employee
  const selectEmployee = (employee: EmployeeListItem) => {
    setSelectedEmployee(employee);
    setEmployeeSearch("");
    setShowEmployeeDropdown(false);
  };

  // Clear selected employee
  const clearEmployee = () => {
    setSelectedEmployee(null);
    setEmployeeSearch("");
    setShowEmployeeDropdown(false);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployee || !leaveType || !days) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await allocateLeave({
        employeeId: selectedEmployee._id,
        leaveType,
        days: parseInt(days),
        remarks: remarks || undefined
      });

      if (response.success) {
        toast({
          title: "Success",
          description: "Leave allocated successfully",
        });
        
        // Reset form
        setSelectedEmployee(null);
        setLeaveType("");
        setDays("");
        setRemarks("");
        setEmployeeSearch("");
        
        // Refresh data
        fetchLeaveBalance(currentPage);
        setShowForm(false);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to allocate leave",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error allocating leave:", err);
      toast({
        title: "Error",
        description: "Failed to allocate leave. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter employees based on search term
  const filteredEmployees = useMemo(() => {
    return employees;
  }, [employees]);

  // Load data on component mount
  useEffect(() => {
    fetchLeaveBalance(1);
  }, []);

  // Refetch data when leave type or employee filter changes
  useEffect(() => {
    const employeeId = selectedFilterEmployee?._id;
    if (selectedLeaveType && selectedLeaveType !== "all") {
      fetchLeaveBalance(1, selectedLeaveType, employeeId);
    } else if (selectedLeaveType === "all") {
      fetchLeaveBalance(1, undefined, employeeId);
    }
  }, [selectedLeaveType, selectedFilterEmployee]);

  // Load initial employees when form is shown
  useEffect(() => {
    if (showForm) {
      fetchEmployees();
    }
  }, [showForm]);

  // Handle page navigation
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      fetchLeaveBalance(page, selectedLeaveType === "all" ? undefined : selectedLeaveType, selectedFilterEmployee?._id);
    }
  };

  // Handle leave type filter change
  const handleLeaveTypeChange = (leaveType: string) => {
    setSelectedLeaveType(leaveType);
    setCurrentPage(1); // Reset to first page when filter changes
    fetchLeaveBalance(1, leaveType === "all" ? undefined : leaveType, selectedFilterEmployee?._id);
  };

  // Clear filters
  const clearFilters = () => {
    setSelectedLeaveType("all");
    setSelectedFilterEmployee(null);
    setCurrentPage(1);
    fetchLeaveBalance(1);
  };

  if (loading) {
    return (
      <div
        className="min-h-screen w-full overflow-x-hidden p-6"
        style={{
          background:
            "linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)",
        }}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading leave allotments...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show form only when explicitly requested
  if (showForm) {
    return (
      <div
        className="min-h-screen w-full overflow-x-hidden p-6"
        style={{
          background:
            "linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)",
        }}
      >
        <div className="bg-white rounded-xl shadow-md border p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Leave Allotment</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee Name
              </label>
              <div className="relative">
                {selectedEmployee ? (
                  <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white">
                    <Avatar className="h-6 w-6">
                      {selectedEmployee.profilePhotoUrl ? (
                        <AvatarImage 
                          src={selectedEmployee.profilePhotoUrl} 
                          alt={`${selectedEmployee.firstName} ${selectedEmployee.lastName}`} 
                        />
                      ) : (
                        <AvatarFallback className="bg-emerald-200 text-emerald-700 text-xs">
                          {selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="flex-1">
                      {selectedEmployee.firstName} {selectedEmployee.lastName} ({selectedEmployee.employeeCode})
                    </span>
                    <button
                      type="button"
                      onClick={clearEmployee}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Input
                      placeholder="Search and select employee..."
                      value={employeeSearch}
                      onChange={(e) => handleEmployeeSearch(e.target.value)}
                      onFocus={() => { setShowEmployeeDropdown(true); fetchEmployees(); }}
                      className="pr-10"
                      style={{backgroundColor: 'rgb(209 250 229)', color: '#2C373B'}}
                    />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  </>
                )}
                
                {/* Employee Dropdown */}
                {showEmployeeDropdown && !selectedEmployee && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {loadingEmployees ? (
                      <div className="p-3 text-center text-gray-500 text-sm">Loading employees...</div>
                    ) : employeeList.length > 0 ? (
                      employeeList.map((employee) => (
                        <div
                          key={employee._id}
                          className="p-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                          onClick={() => selectEmployee(employee)}
                        >
                          <Avatar className="h-6 w-6">
                            {employee.profilePhotoUrl ? (
                              <AvatarImage 
                                src={employee.profilePhotoUrl} 
                                alt={`${employee.firstName} ${employee.lastName}`} 
                              />
                            ) : (
                              <AvatarFallback className="bg-emerald-200 text-emerald-700 text-xs">
                                {employee.firstName[0]}{employee.lastName[0]}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {employee.firstName} {employee.lastName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {employee.employeeCode} • {employee.designation}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-gray-500 text-sm">No employees found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Leave Type and Days */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leave Type
                </label>
                {/* Dropdown populated from /leave-policy to show all leave types */}
                <Select value={leaveType} onValueChange={setLeaveType} onOpenChange={(open) => { if (open) loadLeaveTypes(); }}>
                  <SelectTrigger style={{backgroundColor: 'rgb(209 250 229)', color: '#2C373B'}}>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {policyLeaveTypes.length > 0 ? (
                      policyLeaveTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </SelectItem>
                      ))
                    ) : (
                      LEAVE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Days
                </label>
                <Select value={days} onValueChange={setDays}>
                  <SelectTrigger style={{backgroundColor: 'rgb(209 250 229)', color: '#2C373B'}}>
                    <SelectValue placeholder="Select days" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remark
              </label>
              <Textarea
                placeholder="Enter remarks (optional)"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                style={{backgroundColor: 'rgb(209 250 229)', color: '#2C373B'}}
              />
            </div>

            {/* Submit Button */}
            <div className="w-full">
              <Button
                type="submit"
                disabled={submitting || !selectedEmployee || !leaveType || !days}
                className="hover:bg-emerald-700 w-full"
                style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
              >
                {submitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>

          {/* Show existing data button if there are employees */}
          {employees.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="w-full"
                style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
              >
                View Existing Leave Allotments
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }



  return (
    <div
      className="min-h-screen w-full overflow-x-hidden p-3 sm:p-6 space-y-4 sm:space-y-6"
      style={{
        background:
          "linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)",
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-semibold" style={{color: '#2C373B'}}>Leaves Alloted - {totalEmployees}</h1>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="hover:bg-emerald-700 w-full sm:w-auto"
          style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
        >
          <User className="mr-2 h-4 w-4" />
          Add New Allocation
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
        {/* Empty space for left side */}
        <div className="flex-1"></div>

        {/* Right side filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          {/* Employee Filter */}
          <div className="relative w-full sm:w-64">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                {selectedFilterEmployee ? (
                  <div className="flex items-center gap-2 border border-green-300 rounded-lg px-3 py-1.5 bg-white">
                    <Avatar className="h-6 w-6">
                      {selectedFilterEmployee.profilePhotoUrl ? (
                        <AvatarImage 
                          src={selectedFilterEmployee.profilePhotoUrl} 
                          alt={`${selectedFilterEmployee.firstName} ${selectedFilterEmployee.lastName}`} 
                        />
                      ) : (
                        <AvatarFallback className="bg-emerald-200 text-emerald-700 text-xs">
                          {selectedFilterEmployee.firstName[0]}{selectedFilterEmployee.lastName[0]}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="flex-1 text-sm" style={{color: '#2C373B'}}>
                      {selectedFilterEmployee.firstName} {selectedFilterEmployee.lastName} ({selectedFilterEmployee.employeeCode})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFilterEmployee(null);
                        setEmployeeSearch("");
                        fetchLeaveBalance(1, selectedLeaveType === "all" ? undefined : selectedLeaveType);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      placeholder="Filter by employee..."
                      value={employeeSearch}
                      onChange={(e) => handleEmployeeSearch(e.target.value)}
                      onFocus={() => { setShowEmployeeDropdown(true); fetchEmployees(); }}
                      className="pr-8 h-8 border-green-300 focus:border-green-500 focus:ring-green-200"
                      style={{backgroundColor: 'rgb(209 250 229)', color: '#2C373B'}}
                    />
                    <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  </div>
                )}
              </div>
            </div>

            {/* Employee Dropdown */}
            {showEmployeeDropdown && !selectedFilterEmployee && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                {loadingEmployees ? (
                  <div className="p-3 text-center text-gray-500 text-sm">Loading employees...</div>
                ) : employeeList.length > 0 ? (
                  employeeList.map((employee) => (
                    <div
                      key={employee._id}
                      className="p-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                      onClick={() => {
                        setSelectedFilterEmployee(employee);
                        setEmployeeSearch("");
                        setShowEmployeeDropdown(false);
                        fetchLeaveBalance(1, selectedLeaveType === "all" ? undefined : selectedLeaveType, employee._id);
                      }}
                    >
                      <Avatar className="h-6 w-6">
                        {employee.profilePhotoUrl ? (
                          <AvatarImage 
                            src={employee.profilePhotoUrl} 
                            alt={`${employee.firstName} ${employee.lastName}`} 
                          />
                        ) : (
                          <AvatarFallback className="bg-emerald-200 text-emerald-700 text-xs">
                            {employee.firstName[0]}{employee.lastName[0]}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {employee.employeeCode} • {employee.designation}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-gray-500 text-sm">No employees found</div>
                )}
              </div>
            )}
          </div>
          {/* Leave Type Filter */}
          <div className="flex items-center gap-2">
            <Select value={selectedLeaveType} onValueChange={handleLeaveTypeChange}>
              <SelectTrigger className="w-48 border-green-300 focus:border-green-500 focus:ring-green-200 h-8" style={{backgroundColor: 'rgb(209 250 229)', color: '#2C373B'}}>
                <SelectValue placeholder="Filter by Leave Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leave Types</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="medical">Medical</SelectItem>
                <SelectItem value="earned">Earned</SelectItem>
                <SelectItem value="maternity">Maternity</SelectItem>
                <SelectItem value="paternity">Paternity</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {(selectedLeaveType && selectedLeaveType !== "all") || selectedFilterEmployee ? (
            <Button variant="outline" onClick={clearFilters} size="sm" className="border-green-300 hover:bg-green-100 h-8" style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}>
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full w-full text-xs sm:text-sm">
            <thead className="border-b" style={{ backgroundColor: '#2C373B' }}>
              <tr>
                <th className="px-2 sm:px-4 py-3 text-left font-semibold min-w-[150px]" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>
                  Name
                </th>
                <th className="px-2 sm:px-4 py-3 text-left font-semibold hidden sm:table-cell whitespace-nowrap" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>
                  Employee code
                </th>
                <th className="px-2 sm:px-4 py-3 text-left font-semibold min-w-[80px]" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>
                  Casual
                </th>
                <th className="px-2 sm:px-4 py-3 text-left font-semibold min-w-[80px]" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>
                  Earned
                </th>
                <th className="px-2 sm:px-4 py-3 text-left font-semibold min-w-[80px]" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>
                  Medical
                </th>
                <th className="px-2 sm:px-4 py-3 text-left font-semibold min-w-[80px] hidden md:table-cell" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>
                  Paternity
                </th>
                <th className="px-2 sm:px-4 py-3 text-left font-semibold min-w-[80px] hidden md:table-cell" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>
                  Maternity
                </th>
                <th className="px-2 sm:px-4 py-3 text-left font-semibold min-w-[80px]" style={{fontSize: '12px', fontWeight: 600, color: '#FFFFFF'}}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center" style={{color: '#2C373B'}}>
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-lg">📋</div>
                      <div className="font-medium">
                        No result found
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee._id} className="hover:bg-gray-50">
                    {/* Name */}
                    <td className="px-2 sm:px-4 py-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                          {employee.profilePhotoUrl ? (
                            <AvatarImage 
                              src={employee.profilePhotoUrl} 
                              alt={`${employee.firstName} ${employee.lastName}`} 
                            />
                          ) : (
                            <AvatarFallback className="bg-emerald-200 text-emerald-700 text-xs">
                              {employee.firstName[0]}{employee.lastName[0]}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate" style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-xs sm:hidden" style={{color: '#2C373B'}}>
                            {employee.employeeCode}
                          </div>
                          <div className="text-xs hidden sm:block" style={{color: '#2C373B'}}>
                            {employee.designation || 'No designation'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Employee Code */}
                    <td className="px-2 sm:px-4 py-3 hidden sm:table-cell whitespace-nowrap" style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>
                      {employee.employeeCode}
                    </td>

                    {/* Casual Leave */}
                    <td className="px-2 sm:px-4 py-3 text-center" style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>
                      {employee.leaveBalances.casual.allocated}
                    </td>

                    {/* Earned Leave */}
                    <td className="px-2 sm:px-4 py-3 text-center" style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>
                      {employee.leaveBalances.earned.allocated}
                    </td>

                    {/* Medical Leave */}
                    <td className="px-2 sm:px-4 py-3 text-center" style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>
                      {employee.leaveBalances.medical.allocated}
                    </td>

                    {/* Paternity */}
                    <td className="px-2 sm:px-4 py-3 text-center hidden md:table-cell" style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>
                      {employee.leaveBalances.paternity.allocated}
                    </td>

                    {/* Maternity */}
                    <td className="px-2 sm:px-4 py-3 text-center hidden md:table-cell" style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>
                      {employee.leaveBalances.maternity.allocated}
                    </td>

                    {/* Actions */}
                    <td className="px-2 sm:px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="link"
                          size="sm"
                          className="hover:text-blue-800 p-0 h-auto text-xs sm:text-sm"
                          style={{color: '#2C373B'}}
                          onClick={() => {
                            const params = new URLSearchParams({
                              name: `${employee.firstName} ${employee.lastName}`,
                              designation: employee.designation || 'No designation',
                              ...(employee.profilePhotoUrl && { photo: employee.profilePhotoUrl })
                            });
                            navigate(`/leaves/allotment/history/${employee._id}?${params.toString()}`);
                          }}
                        >
                          <span className="hidden sm:inline">View Allotment history</span>
                          <span className="sm:hidden">View</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between px-2 sm:px-4 py-3 border-t bg-gray-50 gap-2 sm:gap-0">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 text-xs sm:text-sm"
                style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Prev</span>
                <span className="sm:hidden">‹</span>
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(window.innerWidth < 640 ? 3 : 5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className="w-6 h-6 sm:w-8 sm:h-8 p-0 text-xs sm:text-sm"
                      style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
                    >
                      {page}
                    </Button>
                  );
                })}
                {totalPages > (window.innerWidth < 640 ? 3 : 5) && (
                  <>
                    <span className="px-1 sm:px-2 text-gray-500 text-xs sm:text-sm">...</span>
                    <Button
                      variant={currentPage === totalPages ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(totalPages)}
                      className="w-6 h-6 sm:w-8 sm:h-8 p-0 text-xs sm:text-sm"
                      style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 text-xs sm:text-sm"
                style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">›</span>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
            
            <div className="text-xs sm:text-sm" style={{color: '#2C373B'}}>
              Page {currentPage} of {totalPages}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default LeaveAllotment;

const transformLeaveBalanceData = (apiData: LeaveBalanceEmployee[]): EmployeeLeaveData[] => {
  return apiData.map(item => {
    const leaveBalances = {
      casual: { allocated: 0, used: 0, balance: 0 },
      earned: { allocated: 0, used: 0, balance: 0 },
      medical: { allocated: 0, used: 0, balance: 0 },
      paternity: { allocated: 0, used: 0, balance: 0 },
      maternity: { allocated: 0, used: 0, balance: 0 },
      other: { allocated: 0, used: 0, balance: 0 }
    };

    // Fill in the actual data from API
    item.leaveBalances.forEach(balance => {
      const leaveTypeKey = balance.leaveType.toLowerCase() as keyof typeof leaveBalances;
      if (leaveBalances[leaveTypeKey] !== undefined) {
        leaveBalances[leaveTypeKey] = {
          allocated: balance.allocated,
          used: balance.used,
          balance: balance.balance
        };
      }
    });

    return {
      _id: item.employee._id,
      firstName: item.employee.firstName,
      lastName: item.employee.lastName,
      employeeCode: item.employee.employeeCode,
      designation: item.employee.designation,
      profilePhotoUrl: item.employee.profilePhotoUrl,
      leaveBalances
    };
  });
};