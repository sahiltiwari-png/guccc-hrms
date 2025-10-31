// Reusable filter bar component
const EmployeeFilterBar = ({
  statusFilter,
  setStatusFilter,
  designationFilter,
  setDesignationFilter,
  employeeFilter,
  setEmployeeFilter,
  onClear,
  onAddEmployee,
  total
}: {
  statusFilter: string | null,
  setStatusFilter: (v: string | null) => void,
  designationFilter: string | null,
  setDesignationFilter: (v: string | null) => void,
  employeeFilter: { id: string | null; name: string } | null,
  setEmployeeFilter: (v: { id: string | null; name: string } | null) => void,
  onClear: () => void,
  onAddEmployee: () => void,
  total: number
}) => {
  // Example options, replace with dynamic if needed
  const statusOptions = ["Active", "Inactive"];
  // Provided designations list
  const designations = [
    // Entry Level
    "Intern",
    "Trainee",
    "Associate",
    "Junior Executive",
    "Executive",
    "Coordinator",

    // Mid Level
    "Senior Executive",
    "Specialist",
    "Analyst",
    "Consultant",
    "Assistant Manager",
    "Team Lead",
    "Supervisor",

    // Managerial
    "Manager",
    "Senior Manager",
    "Project Manager",
    "Program Manager",
    "Product Manager",
    "Operations Manager",
    "Delivery Manager",

    // Leadership
    "General Manager",
    "Associate Director",
    "Director",
    "Vice President",
    "Senior Vice President",
    "CEO",
    "CTO",
    "CIO",
    "COO",
    "CFO",
    "CMO",
    "CHRO",
    "CSO",

    // IT / Technical
    "Software Engineer",
    "Senior Software Engineer",
    "Full Stack Developer",
    "Backend Developer",
    "Frontend Developer",
    "Mobile App Developer",
    "DevOps Engineer",
    "Cloud Engineer",
    "QA Engineer",
    "Test Analyst",
    "Automation Tester",
    "UI/UX Designer",
    "System Administrator",
    "Database Administrator",
    "Network Engineer",
    "Security Analyst",
    "Technical Lead",
    "Solution Architect",
    "Technical Project Manager",
    "Engineering Manager",
    "VP Engineering",

    // Sales
    "Sales Executive",
    "Business Development Executive",
    "Business Development Manager",
    "Inside Sales Executive",
    "Sales Consultant",
    "Relationship Manager",
    "Key Account Manager",
    "Territory Sales Manager",
    "Regional Sales Manager",
    "National Sales Manager",
    "Head of Sales",
    "Vice President Sales",
    "Chief Sales Officer",

    // Marketing
    "Marketing Executive",
    "Digital Marketing Executive",
    "SEO Specialist",
    "PPC Specialist",
    "Content Writer",
    "Copywriter",
    "Social Media Executive",
    "Brand Executive",
    "Marketing Analyst",
    "Marketing Manager",
    "Product Marketing Manager",
    "Campaign Manager",
    "Growth Manager",
    "Regional Marketing Manager",
    "Head of Marketing",
    "Vice President Marketing",
    "Chief Marketing Officer",

    // HR & Admin
    "HR Executive",
    "HR Generalist",
    "Recruiter",
    "Talent Acquisition Specialist",
    "HR Manager",
    "HR Business Partner",
    "Training & Development Manager",
    "Payroll Specialist",
    "Admin Executive",
    "Office Manager",

    // Finance & Accounts
    "Accounts Executive",
    "Junior Accountant",
    "Senior Accountant",
    "Finance Analyst",
    "Accounts Manager",
    "Finance Manager",
    "Internal Auditor",
    "Financial Controller",

    // Operations / Support
    "Operations Executive",
    "Operations Manager",
    "Process Specialist",
    "Customer Support Executive",
    "Client Service Manager",
    "Technical Support Engineer",
    "Service Delivery Manager"
  ];
  const [designationOpen, setDesignationOpen] = useState(false);
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeResults, setEmployeeResults] = useState<any[]>([]);
  const searchEmployees = async (query: string) => {
    try {
      setEmployeeLoading(true);
      const res = await getEmployees({ page: 1, limit: 10, search: query });
      setEmployeeResults(res.items || res.data || []);
      setEmployeeOpen(true);
    } catch (e) {
      setEmployeeResults([]);
    } finally {
      setEmployeeLoading(false);
    }
  };
  return (
    <div className="flex flex-col md:flex-row md:flex-nowrap md:items-center md:justify-between gap-3 mb-4 w-full pb-2 rounded-lg p-3 bg-white">
      <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
        <span className="font-semibold text-[#2C373B]">Total Employees - {total}</span>
        <select
          className="rounded-lg border border-gray-300 h-8 px-2 bg-[#E1F9EF] text-[#2C373B] focus:outline-none focus:ring-2 focus:ring-gray-300 min-w-[100px]"
          value={statusFilter || ""}
          onChange={e => setStatusFilter(e.target.value === "" ? null : e.target.value)}
        >
          <option value="">Status</option>
          {statusOptions.map(opt => {
            const value = opt.toLowerCase();
            return <option key={opt} value={value}>{opt}</option>;
          })}
        </select>
        {/* Searchable Designation Dropdown */}
        <Popover open={designationOpen} onOpenChange={setDesignationOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-expanded={designationOpen}
            className="rounded-lg border border-gray-300 h-8 px-2 bg-[#E1F9EF] text-[#2C373B] focus:outline-none focus:ring-2 focus:ring-gray-300 min-w-[150px] inline-flex items-center justify-between"
          >
              <span className="truncate">{designationFilter || "Designation"}</span>
              <ChevronDown className="ml-2 h-4 w-4 opacity-60" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[220px]">
            <Command>
              <CommandInput placeholder="Search designation..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {designations.map((d) => (
                    <CommandItem
                      key={d}
                      value={d}
                      onSelect={(value) => {
                        setDesignationFilter(value === "" ? null : value);
                        setDesignationOpen(false);
                      }}
                    >
                      {d}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {/* Employee Dropdown Filter */}
        <Popover open={employeeOpen} onOpenChange={(open) => { 
          setEmployeeOpen(open); 
          if (open) { 
            // Fetch initial employees list when opening dropdown
            searchEmployees(employeeQuery || ""); 
          }
        }}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-expanded={employeeOpen}
              className="rounded-lg border border-gray-300 h-8 px-2 bg-[#E1F9EF] text-[#2C373B] focus:outline-none focus:ring-2 focus:ring-gray-300 min-w-[160px] inline-flex items-center justify-between"
            >
              <span className="truncate">{employeeFilter?.name || "Employee"}</span>
              <ChevronDown className="ml-2 h-4 w-4 opacity-60" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[240px]" align="start">
            <Command>
              <CommandInput
                placeholder="Search employee by name/code..."
                value={employeeQuery}
                onValueChange={(val: string) => {
                  setEmployeeQuery(val);
                  if (val && val.length > 0) {
                    searchEmployees(val);
                  }
                }}
              />
              <CommandList className="max-h-64 overflow-auto">
                <CommandEmpty>{employeeLoading ? "Loading..." : "No employees found."}</CommandEmpty>
                <CommandGroup heading="Employees">
                  {employeeResults.map((emp) => (
                    <CommandItem
                      key={emp._id}
                      value={`${emp.firstName || ''} ${emp.lastName || ''}`.trim()}
                      onSelect={() => {
                        setEmployeeFilter({ id: emp._id, name: `${emp.firstName || ''} ${emp.lastName || ''} (${emp.employeeCode || ''})`.trim() });
                        setEmployeeOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate">{`${emp.firstName || ''} ${emp.lastName || ''}`.trim()}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{emp.employeeCode || '-'}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <button
          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-transparent bg-transparent text-[#2C373B] text-sm transition shadow-none hover:bg-transparent"
          onClick={onClear}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          Clear Filters
        </button>
      </div>
      <div className="flex-shrink-0">
        <button
          className="bg-[#4CDC9C] hover:bg-[#3fd190] text-[#2C373B] font-semibold text-sm px-3 h-8 rounded-lg transition inline-flex items-center gap-2"
          onClick={onAddEmployee}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14"/></svg>
          Add Employee
        </button>
      </div>
    </div>
  );
};
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Phone, MapPin, MoreVertical, ChevronDown } from "lucide-react";
import { Eye, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { getEmployees, getEmployeeById } from "@/api/employees";
import { uploadFile } from "@/api/uploadFile";
import { useRef } from "react";
import API from "@/api/auth";



interface EmployeeListProps {
  searchTerm: string;
}

interface Employee {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  employeeCode?: string;
  designation?: string;
  status?: string;
  createdAt?: string;
  dateOfJoining?: string;
  probationEndDate?: string;
  profilePhotoUrl?: string;
  departmentCode?: string;
}



const EmployeeList = ({ searchTerm }: EmployeeListProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [designationFilter, setDesignationFilter] = useState<string | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState<{ id: string | null; name: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  // Roles dropdown state for edit modal
  const [roles, setRoles] = useState<any[]>([]);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  // Supported employee document types
  const DOCUMENT_TYPES = [
    'aadhaar',
    'pan',
    'passport',
    'driving-license',
    'voter-id',
    'other',
  ];
  // Designation dropdown state in edit modal
  const [designationOpen, setDesignationOpen] = useState(false);
  // Reporting manager dropdown state in edit modal
  const [rmOpen, setRmOpen] = useState(false);
  const [rmLoading, setRmLoading] = useState(false);
  const [rmList, setRmList] = useState<any[]>([]);
  const [selectedRM, setSelectedRM] = useState<any>(null);
  const employmentTypeOptions = [
    { value: "full-time", label: "Full-time" },
    { value: "part-time", label: "Part-time" },
    { value: "contract", label: "Contract" },
    { value: "intern", label: "Intern" },
    { value: "consultant", label: "Consultant" }
  ];
  // Provided designations list for searchable dropdown
  const DESIGNATIONS = [
    "Intern","Trainee","Associate","Junior Executive","Executive","Coordinator",
    "Senior Executive","Specialist","Analyst","Consultant","Assistant Manager","Team Lead","Supervisor",
    "Manager","Senior Manager","Project Manager","Program Manager","Product Manager","Operations Manager","Delivery Manager",
    "General Manager","Associate Director","Director","Vice President","Senior Vice President","CEO","CTO","CIO","COO","CFO","CMO","CHRO","CSO",
    "Software Engineer","Senior Software Engineer","Full Stack Developer","Backend Developer","Frontend Developer","Mobile App Developer","DevOps Engineer","Cloud Engineer","QA Engineer","Test Analyst","Automation Tester","UI/UX Designer","System Administrator","Database Administrator","Network Engineer","Security Analyst","Technical Lead","Solution Architect","Technical Project Manager","Engineering Manager","VP Engineering",
    "Sales Executive","Business Development Executive","Business Development Manager","Inside Sales Executive","Sales Consultant","Relationship Manager","Key Account Manager","Territory Sales Manager","Regional Sales Manager","National Sales Manager","Head of Sales","Vice President Sales","Chief Sales Officer",
    "Marketing Executive","Digital Marketing Executive","SEO Specialist","PPC Specialist","Content Writer","Copywriter","Social Media Executive","Brand Executive","Marketing Analyst","Marketing Manager","Product Marketing Manager","Campaign Manager","Growth Manager","Regional Marketing Manager","Head of Marketing","Vice President Marketing","Chief Marketing Officer",
    "HR Executive","HR Generalist","Recruiter","Talent Acquisition Specialist","HR Manager","HR Business Partner","Training & Development Manager","Payroll Specialist","Admin Executive","Office Manager",
    "Accounts Executive","Junior Accountant","Senior Accountant","Finance Analyst","Accounts Manager","Finance Manager","Internal Auditor","Financial Controller",
    "Operations Executive","Operations Manager","Process Specialist","Customer Support Executive","Client Service Manager","Technical Support Engineer","Service Delivery Manager"
  ];

  const navigate = useNavigate();

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        // Assume getEmployees accepts params for page, limit, status, designation, search
        const data = await getEmployees({
          page,
          limit: 10,
          status: statusFilter ? statusFilter.toLowerCase() : statusFilter,
          designation: designationFilter,
          search: searchTerm,
          employeeId: employeeFilter?.id || undefined
        });
        const items = Array.isArray((data as any)?.items)
          ? (data as any).items
          : Array.isArray((data as any)?.data)
          ? (data as any).data
          : Array.isArray(data as any)
          ? (data as any)
          : (data as any)?._id
          ? [data as any]
          : [];
        setEmployees(items);
        const computedTotal = typeof (data as any)?.total === 'number'
          ? (data as any).total
          : typeof (data as any)?.count === 'number'
          ? (data as any).count
          : items.length;
        setTotal(computedTotal);
        const computedTotalPages = typeof (data as any)?.totalPages === 'number'
          ? (data as any).totalPages
          : Math.max(1, Math.ceil(computedTotal / 10));
        setTotalPages(computedTotalPages);
      } catch (err) {
        setEmployees([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [page, statusFilter, designationFilter, employeeFilter?.id, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, designationFilter, employeeFilter?.id]);

  const handleStatusChange = (id: string, newStatus: string) => {
    setEmployees((prev) => prev.map(emp => emp._id === id ? { ...emp, status: newStatus } : emp));
    // TODO: Call API to update status if needed
  };

  const clearFilters = () => {
    setStatusFilter(null);
    setDesignationFilter(null);
    setEmployeeFilter(null);
  };

  return (
    <Card className="shadow-md rounded-xl">
      <CardContent>
        <EmployeeFilterBar
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          designationFilter={designationFilter}
          setDesignationFilter={setDesignationFilter}
          employeeFilter={employeeFilter}
          setEmployeeFilter={setEmployeeFilter}
          onClear={clearFilters}
          onAddEmployee={() => navigate('/add-employee')}
          total={total}
        />
        <div className="rounded-lg border bg-white overflow-x-auto max-h-[500px] overflow-y-auto mx-auto" style={{ width: '100%', maxWidth: '1200px', minWidth: '0', touchAction: 'pan-y' }}>
          <table className="w-full border-separate border-spacing-0" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', tableLayout: 'auto' }}>
            <colgroup>
              <col style={{ width: '16%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead className="text-[#FFFFFF]">
              <tr className="bg-[#2C373B]" style={{ borderBottom: '0.76px solid #2C373B' }}>
                <th className="px-1 py-1 text-left rounded-tl-lg" style={{fontSize: '12px', fontWeight: 600}}>Name</th>
                <th className="px-1 py-1 text-left" style={{fontSize: '12px', fontWeight: 600}}>Code</th>
                <th className="px-1 py-1 text-left" style={{fontSize: '12px', fontWeight: 600}}>Designation</th>
                <th className="px-1 py-1 text-left" style={{fontSize: '12px', fontWeight: 600}}>Joining</th>
                <th className="px-1 py-1 text-left" style={{fontSize: '12px', fontWeight: 600}}>Probation</th>
                <th className="px-1 py-1 text-left" style={{fontSize: '12px', fontWeight: 600}}>Email</th>
                <th className="px-1 py-1 text-left" style={{fontSize: '12px', fontWeight: 600}}>Status</th>
                <th className="px-1 py-1 text-left rounded-tr-lg" style={{fontSize: '12px', fontWeight: 600}}>Actions</th>
              </tr>
            </thead>
            <tbody className="text-[#2C373B]" style={{fontSize: '14px', fontWeight: 500}}>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8">Loading...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No employees found.</td></tr>
              ) : (
                employees.map((emp) => (
                  <tr
                    key={emp._id}
                    className="border-b last:border-b-0 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={async () => {
                      setSelectedEmployee(emp);
                      setModalOpen(true);
                      setLoadingDetails(true);
                      setEditMode(false);
                      setUpdateMessage(null);
                      try {
                        const details = await getEmployeeById(emp._id);
                        setEmployeeDetails(details);
                        setFormData(details);
                        // Normalize reporting manager if API returns object
                        if (details?.reportingManagerId && typeof details.reportingManagerId === 'object') {
                          const rmObj: any = details.reportingManagerId;
                          const rmName = `${rmObj?.firstName || ''} ${rmObj?.lastName || ''}`.trim();
                          setEmployeeDetails((prev: any) => ({ ...prev, reportingManagerName: rmName, reportingManagerCode: rmObj?.employeeCode || '' }));
                          setFormData((fd: any) => ({ ...fd, reportingManagerId: rmObj?._id, reportingManagerName: rmName, reportingManagerCode: rmObj?.employeeCode || '' }));
                        }
                      } catch (e) {
                        setEmployeeDetails(null);
                      } finally {
                        setLoadingDetails(false);
                      }
                    }}
                  >
                    <td className="px-1 py-1 max-w-xs truncate align-middle">
                      <div className="flex flex-row items-center gap-1 w-full">
                        <Avatar className="h-8 w-8">
                          {emp.profilePhotoUrl ? (
                            <AvatarImage src={emp.profilePhotoUrl} alt={emp.firstName + ' ' + emp.lastName} />
                          ) : (
                            <AvatarFallback>{emp.firstName?.[0] || ''}{emp.lastName?.[0] || ''}</AvatarFallback>
                          )}
                        </Avatar>
                        <div className="truncate flex items-center gap-1">
                          <span className="font-medium text-[#2C373B] leading-tight text-[14px] truncate">{emp.firstName} {emp.lastName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-1 py-1 max-w-xs truncate align-middle">{emp.employeeCode || '-'}</td>
                    <td className="px-1 py-1 max-w-xs truncate align-middle">{emp.designation || '-'}</td>
                    <td className="px-1 py-1 max-w-xs truncate align-middle">{emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString() : (emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : '-')}</td>
                    <td className="px-1 py-1 max-w-xs truncate align-middle">{emp.probationEndDate ? new Date(emp.probationEndDate).toLocaleDateString() : '-'}</td>
                    <td className="px-1 py-1 align-middle">
                      {emp.email ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="truncate max-w-[180px] cursor-help" title={emp.email}>
                              {emp.email}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {emp.email}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        '-' 
                      )}
                    </td>
                    <td className="px-1 py-1 align-middle">
                      <span
                        className={emp.status === 'active'
                          ? 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200'
                          : 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200'}
                      >
                        {emp.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          className="bg-[#E2E9F0] text-[#2C373B] hover:bg-[#d6dde6]"
                          title="View details"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setSelectedEmployee(emp);
                            setModalOpen(true);
                            setLoadingDetails(true);
                            setEditMode(false);
                            setUpdateMessage(null);
                          try {
                            const details = await getEmployeeById(emp._id);
                            setEmployeeDetails(details);
                            setFormData(details);
                            // Normalize reporting manager if API returns object
                            if (details?.reportingManagerId && typeof details.reportingManagerId === 'object') {
                              const rmObj: any = details.reportingManagerId;
                              const rmName = `${rmObj?.firstName || ''} ${rmObj?.lastName || ''}`.trim();
                              setEmployeeDetails((prev: any) => ({ ...prev, reportingManagerName: rmName, reportingManagerCode: rmObj?.employeeCode || '' }));
                              setFormData((fd: any) => ({ ...fd, reportingManagerId: rmObj?._id, reportingManagerName: rmName, reportingManagerCode: rmObj?.employeeCode || '' }));
                            }
                          } catch (e) {
                            setEmployeeDetails(null);
                          } finally {
                            setLoadingDetails(false);
                          }
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          className="bg-[#E2E9F0] text-[#2C373B] hover:bg-[#d6dde6]"
                          title="Edit details"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setSelectedEmployee(emp);
                            setModalOpen(true);
                            setLoadingDetails(true);
                            setEditMode(true);
                            setUpdateMessage(null);
                            try {
                              const details = await getEmployeeById(emp._id);
                              setEmployeeDetails(details);
                              setFormData(details);
                              // Normalize reporting manager if API returns object
                              if (details?.reportingManagerId && typeof details.reportingManagerId === 'object') {
                                const rmObj: any = details.reportingManagerId;
                                const rmName = `${rmObj?.firstName || ''} ${rmObj?.lastName || ''}`.trim();
                                setSelectedRM(rmObj);
                                setEmployeeDetails((prev: any) => ({ ...prev, reportingManagerName: rmName, reportingManagerCode: rmObj?.employeeCode || '' }));
                                setFormData((fd: any) => ({ ...fd, reportingManagerId: rmObj?._id, reportingManagerName: rmName, reportingManagerCode: rmObj?.employeeCode || '' }));
                              } else if (details?.reportingManagerName) {
                                // Keep existing name if provided by API
                                setEmployeeDetails((prev: any) => ({ ...prev, reportingManagerName: details.reportingManagerName }));
                              }
                            } catch (e) {
                              setEmployeeDetails(null);
                            } finally {
                              setLoadingDetails(false);
                            }
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Employee Details Modal (UI only, no API yet) */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <DialogHeader className="mb-2 pb-2 border-b">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20">
                  <img
                    src={profilePreview || employeeDetails?.profilePhotoUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent((employeeDetails?.firstName || '') + ' ' + (employeeDetails?.lastName || ''))}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border shadow"
                  />
                  {editMode && (
                    <button
                      type="button"
                      className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1 shadow hover:bg-blue-700"
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload Photo"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5v-6m0 0V7.5m0 3h3m-3 0H9m12 6.75A2.25 2.25 0 0 1 18.75 21H5.25A2.25 2.25 0 0 1 3 18.75V7.5A2.25 2.25 0 0 1 5.25 5.25h3.379a2.25 2.25 0 0 0 1.591-.659l1.5-1.5a2.25 2.25 0 0 1 3.18 0l1.5 1.5a2.25 2.25 0 0 0 1.591.659h3.379A2.25 2.25 0 0 1 21 7.5v11.25Z" />
                      </svg>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = ev => setProfilePreview(ev.target?.result as string);
                            reader.readAsDataURL(file);
                            // Upload immediately and set URL
                            try {
                              const url = await uploadFile(file);
                              setFormData((fd: any) => ({ ...fd, profilePhotoUrl: url }));
                            } catch {
                              // Optionally show error
                            }
                          }
                        }}
                      />
                    </button>
                  )}
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-black tracking-tight mb-1">{employeeDetails?.firstName} {employeeDetails?.lastName}</DialogTitle>
                  <div className="text-gray-500 text-xs">{employeeDetails?.designation || ''} {employeeDetails?.department ? `| ${employeeDetails.department}` : ''}</div>
                  {employeeDetails?.employeeCode && (
                    <div className="text-gray-600 text-xs mt-1">
                      <span className="font-medium">Employee Code:</span> {employeeDetails.employeeCode}
                    </div>
                  )}
                  <div className="text-gray-400 text-xs mt-1">{employeeDetails?.email}</div>
                  {(() => {
                    const primaryRoleName = (
                      (employeeDetails?.role && (typeof employeeDetails.role === 'string' ? employeeDetails.role : employeeDetails.role?.name)) ||
                      (Array.isArray(employeeDetails?.roles) && employeeDetails.roles.length > 0 && (typeof employeeDetails.roles[0] === 'string' ? employeeDetails.roles[0] : employeeDetails.roles[0]?.name))
                    );
                    return primaryRoleName ? (
                      <div className="mt-2 flex flex-wrap gap-1 items-center">
                        <span className="text-xs text-gray-500 mr-1">Role:</span>
                        <Badge className="text-[#2C373B] bg-[rgb(209,250,229)] border border-emerald-200 px-2 py-0.5">
                          {String(primaryRoleName)}
                        </Badge>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            </DialogHeader>
            {selectedEmployee && (
              <div className="space-y-4 text-sm p-2 md:p-4 bg-white">
                {loadingDetails ? (
                  <div>Loading...</div>
                ) : employeeDetails ? (
                  <form className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                    {/* Role Field */}
                    <div className="flex flex-col mb-2">
                      <label className="font-semibold capitalize mb-1" style={{color: '#2C373B'}}>Role</label>
                      {editMode ? (
                        <Popover
                          open={rolesOpen}
                          onOpenChange={async (open) => {
                            setRolesOpen(open);
                            if (open) {
                              setRolesLoading(true);
                              try {
                                const res = await API.get('/roles');
                                const list = res?.data?.roles || [];
                                setRoles(Array.isArray(list) ? list : []);
                              } catch (e) {
                                // silently fail
                              } finally {
                                setRolesLoading(false);
                              }
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="border border-emerald-300 rounded px-2 py-1 bg-[rgb(209,250,229)] text-[#2C373B] text-left hover:bg-emerald-100"
                            >
                              {selectedRole?.name || (
                                (employeeDetails?.role && (typeof employeeDetails.role === 'string' ? employeeDetails.role : employeeDetails.role?.name)) ||
                                (Array.isArray(employeeDetails?.roles) && employeeDetails.roles.length > 0 && (typeof employeeDetails.roles[0] === 'string' ? employeeDetails.roles[0] : employeeDetails.roles[0]?.name)) ||
                                'Select role'
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 w-64" align="start">
                            <Command>
                              <CommandInput placeholder="Search roles..." />
                              <CommandList className="max-h-64 overflow-auto">
                                <CommandEmpty>No roles found.</CommandEmpty>
                                <CommandGroup heading="Roles">
                                  {rolesLoading ? (
                                    <div className="p-2 text-sm text-gray-500">Loading...</div>
                                  ) : (
                                    roles.map((r: any) => (
                                      <CommandItem
                                        key={r._id}
                                        value={r.name}
                                        onSelect={async () => {
                                          setSelectedRole(r);
                                          setRolesOpen(false);
                                          try {
                                            const userId = selectedEmployee?._id || employeeDetails?._id;
                                            await API.post('/auth/assign-role', { userId, roleId: r._id, isDefault: true });
                                            setUpdateMessage('Role updated successfully');
                                            // reflect change locally
                                            setEmployeeDetails((prev: any) => ({ ...prev, role: { _id: r._id, name: r.name } }));
                                            setFormData((fd: any) => ({ ...fd, role: r.name }));
                                          } catch (e) {
                                            setUpdateMessage('Failed to update role');
                                          }
                                        }}
                                      >
                                        {r.name}
                                      </CommandItem>
                                    ))
                                  )}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        (() => {
                          const primaryRoleName = (
                            (employeeDetails?.role && (typeof employeeDetails.role === 'string' ? employeeDetails.role : employeeDetails.role?.name)) ||
                            (Array.isArray(employeeDetails?.roles) && employeeDetails.roles.length > 0 && (typeof employeeDetails.roles[0] === 'string' ? employeeDetails.roles[0] : employeeDetails.roles[0]?.name))
                          );
                          return (
                            <span className="rounded px-2 py-1 border border-emerald-200 bg-[rgb(209,250,229)] text-[#2C373B]">
                              {primaryRoleName || '-'}
                            </span>
                          );
                        })()
                      )}
                    </div>
                    {/* Designation Field with searchable dropdown when cleared */}
                    <div className="flex flex-col mb-2">
                      <label className="font-semibold capitalize mb-1" style={{color: '#2C373B'}}>Designation</label>
                      {editMode ? (
                        <Popover open={designationOpen} onOpenChange={setDesignationOpen}>
                          <PopoverTrigger asChild>
                            <input
                              className="border border-emerald-300 rounded px-2 py-1 bg-[rgb(209,250,229)] text-[#2C373B] focus:outline-none focus:ring-2 focus:ring-emerald-200 transition"
                              type="text"
                              value={formData.designation || ''}
                              onChange={e => {
                                const val = e.target.value || '';
                                setFormData((fd: any) => ({ ...fd, designation: val }));
                                if (val.trim() === '') {
                                  setDesignationOpen(true);
                                }
                              }}
                              placeholder="Type or clear to search"
                            />
                          </PopoverTrigger>
                          <PopoverContent className="p-0 w-64" align="start">
                            <Command>
                              <CommandInput placeholder="Search designation..." />
                              <CommandList className="max-h-64 overflow-auto">
                                <CommandEmpty>No results found.</CommandEmpty>
                                <CommandGroup heading="Designations">
                                  {DESIGNATIONS.map((d) => (
                                    <CommandItem
                                      key={d}
                                      value={d}
                                      onSelect={() => {
                                        setFormData((fd: any) => ({ ...fd, designation: d }));
                                        setDesignationOpen(false);
                                      }}
                                    >
                                      {d}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className="rounded px-2 py-1 border border-emerald-200 bg-[rgb(209,250,229)] text-[#2C373B]">{employeeDetails?.designation || '-'}</span>
                      )}
                    </div>
                    {/* Employment Type dropdown in edit mode */}
                    <div className="flex flex-col mb-2">
                      <label className="font-semibold capitalize mb-1" style={{color: '#2C373B'}}>Employment Type</label>
                      {editMode ? (
                        <select
                          className="border border-emerald-300 rounded px-2 py-1 bg-[rgb(209,250,229)] text-[#2C373B] focus:outline-none focus:ring-2 focus:ring-emerald-200 transition"
                          value={formData.employmentType || ''}
                          onChange={e => setFormData((fd: any) => ({ ...fd, employmentType: e.target.value }))}
                        >
                          <option value="">Select Employment Type</option>
                          {employmentTypeOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="rounded px-2 py-1 border border-emerald-200 bg-[rgb(209,250,229)] text-[#2C373B]">{employeeDetails?.employmentType || '-'}</span>
                      )}
                    </div>
                    {/* Reporting Manager dropdown shows names, stores IDs */}
                    <div className="flex flex-col mb-2">
                      <label className="font-semibold capitalize mb-1" style={{color: '#2C373B'}}>Reporting Manager</label>
                      {editMode ? (
                        <Popover
                          open={rmOpen}
                          onOpenChange={async (open) => {
                            setRmOpen(open);
                            if (open && rmList.length === 0) {
                              setRmLoading(true);
                              try {
                                const data = await getEmployees({ page: 1, limit: 50 });
                                const items = Array.isArray(data.items) ? data.items : [];
                                setRmList(items);
                              } catch (e) {
                                setRmList([]);
                              } finally {
                                setRmLoading(false);
                              }
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="border border-emerald-300 rounded px-2 py-1 bg-[rgb(209,250,229)] text-[#2C373B] text-left hover:bg-emerald-100"
                            >
                              {selectedRM?.firstName ? `${selectedRM.firstName} ${selectedRM.lastName || ''}`.trim() : (employeeDetails?.reportingManagerName || 'Select manager')}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 w-64" align="start">
                            <Command>
                              <CommandInput placeholder="Search employees..." />
                              <CommandList className="max-h-64 overflow-auto">
                                <CommandEmpty>No employees found.</CommandEmpty>
                                <CommandGroup heading="Employees">
                                  {rmLoading ? (
                                    <div className="p-2 text-sm text-gray-500">Loading...</div>
                                  ) : (
                                    rmList.map((u: any) => (
                                      <CommandItem
                                        key={u._id}
                                        value={`${u.firstName || ''} ${u.lastName || ''}`.trim()}
                                        onSelect={() => {
                                          setSelectedRM(u);
                                          setRmOpen(false);
                                          setFormData((fd: any) => ({ ...fd, reportingManagerId: u._id, reportingManagerName: `${u.firstName || ''} ${u.lastName || ''}`.trim() }));
                                        }}
                                      >
                                        {(u.firstName || '') + ' ' + (u.lastName || '')}
                                      </CommandItem>
                                    ))
                                  )}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className="rounded px-2 py-1 border border-emerald-200 bg-[rgb(209,250,229)] text-[#2C373B]">{
                          (() => {
                            const rmName = employeeDetails?.reportingManagerName;
                            const rmCode = employeeDetails?.reportingManagerCode;
                            if (rmName && rmCode) return `${rmName} (${rmCode})`;
                            if (rmName) return rmName;
                            const rmId = employeeDetails?.reportingManagerId as any;
                            if (rmId && typeof rmId === 'object') {
                              const name = `${rmId?.firstName || ''} ${rmId?.lastName || ''}`.trim();
                              return rmId?.employeeCode ? `${name} (${rmId.employeeCode})` : (name || '-');
                            }
                            return '-';
                          })()
                        }</span>
                      )}
                      {/* Selected manager tag */}
                      {editMode && formData.reportingManagerName && (
                        <div className="mt-1">
                          <Badge className="text-[#2C373B] bg-[rgb(209,250,229)] border border-emerald-200 px-2 py-0.5">
                            {formData.reportingManagerName}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {[
                      "firstName","lastName","phone","department","departmentCode","employeeCode","dateOfJoining","probationEndDate","status","dob","gender","bloodGroup","maritalStatus","nationality","addressLine1","addressLine2","country","state","city","zipCode","aadhaarNo","panNo","passportNo","loginEnabled","isActive",
                    ].map((key) => {
                      const value = employeeDetails[key];
                      if (typeof value === "object" && value !== null) return null;
                      // Hide specific fields in view mode as requested
                      if (!editMode && (key === 'grade' || key === 'shiftId' || key === 'camsEmployeeId')) return null;
                      // Hide specific fields in edit mode as requested
                      if (editMode && (key === 'camsEmployeeId' || key === 'benefits' || key === 'salaryStructureId' || key === 'shiftId' || key === 'grade')) return null;
                      // Show employeeCode in both modes; read-only in edit mode
                      if (key === 'employeeCode') {
                        return (
                          <div key={key} className="flex flex-col mb-2">
                            <label className="font-semibold capitalize mb-1" style={{color: '#2C373B'}}>Employee Code</label>
                            {editMode ? (
                              <input
                                className="border border-emerald-300 rounded px-2 py-1 bg-[rgb(209,250,229)] text-[#2C373B] focus:outline-none focus:ring-2 focus:ring-emerald-200 transition"
                                type="text"
                                value={formData.employeeCode || ''}
                                disabled
                              />
                            ) : (
                              <span className="rounded px-2 py-1 border border-emerald-200 bg-[rgb(209,250,229)] text-[#2C373B]">
                                {employeeDetails?.employeeCode || '-'}
                              </span>
                            )}
                          </div>
                        );
                      }
                      // Render checkboxes for boolean fields
                      const isBooleanField = key === 'loginEnabled' || key === 'isActive';
                      if (isBooleanField) {
                        const checkedView = !!value;
                        const checkedEdit = !!formData[key];
                        return (
                          <div key={key} className="flex items-center justify-between mb-2">
                            <label className="font-semibold capitalize" style={{color: '#2C373B'}}>{key.replace(/([A-Z])/g, ' $1')}</label>
                            {editMode ? (
                              <Checkbox
                                checked={checkedEdit}
                                onCheckedChange={(checked) => setFormData((fd: any) => ({ ...fd, [key]: !!checked }))}
                                className="h-5 w-5 data-[state=checked]:bg-[#4CDC9C] data-[state=checked]:text-[#2C373B] border-emerald-300"
                                aria-label={key}
                              />
                            ) : (
                              <Checkbox
                                checked={checkedView}
                                disabled
                                className="h-5 w-5 data-[state=checked]:bg-[#4CDC9C] data-[state=checked]:text-[#2C373B] border-emerald-300"
                                aria-label={key}
                              />
                            )}
                          </div>
                        );
                      }
                      let inputType = "text";
                      if (["dateOfJoining", "probationEndDate", "dob"].includes(key)) inputType = "date";
                      let inputValue = formData[key] || '';
                      if (inputType === "date" && inputValue) {
                        inputValue = inputValue.slice(0, 10); // yyyy-mm-dd
                      }
                      return (
                        <div key={key} className="flex flex-col mb-2">
                          <label className="font-semibold capitalize mb-1" style={{color: '#2C373B'}}>{key.replace(/([A-Z])/g, ' $1')}</label>
                          {editMode ? (
                            <input
                              className="border border-emerald-300 rounded px-2 py-1 bg-[rgb(209,250,229)] text-[#2C373B] focus:outline-none focus:ring-2 focus:ring-emerald-200 transition"
                              type={inputType}
                              value={inputValue}
                              onChange={e => setFormData((fd: any) => ({ ...fd, [key]: e.target.value }))}
                            />
                          ) : (
                            <span className="rounded px-2 py-1 border border-emerald-200 bg-[rgb(209,250,229)] text-[#2C373B]">{inputType === 'date' && value ? new Date(value).toLocaleDateString() : (value !== undefined && value !== null && value !== '' ? value.toString() : '-')}</span>
                          )}
                        </div>
                      );
                    })}
                    {/* Bank Details */}
                    {employeeDetails.bankDetails && Object.entries(employeeDetails.bankDetails).map(([k, v]) => (
                      <div key={"bankDetails" + k} className="flex flex-col">
                        <label className="font-semibold capitalize" style={{color: '#2C373B'}}>Bank {k.replace(/([A-Z])/g, ' $1')}</label>
                        {editMode ? (
                          <input className="border border-emerald-300 rounded px-2 py-1 bg-[rgb(209,250,229)] text-[#2C373B]" value={formData.bankDetails?.[k] || ''} onChange={e => setFormData((fd: any) => ({ ...fd, bankDetails: { ...fd.bankDetails, [k]: e.target.value } }))} />
                        ) : (
                          <span className="rounded px-2 py-1 border border-emerald-200 bg-[rgb(209,250,229)] text-[#2C373B]">{v || '-'}</span>
                        )}
                      </div>
                    ))}
                    {/* Tax Details */}
                    {employeeDetails.taxDetails && Object.entries(employeeDetails.taxDetails).map(([k, v]) => (
                      <div key={"taxDetails" + k} className="flex flex-col">
                        <label className="font-semibold capitalize" style={{color: '#2C373B'}}>Tax {k.replace(/([A-Z])/g, ' $1')}</label>
                        {editMode ? (
                          <input className="border border-emerald-300 rounded px-2 py-1 bg-[rgb(209,250,229)] text-[#2C373B]" value={formData.taxDetails?.[k] || ''} onChange={e => setFormData((fd: any) => ({ ...fd, taxDetails: { ...fd.taxDetails, [k]: e.target.value } }))} />
                        ) : (
                          <span className="rounded px-2 py-1 border border-emerald-200 bg-[rgb(209,250,229)] text-[#2C373B]">{v || '-'}</span>
                        )}
                      </div>
                    ))}
                    {/* Emergency Contact */}
                    {employeeDetails.emergencyContact && Object.entries(employeeDetails.emergencyContact).map(([k, v]) => (
                      <div key={"emergencyContact" + k} className="flex flex-col">
                        <label className="font-semibold capitalize" style={{color: '#2C373B'}}>Emergency {k.replace(/([A-Z])/g, ' $1')}</label>
                        {editMode ? (
                          <input className="border border-emerald-300 rounded px-2 py-1 bg-[rgb(209,250,229)] text-[#2C373B]" value={formData.emergencyContact?.[k] || ''} onChange={e => setFormData((fd: any) => ({ ...fd, emergencyContact: { ...fd.emergencyContact, [k]: e.target.value } }))} />
                        ) : (
                          <span className="rounded px-2 py-1 border border-emerald-200 bg-[rgb(209,250,229)] text-[#2C373B]">{v || '-'}</span>
                        )}
                      </div>
                    ))}
                    {/* Documents */}
                    <div className="mt-3">
                      <div className="font-semibold mb-2" style={{color:'#2C373B'}}>Documents</div>
                      {editMode ? (
                        DOCUMENT_TYPES.map((type) => {
                          const existing = (
                            Array.isArray(formData.documents)
                              ? formData.documents
                              : (Array.isArray(employeeDetails?.documents) ? employeeDetails.documents : [])
                          ).find((d: any) => d?.type === type);
                          return (
                            <div key={type} className="flex items-center justify-between mb-2">
                              <div className="flex flex-col">
                                <span className="capitalize text-[#2C373B]">{type.replace('-', ' ')}</span>
                                {existing?.url ? (
                                  <a href={existing.url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 text-sm underline">View</a>
                                ) : (
                                  <span className="text-gray-500 text-sm">No document</span>
                                )}
                              </div>
                              <div>
                                <input
                                  id={`doc-upload-${type}`}
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                      const url = await uploadFile(file);
                                      setFormData((fd: any) => {
                                        const docs = Array.isArray(fd.documents)
                                          ? [...fd.documents]
                                          : (Array.isArray(employeeDetails?.documents) ? [...employeeDetails.documents] : []);
                                        const idx = docs.findIndex((d: any) => d?.type === type);
                                        const newDoc = { type, url, uploadedAt: new Date().toISOString() };
                                        if (idx >= 0) docs[idx] = newDoc; else docs.push(newDoc);
                                        return { ...fd, documents: docs };
                                      });
                                    } catch (err) {
                                      setUpdateMessage('File upload failed');
                                    } finally {
                                      e.target.value = '';
                                    }
                                  }}
                                />
                                <label htmlFor={`doc-upload-${type}`} className="cursor-pointer bg-[#4CDC9C] text-[#2C373B] px-3 py-1 rounded hover:bg-[#3fd190]">Upload</label>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <>
                          {Array.isArray(employeeDetails?.documents) && employeeDetails.documents.length > 0 ? (
                            employeeDetails.documents.map((doc: any) => (
                              <div key={doc.type} className="flex items-center justify-between mb-2">
                                <span className="capitalize text-[#2C373B]">{(doc.type || '').replace('-', ' ')}</span>
                                {doc.url ? (
                                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 text-sm underline">View</a>
                                ) : (
                                  <span className="text-gray-500 text-sm">No document</span>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="text-gray-500 text-sm">No document</div>
                          )}
                        </>
                      )}
                    </div>
                  </form>
                ) : (
                  <div>No details found.</div>
                )}
                {updateMessage && <div className={updateMessage.includes('success') ? 'text-green-600' : 'text-red-600'}>{updateMessage}</div>}
              </div>
            )}
            <DialogFooter>
              {/* Only show Update button if in edit mode */}
              {employeeDetails && editMode && (
                <> 
                  <button className="bg-[#4CDC9C] text-[#2C373B] px-4 py-2 rounded hover:bg-[#3fd190]" disabled={updateLoading}
                    onClick={async () => {
                      setUpdateLoading(true);
                      setUpdateMessage(null);
                      try {
                        const submitData: any = { ...formData };
                        // Normalize reportingManagerId to a valid ObjectId string or null
                        const candidateRm = (submitData as any)?.reportingManagerId;
                        const isValidObjectId = (id: string) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
                        if (typeof candidateRm === 'string') {
                          submitData.reportingManagerId = isValidObjectId(candidateRm) ? candidateRm : null;
                        } else if (candidateRm && typeof candidateRm === 'object') {
                          const id = candidateRm?._id;
                          submitData.reportingManagerId = isValidObjectId(id) ? id : null;
                        }
                        // Ensure documents array is included in update payload
                        submitData.documents = Array.isArray(submitData.documents)
                          ? submitData.documents
                          : (Array.isArray(employeeDetails?.documents) ? employeeDetails.documents : []);
                        await API.put(`/auth/employees/${selectedEmployee?._id}`, submitData);
                        setUpdateMessage('Update success!');
                        setEditMode(false);
                        setProfilePreview(null);
                      } catch (e) {
                        setUpdateMessage('Update failed!');
                      } finally {
                        setUpdateLoading(false);
                      }
                    }}
                  >
                    {updateLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    className="ml-2 px-4 py-2 rounded bg-[#4CDC9C] text-[#2C373B] hover:bg-[#3fd190]"
                    onClick={() => { setEditMode(false); setFormData(employeeDetails); setProfilePreview(null); }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Pagination - Prev left, pages center, Next right */}
        <div className="flex items-center justify-between mt-4">
          {/* Prev left */}
          <button
            className="text-sm px-2 py-1 rounded-lg hover:underline disabled:opacity-50"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Prev
          </button>
          {/* Pages center with ellipsis */}
          <div className="flex items-center gap-2 text-[#2C373B]">
            {(() => {
              const items: (number | string)[] = [];
              const max = totalPages;
              if (max <= 6) {
                for (let i = 1; i <= max; i++) items.push(i);
              } else {
                items.push(1);
                if (page > 3) items.push('…');
                const start = Math.max(2, page - 1);
                const end = Math.min(max - 1, page + 1);
                for (let i = start; i <= end; i++) items.push(i);
                if (page < max - 2) items.push('…');
                items.push(max);
              }
              return items.map((it, idx) => (
                typeof it === 'string' ? (
                  <span key={`e-${idx}`} className="text-sm">{it}</span>
                ) : (
                  <button
                    key={it}
                    className={`text-sm px-2 py-1 rounded-lg ${page === it ? 'bg-[#4CDC9C] text-[#2C373B]' : 'hover:bg-[#E6F9F1]'}`}
                    onClick={() => setPage(it)}
                  >
                    {it}
                  </button>
                )
              ));
            })()}
          </div>
          {/* Next right */}
          <button
            className="text-sm px-2 py-1 rounded-lg hover:underline disabled:opacity-50"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeList;