import { useState, useEffect } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, ChevronDown, Clock, X } from "lucide-react";
import { getEmployees, Employee as EmployeeType } from "@/api/employees";
import { createRegularizationRequest, CreateRegularizationRequest } from "@/api/regularizations";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const SubmitRegularization = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const storedRole = localStorage.getItem('role');
  if (storedRole === 'superAdmin') {
    return <Navigate to="/dashboard" replace />;
  }

  const isEmployee = ((user?.role || storedRole || '').toLowerCase() === 'employee');

  // Form state
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateRegularizationRequest>({
    date: "",
    field: "clockIn",
    requestedTime: "",
    reason: "",
  });

  // Employee selection
  const [formEmployeeSearch, setFormEmployeeSearch] = useState("");
  const [formEmployees, setFormEmployees] = useState<EmployeeType[]>([]);
  const [formSelectedEmployee, setFormSelectedEmployee] = useState<EmployeeType | null>(null);
  const [showFormEmployeeDropdown, setShowFormEmployeeDropdown] = useState(false);
  const [loadingFormEmployees, setLoadingFormEmployees] = useState(false);

  useEffect(() => {
    if (isEmployee) {
      const state = (location.state as any) || {};
      const id = state.employeeId || (user?._id || (user as any)?.id) || '';
      const fullName = state.employeeName || (user?.name as string) || `${(user as any)?.firstName || ''} ${(user as any)?.lastName || ''}`.trim();
      const [firstName, ...rest] = (fullName || '').split(' ');
      const lastName = rest.join(' ');
      const code = state.employeeCode || (user as any)?.employeeCode || '';

      const selected: EmployeeType = {
        _id: id,
        organizationId: (user as any)?.organizationId || '',
        firstName: firstName || '',
        lastName: lastName || '',
        email: (user as any)?.email || '',
        phone: (user as any)?.phone || '',
        employeeCode: code,
        designation: (user as any)?.designation || '',
        status: (user as any)?.status || 'active',
        loginEnabled: true,
        isActive: true,
        isSystemGenerated: false,
        createdAt: (user as any)?.createdAt || new Date().toISOString(),
        updatedAt: (user as any)?.updatedAt || new Date().toISOString(),
        __v: 0,
        profilePhotoUrl: (user as any)?.profilePhotoUrl || (user as any)?.profileImage || undefined,
      };

      setFormSelectedEmployee(selected);
      setFormEmployeeSearch(`${selected.firstName} ${selected.lastName} (${selected.employeeCode})`);
      setShowFormEmployeeDropdown(false);

      if (state.date) {
        const dateOnly = typeof state.date === 'string' && state.date.includes('T')
          ? state.date.split('T')[0]
          : state.date;
        setFormData((prev) => ({ ...prev, date: dateOnly || '' }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmployee, user, location.state]);

  useEffect(() => {
    if (showFormEmployeeDropdown && !isEmployee) {
      searchFormEmployees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formEmployeeSearch, showFormEmployeeDropdown]);

  const searchFormEmployees = async () => {
    try {
      setLoadingFormEmployees(true);
      const response = await getEmployees({ search: formEmployeeSearch });
      setFormEmployees(response.items || []);
    } catch (error) {
      console.error("Error fetching form employees:", error);
      setFormEmployees([]);
    } finally {
      setLoadingFormEmployees(false);
    }
  };

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".form-employee-search-container")) {
        setShowFormEmployeeDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

      // Combine date and time into ISO string
      const requestedDateTime = new Date(`${formData.date}T${formData.requestedTime}`).toISOString();

      const requestPayload = {
        ...formData,
        employeeId: formSelectedEmployee._id,
        requestedTime: requestedDateTime,
      };

      await createRegularizationRequest(requestPayload as any);

      toast({
        title: "Success",
        description: "Regularization request submitted successfully",
      });

      // Navigate to the regularization list page
      navigate("/regularization", { replace: true });
    } catch (error) {
      console.error("Error submitting regularization request:", error);
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
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden p-6"
      style={{
        background:
          'linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)',
      }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Submit Attendance Regularization</h3>
            <Button
              variant="outline"
              onClick={() => navigate("/regularization")}
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
                          <AvatarImage src={formSelectedEmployee.profilePhotoUrl} alt={`${formSelectedEmployee.firstName} ${formSelectedEmployee.lastName}`} />
                        ) : (
                          <AvatarFallback className="bg-emerald-200 text-emerald-700 text-xs">
                            {formSelectedEmployee.firstName[0]}
                            {formSelectedEmployee.lastName[0]}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="font-medium">
                        {formSelectedEmployee.firstName} {formSelectedEmployee.lastName}
                      </span>
                      <span className="text-emerald-600 text-xs">({formSelectedEmployee.employeeCode})</span>
                      {!isEmployee && (
                        <button type="button" onClick={clearFormEmployee} className="text-emerald-600 hover:text-emerald-800 ml-1">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    isEmployee ? (
                      <span className="text-sm text-[#2C373B]">Selecting your profile...</span>
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
                    )
                  )}
                </div>

                {/* Employee Dropdown */}
                {!isEmployee && showFormEmployeeDropdown && (formEmployees.length > 0 || loadingFormEmployees) && (
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
                              <AvatarImage src={employee.profilePhotoUrl} alt={`${employee.firstName} ${employee.lastName}`} />
                            ) : (
                              <AvatarFallback className="bg-emerald-200 text-emerald-700 text-xs">
                                {employee.firstName[0]}
                                {employee.lastName[0]}
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
                <Select value={formData.field} onValueChange={(value) => handleFormChange("field", value as "clockIn" | "clockOut")}> 
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
                <Label htmlFor="attendanceDate" className="text-sm font-medium text-gray-700">Attendance Date</Label>
                <div className="relative">
                  <Input
                    id="attendanceDate"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleFormChange("date", e.target.value)}
                    className="pr-10 bg-[rgb(209,250,229)] text-[#2C373B]"
                    required
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Corrected Time */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Corrected Time</Label>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Hour Selector */}
                <div className="w-20 sm:w-24">
                  <Select
                    value={(() => {
                      if (!formData.requestedTime) return "";
                      const hour24 = parseInt(formData.requestedTime.split(":")[0]);
                      if (hour24 === 0) return "12";
                      if (hour24 <= 12) return hour24.toString();
                      return (hour24 - 12).toString();
                    })()}
                    onValueChange={(value) => {
                      const currentMinute = formData.requestedTime ? formData.requestedTime.split(":")[1] : "00";
                      const currentTime = formData.requestedTime || "09:00";
                      const currentHour24 = parseInt(currentTime.split(":")[0]);
                      const isAM = currentHour24 < 12;

                      let newHour24;
                      if (value === "12") {
                        newHour24 = isAM ? 0 : 12;
                      } else {
                        newHour24 = isAM ? parseInt(value) : parseInt(value) + 12;
                      }

                      const formattedHour = newHour24.toString().padStart(2, "0");
                      handleFormChange("requestedTime", `${formattedHour}:${currentMinute}`);
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
                    value={formData.requestedTime ? formData.requestedTime.split(":")[1] : ""}
                    onValueChange={(value) => {
                      const currentHour = formData.requestedTime ? formData.requestedTime.split(":")[0] : "09";
                      handleFormChange("requestedTime", `${currentHour}:${value}`);
                    }}
                  >
                    <SelectTrigger className="w-full bg-[rgb(209,250,229)] text-[#2C373B] h-8">
                      <SelectValue placeholder="Min" />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {Array.from({ length: 60 }, (_, i) => {
                        const minute = i.toString().padStart(2, "0");
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
                      if (!formData.requestedTime) return "";
                      const hour24 = parseInt(formData.requestedTime.split(":")[0]);
                      return hour24 < 12 ? "AM" : "PM";
                    })()}
                    onValueChange={(value) => {
                      const currentTime = formData.requestedTime || "09:00";
                      const [hourStr, minute] = currentTime.split(":");
                      const currentHour24 = parseInt(hourStr);
                      const currentHour12 = currentHour24 === 0 ? 12 : currentHour24 > 12 ? currentHour24 - 12 : currentHour24;

                      let newHour24;
                      if (value === "AM") {
                        newHour24 = currentHour12 === 12 ? 0 : currentHour12;
                      } else {
                        newHour24 = currentHour12 === 12 ? 12 : currentHour12 + 12;
                      }

                      const formattedHour = newHour24.toString().padStart(2, "0");
                      handleFormChange("requestedTime", `${formattedHour}:${minute}`);
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
              <Label htmlFor="reason" className="text-sm font-medium text-gray-700">Reason</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => handleFormChange("reason", e.target.value)}
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
                onClick={() => navigate("/regularization")}
                disabled={submitting}
                className="bg-[#4CDC9C] border-[#4CDC9C] text-[#2C373B] hover:bg-[#43c58d]"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#4CDC9C] hover:bg-[#43c58d] text-[#2C373B] px-8 py-2">
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubmitRegularization;