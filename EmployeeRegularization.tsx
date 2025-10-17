import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
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
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, ChevronDown, X, Search, ChevronLeft, ChevronRight, Plus, Calendar, Clock, Edit, Eye, Filter, Trash2 } from "lucide-react";
import { getEmployees, Employee as EmployeeType, EmployeesResponse } from "@/api/employees";
import { getRegularizationRequests, updateRegularizationRequest, RegularizationRequest, RegularizationResponse, createRegularizationRequest, CreateRegularizationRequest } from "@/api/regularizations";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Regularization = () => {
  const { user } = useAuth();
  const role = user?.role || localStorage.getItem('role');
  const [status, setStatus] = useState<string>("all");
  const [requests, setRequests] = useState<RegularizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRequests, setTotalRequests] = useState(0);
  
  // Employee search states
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employees, setEmployees] = useState<EmployeeType[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeType | null>(null);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Edit states
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set());
  const [editValues, setEditValues] = useState<{[key: string]: {status: string, remarks: string}}>({});
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  // Form view states
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateRegularizationRequest>({
    date: '',
    field: 'clockIn',
    requestedTime: '',
    reason: ''
  });

  // Form employee selection states
  const [formEmployeeSearch, setFormEmployeeSearch] = useState("");
  const [formEmployees, setFormEmployees] = useState<EmployeeType[]>([]);
  const [formSelectedEmployee, setFormSelectedEmployee] = useState<EmployeeType | null>(null);
  const [showFormEmployeeDropdown, setShowFormEmployeeDropdown] = useState(false);
  const [loadingFormEmployees, setLoadingFormEmployees] = useState(false);
  // URL query params
  const location = useLocation();
  const [queryEmployeeId, setQueryEmployeeId] = useState<string | null>(null);
  const [queryStatus, setQueryStatus] = useState<string | null>(null);

  // Read URL query on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const empId = params.get('employeeId');
    const stat = params.get('status');
    if (empId) setQueryEmployeeId(empId);
    if (stat && (stat === 'pending' || stat === 'approved' || stat === 'rejected')) {
      setStatus(stat);
      setQueryStatus(stat);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRegularizationRequests();
  }, [selectedEmployee, status, currentPage, user]);

  // Search employees when user types or when dropdown is opened
  useEffect(() => {
    if (showEmployeeDropdown) {
      searchEmployees();
    }
  }, [employeeSearch, showEmployeeDropdown]);

  // Search form employees when user types or when dropdown is opened
  useEffect(() => {
    if (showFormEmployeeDropdown) {
      searchFormEmployees();
    }
  }, [formEmployeeSearch, showFormEmployeeDropdown]);

  // Prefill logged-in employee in the submission form and lock selector
  useEffect(() => {
    if (showForm) {
      const id = (user as any)?._id || (user as any)?.id;
      const firstName = (user as any)?.firstName || ((user as any)?.name ? String((user as any)?.name).split(' ')[0] : '');
      const lastName = (user as any)?.lastName || ((user as any)?.name ? String((user as any)?.name).split(' ').slice(1).join(' ') : '');
      const employeeCode = (user as any)?.employeeCode || '';
      const designation = (user as any)?.designation || '';
      const profilePhotoUrl = (user as any)?.profilePhotoUrl || (user as any)?.profileImage || undefined;

      if (id && (firstName || lastName)) {
        const prefilled: EmployeeType = {
          _id: id,
          organizationId: (user as any)?.organizationId || '',
          firstName: firstName || '',
          lastName: lastName || '',
          email: (user as any)?.email || '',
          phone: (user as any)?.phone || '',
          employeeCode: employeeCode || '',
          designation: designation || '',
          status: 'active',
          loginEnabled: true,
          isActive: true,
          isSystemGenerated: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          __v: 0,
          profilePhotoUrl,
        };
        setFormSelectedEmployee(prefilled);
        setFormEmployeeSearch(`${prefilled.firstName} ${prefilled.lastName} (${prefilled.employeeCode})`);
        setShowFormEmployeeDropdown(false);
      }
    } else {
      setFormSelectedEmployee(null);
      setFormEmployeeSearch('');
      setShowFormEmployeeDropdown(false);
    }
  }, [showForm, user]);

  const fetchRegularizationRequests = async () => {
    try {
      setLoading(true);
      
      const filters: any = {
        page: currentPage,
        limit: itemsPerPage
      };

      // Prefer selected employee; otherwise query param; otherwise logged-in user's id
      const fallbackEmployeeId = selectedEmployee?._id || queryEmployeeId || (user?._id || (user as any)?.id);
      if (fallbackEmployeeId) {
        filters.employeeId = fallbackEmployeeId;
      }

      if (status !== "all") {
        filters.status = status as 'pending' | 'approved' | 'rejected';
      }

      const response: RegularizationResponse = await getRegularizationRequests(filters);
      setRequests(response.requests);
      setTotalRequests(response.total);
    } catch (error) {
      console.error('Error fetching regularization requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch regularization requests",
        variant: "destructive",
      });
      // Set empty state on error
      setRequests([]);
      setTotalRequests(0);
    } finally {
      setLoading(false);
    }
  };

  const searchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await getEmployees({ search: employeeSearch });
      setEmployees(response.items || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const searchFormEmployees = async () => {
    try {
      setLoadingFormEmployees(true);
      const response = await getEmployees({ search: formEmployeeSearch });
      setFormEmployees(response.items || []);
    } catch (error) {
      console.error('Error fetching form employees:', error);
      setFormEmployees([]);
    } finally {
      setLoadingFormEmployees(false);
    }
  };

  // Helper functions for employee selection
  const selectEmployee = (employee: EmployeeType) => {
    setSelectedEmployee(employee);
    setEmployeeSearch(`${employee.firstName} ${employee.lastName} (${employee.employeeCode})`);
    setShowEmployeeDropdown(false);
  };

  const clearEmployee = () => {
    setSelectedEmployee(null);
    setEmployeeSearch("");
  };

  // Helper functions for form employee selection
  const selectFormEmployee = (employee: EmployeeType) => {
    setFormSelectedEmployee(employee);
    setFormEmployeeSearch(`${employee.firstName} ${employee.lastName} (${employee.employeeCode})`);
    setShowFormEmployeeDropdown(false);
  };

  const clearFormEmployee = () => {
    setFormSelectedEmployee(null);
    setFormEmployeeSearch("");
  };

  const handleFormSearchFocus = () => {
    setShowFormEmployeeDropdown(true);
  };

  const handleFormSearchClick = () => {
    setShowFormEmployeeDropdown(true);
  };

  const handleSearchFocus = () => {
    setShowEmployeeDropdown(true);
  };

  const handleSearchClick = () => {
    setShowEmployeeDropdown(true);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.employee-search-container')) {
        setShowEmployeeDropdown(false);
      }
      if (!target.closest('.form-employee-search-container')) {
        setShowFormEmployeeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Since filtering is now done server-side, we don't need client-side filtering
  const filteredRequests = requests;
  const isPrefilledCurrentUser = useMemo(() => {
    const id = (user as any)?._id || (user as any)?.id;
    return !!formSelectedEmployee && !!id && formSelectedEmployee._id === id;
  }, [formSelectedEmployee, user]);
  
  const totalPages = Math.ceil(totalRequests / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests;

  const handleEdit = (requestId: string, currentStatus: string, currentRemarks: string) => {
    setEditingRows(prev => new Set(prev).add(requestId));
    setEditValues(prev => ({
      ...prev,
      [requestId]: {
        status: currentStatus,
        remarks: currentRemarks || ''
      }
    }));
  };

  const handleCancel = (requestId: string) => {
    setEditingRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(requestId);
      return newSet;
    });
    setEditValues(prev => {
      const newValues = { ...prev };
      delete newValues[requestId];
      return newValues;
    });
  };

  const handleSave = async (requestId: string) => {
    try {
      setUpdating(prev => new Set(prev).add(requestId));
      
      const updates = {
        status: editValues[requestId].status,
        reviewComment: editValues[requestId].remarks || "not specify"
      };

      await updateRegularizationRequest(requestId, updates);
      
      // Update local state
      setRequests(prev => prev.map(req => 
        req._id === requestId 
          ? { 
              ...req, 
              status: editValues[requestId].status as 'pending' | 'approved' | 'rejected',
              // Note: API response doesn't have remarks field, but we'll keep it for UI consistency
            }
          : req
      ));

      setEditingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });

      toast({
        title: "Success",
        description: "Regularization request updated successfully",
      });
    } catch (error) {
      console.error('Error updating regularization request:', error);
      toast({
        title: "Error",
        description: "Failed to update regularization request",
        variant: "destructive",
      });
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleEditValueChange = (requestId: string, field: 'status' | 'remarks', value: string) => {
    setEditValues(prev => ({
      ...prev,
      [requestId]: {
        ...prev[requestId],
        [field]: value
      }
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formSelectedEmployee || !formData.date || !formData.requestedTime || !formData.reason.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields including employee selection",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      
      // Combine date and time for the requestedTime field
      const requestedDateTime = new Date(`${formData.date}T${formData.requestedTime}`).toISOString();
      
      const requestPayload = {
        ...formData,
        employeeId: formSelectedEmployee._id,
        requestedTime: requestedDateTime
      };

      await createRegularizationRequest(requestPayload);
      
      toast({
        title: "Success",
        description: "Regularization request submitted successfully",
      });

      // Reset form and go back to table view
      setFormData({
        date: '',
        field: 'clockIn',
        requestedTime: '',
        reason: ''
      });
      clearFormEmployee();
      setShowForm(false);
      
      // Refresh the requests list
      fetchRegularizationRequests();
      
    } catch (error) {
      console.error('Error submitting regularization request:', error);
      toast({
        title: "Error",
        description: "Failed to submit regularization request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormChange = (field: keyof CreateRegularizationRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen px-3 py-6 sm:px-6" style={{ background: 'linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)' }}>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-emerald-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-emerald-100 rounded"></div>
              <div className="h-4 bg-emerald-100 rounded w-5/6"></div>
              <div className="h-4 bg-emerald-100 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-2 py-6 sm:px-6" style={{ background: 'linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
         <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
           <div>
             <h2 className="text-base font-medium text-[#2C373B]">
               Regularization Request - {totalRequests}
             </h2>
           </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Request Regularization Button */}
            {role !== 'companyAdmin' && (
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-[#4CDC9C] hover:bg-[#43c58d] text-[#2C373B]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Request Regularization
              </Button>
            )}
            {/* Employee Search Filter removed as requested */}

            {/* Status Filter */}
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px] border-emerald-300 focus:border-emerald-500 h-8 bg-[rgb(209,250,229)] text-[#2C373B]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Conditional rendering: Table or Form */}
        {!showForm ? (
          /* Table */
          <div className="bg-white rounded-xl shadow-sm border border-emerald-200 overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-emerald-300 scrollbar-track-emerald-100" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="min-w-[820px] w-full table-fixed">
              <thead className="border-b" style={{ backgroundColor: '#2C373B' }}>
                <tr>
                  <th className="px-3 py-3 text-left text-[12px] font-semibold w-[18%]" style={{ color: '#FFFFFF' }}>
                    Employee
                  </th>
                  <th className="px-3 py-3 text-left text-[12px] font-semibold w-[10%]" style={{ color: '#FFFFFF' }}>
                    Date
                  </th>
                  <th className="px-5 py-3 text-left text-[12px] font-semibold w-[8%] min-w-[110px]" style={{ color: '#FFFFFF' }}>
                    Field
                  </th>
                  <th className="px-6 py-3 text-left text-[12px] font-semibold w-[10%] min-w-[120px]" style={{ color: '#FFFFFF' }}>
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-[12px] font-semibold w-[20%] min-w-[160px]" style={{ color: '#FFFFFF' }}>
                    Reason
                  </th>
                  <th className="px-3 py-3 text-left text-[12px] font-semibold w-[12%]" style={{ color: '#FFFFFF' }}>
                     Status
                   </th>
                   <th className="px-3 py-3 text-left text-[12px] font-semibold w-[12%]" style={{ color: '#FFFFFF' }}>
                     Remarks
                   </th>
                   
                </tr>
              </thead>

              <tbody>
                {filteredRequests.length === 0 && (
                   <tr>
                     <td
                       colSpan={7}
                       className="px-4 py-6 text-center text-gray-600"
                     >
                       No regularization requests found
                     </td>
                   </tr>
                 )}

                {paginatedRequests.map((req) => (
                  <tr
                    key={req._id}
                    className="border-b last:border-0 hover:bg-emerald-50 transition-colors"
                  >
                    {/* Name with avatar */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          {req.employeeId.profilePhotoUrl ? (
                            <AvatarImage
                              src={req.employeeId.profilePhotoUrl}
                              alt={`${req.employeeId.firstName} ${req.employeeId.lastName}`}
                            />
                          ) : (
                            <AvatarFallback>
                              <User className="h-3 w-3 text-gray-500" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="text-[14px] font-medium text-[#2C373B] truncate">
                            {req.employeeId.firstName} {req.employeeId.lastName}
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-[14px] font-medium text-[#2C373B] truncate" title={req.employeeId.designation || ''}>
                                {req.employeeId.designation || ''}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <span className="text-sm" style={{ color: '#2C373B' }}>
                                {req.employeeId.designation || 'No designation'}
                              </span>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-3 py-3 text-[14px] font-medium text-[#2C373B] whitespace-nowrap">
                      {new Date(req.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>

                    {/* Field */}
                    <td className="pl-4 pr-8 py-3 text-[14px] font-medium text-[#2C373B] whitespace-nowrap">
                      <span className="capitalize text-[14px] font-medium text-[#2C373B]">{req.field}</span>
                    </td>

                    {/* Requested Time */}
                    <td className="pl-8 pr-10 py-3 text-[14px] font-medium text-[#2C373B] whitespace-nowrap">
                      {new Date(req.requestedTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    {/* Reason */}
                    <td className="pl-8 pr-4 py-3">
                      <span className="text-[#2C373B] text-[14px] font-medium truncate block" title={req.reason}>
                        {req.reason}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3">
                      {editingRows.has(req._id) ? (
                        <Select
                          value={editValues[req._id]?.status || req.status}
                          onValueChange={(value) => handleEditValueChange(req._id, 'status', value)}
                        >
                          <SelectTrigger className="w-full h-8 text-[14px] font-medium bg-[rgb(209,250,229)] text-[#2C373B]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-[14px] font-medium ${
                            req.status === "approved"
                              ? "bg-green-100 text-[#2C373B]"
                              : req.status === "rejected"
                              ? "bg-red-100 text-[#2C373B]"
                              : "bg-yellow-100 text-[#2C373B]"
                          }`}
                        >
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      )}
                    </td>

                    {/* Remarks */}
                    <td className="px-3 py-3">
                      {editingRows.has(req._id) ? (
                        <Input
                          value={editValues[req._id]?.remarks || ''}
                          onChange={(e) => handleEditValueChange(req._id, 'remarks', e.target.value)}
                          placeholder="Add remarks..."
                          className="w-full h-8 text-[14px] font-medium bg-[rgb(209,250,229)] text-[#2C373B]"
                        />
                      ) : (
                        <span className="text-[#2C373B] text-[14px] font-medium truncate block" title={req.remarks || '-'}>
                          {req.remarks || '-'}
                        </span>
                      )}
                    </td>

                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-emerald-200 bg-emerald-50">
              <div className="text-[14px] font-medium text-[#2C373B]">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalRequests)} of {totalRequests} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0 bg-[#4CDC9C] border-[#4CDC9C] text-[#2C373B] hover:bg-[#43c58d]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-[14px] font-medium text-[#2C373B]">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0 bg-[#4CDC9C] border-[#4CDC9C] text-[#2C373B] hover:bg-[#43c58d]"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        ) : (
          /* Form */
          <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Submit Attendance Regularization
              </h3>
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="bg-[#4CDC9C] border-[#4CDC9C] text-[#2C373B] hover:bg-[#43c58d]"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Employee Name with Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="employeeName" className="text-sm font-medium text-gray-700">
                  Employee Name
                </Label>
                <div className="relative form-employee-search-container">
                  <div className="border border-gray-300 rounded-md px-3 py-2 bg-[rgb(209,250,229)] focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 min-h-[40px] flex items-center gap-2 flex-wrap">
                    {formSelectedEmployee ? (
                      <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm">
                        <Avatar className="h-6 w-6">
                          {formSelectedEmployee.profilePhotoUrl ? (
                            <AvatarImage 
                              src={formSelectedEmployee.profilePhotoUrl} 
                              alt={`${formSelectedEmployee.firstName} ${formSelectedEmployee.lastName}`} 
                            />
                          ) : (
                            <AvatarFallback className="bg-emerald-200 text-emerald-700 text-xs">
                              {formSelectedEmployee.firstName[0]}{formSelectedEmployee.lastName[0]}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="font-medium">
                          {formSelectedEmployee.firstName} {formSelectedEmployee.lastName}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-emerald-600 text-xs truncate max-w-[160px]">
                              {formSelectedEmployee.designation || ''}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span className="text-sm" style={{ color: '#2C373B' }}>
                              {formSelectedEmployee.designation || 'No designation'}
                            </span>
                          </TooltipContent>
                        </Tooltip>
                        {!isPrefilledCurrentUser && (
                          <button
                            type="button"
                            onClick={clearFormEmployee}
                            className="text-emerald-600 hover:text-emerald-800 ml-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        <Input
                          placeholder="Click to select employee..."
                          value={formEmployeeSearch}
                          onChange={(e) => setFormEmployeeSearch(e.target.value)}
                          onFocus={handleFormSearchFocus}
                          onClick={handleFormSearchClick}
                          className="border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-[#2C373B] cursor-pointer flex-1 bg-[rgb(209,250,229)] text-[#2C373B]"
                        />
                        <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      </>
                    )}
                  </div>
                  
                  {/* Employee Dropdown */}
                  {!isPrefilledCurrentUser && showFormEmployeeDropdown && (formEmployees.length > 0 || loadingFormEmployees) && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-emerald-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                      {loadingFormEmployees ? (
                        <div className="p-2 text-center text-gray-500 text-sm">Searching...</div>
                      ) : (
                        formEmployees.map((employee) => (
                          <div
                            key={employee._id}
                            className="p-2 hover:bg-emerald-50 cursor-pointer flex items-center gap-2 border-b border-gray-100 last:border-b-0"
                            onClick={() => selectFormEmployee(employee)}
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
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Entry Type */}
                <div className="space-y-2">
                  <Label htmlFor="entryType" className="text-sm font-medium text-gray-700">
                    Entry type
                  </Label>
                  <Select
                    value={formData.field}
                    onValueChange={(value) => handleFormChange('field', value as 'clockIn' | 'clockOut')}
                  >
                    <SelectTrigger className="bg-[rgb(209,250,229)] text-[#2C373B] h-8">
                      <SelectValue placeholder="Select entry type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clockIn">Clock In</SelectItem>
                      <SelectItem value="clockOut">Clock Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Attendance Date */}
                <div className="space-y-2">
                  <Label htmlFor="attendanceDate" className="text-sm font-medium text-gray-700">
                    Attendance Date
                  </Label>
                  <div className="relative">
                    <Input
                      id="attendanceDate"
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleFormChange('date', e.target.value)}
                      className="pr-10 bg-[rgb(209,250,229)] text-[#2C373B]"
                      required
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Corrected Time */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Corrected Time
                </Label>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Hour Selector */}
                  <div className="w-20 sm:w-24">
                    <Select 
                      value={(() => {
                        if (!formData.requestedTime) return '';
                        const hour24 = parseInt(formData.requestedTime.split(':')[0]);
                        if (hour24 === 0) return '12';
                        if (hour24 <= 12) return hour24.toString();
                        return (hour24 - 12).toString();
                      })()} 
                      onValueChange={(value) => {
                        const currentMinute = formData.requestedTime ? formData.requestedTime.split(':')[1] : '00';
                        const currentTime = formData.requestedTime || '09:00';
                        const currentHour24 = parseInt(currentTime.split(':')[0]);
                        const isAM = currentHour24 < 12;
                        
                        let newHour24;
                        if (value === '12') {
                          newHour24 = isAM ? 0 : 12;
                        } else {
                          newHour24 = isAM ? parseInt(value) : parseInt(value) + 12;
                        }
                        
                        const formattedHour = newHour24.toString().padStart(2, '0');
                        handleFormChange('requestedTime', `${formattedHour}:${currentMinute}`);
                      }}
                    >
                      <SelectTrigger className="w-full bg-[rgb(209,250,229)] text-[#2C373B] h-8">
                        <SelectValue placeholder="Hr" />
                      </SelectTrigger>
                      <SelectContent>
                        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hour) => (
                          <SelectItem key={hour} value={hour.toString()}>
                            {hour}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <span className="text-gray-500 font-medium text-lg">:</span>
                  
                  {/* Minute Selector */}
                  <div className="w-20 sm:w-24">
                    <Select 
                      value={formData.requestedTime ? formData.requestedTime.split(':')[1] : ''} 
                      onValueChange={(value) => {
                        const currentHour = formData.requestedTime ? formData.requestedTime.split(':')[0] : '09';
                        handleFormChange('requestedTime', `${currentHour}:${value}`);
                      }}
                    >
                      <SelectTrigger className="w-full bg-[rgb(209,250,229)] text-[#2C373B] h-8">
                        <SelectValue placeholder="Min" />
                      </SelectTrigger>
                      <SelectContent className="max-h-48">
                        {Array.from({ length: 60 }, (_, i) => {
                          const minute = i.toString().padStart(2, '0');
                          return (
                            <SelectItem key={minute} value={minute}>
                              {minute}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* AM/PM Selector */}
                  <div className="w-16 sm:w-20">
                    <Select 
                      value={(() => {
                        if (!formData.requestedTime) return '';
                        const hour24 = parseInt(formData.requestedTime.split(':')[0]);
                        return hour24 < 12 ? 'AM' : 'PM';
                      })()} 
                      onValueChange={(value) => {
                        const currentTime = formData.requestedTime || '09:00';
                        const [hourStr, minute] = currentTime.split(':');
                        const currentHour24 = parseInt(hourStr);
                        const currentHour12 = currentHour24 === 0 ? 12 : currentHour24 > 12 ? currentHour24 - 12 : currentHour24;
                        
                        let newHour24;
                        if (value === 'AM') {
                          newHour24 = currentHour12 === 12 ? 0 : currentHour12;
                        } else {
                          newHour24 = currentHour12 === 12 ? 12 : currentHour12 + 12;
                        }
                        
                        const formattedHour = newHour24.toString().padStart(2, '0');
                        handleFormChange('requestedTime', `${formattedHour}:${minute}`);
                      }}
                    >
                      <SelectTrigger className="w-full bg-[rgb(209,250,229)] text-[#2C373B] h-8">
                        <SelectValue placeholder="AM/PM" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Clock className="h-4 w-4 text-gray-400 ml-1 flex-shrink-0" />
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-sm font-medium text-gray-700">
                  Reason
                </Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => handleFormChange('reason', e.target.value)}
                  placeholder="Please provide a reason for the regularization request..."
                  className="min-h-[100px] resize-none bg-[rgb(209,250,229)] text-[#2C373B]"
                  required
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                  className="bg-[#4CDC9C] border-[#4CDC9C] text-[#2C373B] hover:bg-[#43c58d]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#4CDC9C] hover:bg-[#43c58d] text-[#2C373B] px-8 py-2"
                >
                  {submitting ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Regularization;