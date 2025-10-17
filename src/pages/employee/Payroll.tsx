import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Eye, Edit, Send, DownloadCloud, User, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getPayroll, createPayroll, getPayrollByEmployee, updatePayrollById, sendPayslip, downloadPayroll, getEmployeePayrollList, type PayrollResponse, type PayrollItem } from "@/api/payroll";
import { getEmployees } from "@/api/employees";
import { toast } from "@/hooks/use-toast";

const computeDeductions = (p: PayrollItem) => {
  const values = [p.pf, p.esi, p.tds, p.professionalTax, p.otherDeductions, p.leaveDeductions];
  return values.reduce((sum, v) => sum + Number(v || 0), 0);
};

const Payroll = () => {
  const now = new Date();
  const [month, setMonth] = useState<number | null>(null); // 0-11, optional
  const [year, setYear] = useState<number | null>(null); // optional
  const [search] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [payrollData, setPayrollData] = useState<PayrollResponse | null>(null);
  const [employeeRows, setEmployeeRows] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Create Payroll modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeResults, setEmployeeResults] = useState<any[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [modalMonth, setModalMonth] = useState<number>(now.getMonth()); // 0-11
  const [modalYear, setModalYear] = useState<number>(now.getFullYear());

  // View Payroll modal state
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewDetail, setViewDetail] = useState<PayrollItem | null>(null);

  // Edit Payroll modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState<any | null>(null);
  const [editPayrollId, setEditPayrollId] = useState<string>("");

  const clearFilters = () => {
    setMonth(null);
    setYear(null);
    setCurrentPage(1);
  };

  const handleCreatePayroll = () => {
    setCreateOpen(true);
    setEmployeeDropdownOpen(false);
    setSelectedEmployeeId("");
    setEmployeeSearch("");
    setModalMonth(now.getMonth());
    setModalYear(now.getFullYear());
  };

  const searchEmployees = async (query: string) => {
    try {
      setEmployeeLoading(true);
      const res = await getEmployees({ page: 1, limit: 10, search: query });
      setEmployeeResults(res.items || res.data || []);
      setEmployeeDropdownOpen(true);
    } catch (e) {
      setEmployeeResults([]);
    } finally {
      setEmployeeLoading(false);
    }
  };

  const selectEmployee = (emp: any) => {
    setSelectedEmployeeId(emp._id);
    setEmployeeSearch(`${emp.firstName} ${emp.lastName} (${emp.employeeCode})`);
    setEmployeeDropdownOpen(false);
  };

  const submitCreatePayroll = async () => {
    try {
      if (!selectedEmployeeId) {
        toast({
          title: "Validation Error",
          description: "Please select an employee.",
          variant: "destructive",
        });
        return;
      }
      const payload = {
        employeeId: selectedEmployeeId,
        month: modalMonth + 1,
        year: modalYear,
      };
      await createPayroll(payload);
      setCreateOpen(false);
      // Refresh current list
      setCurrentPage(1);
      const res = await getPayroll({ page: 1, limit: 10, month: month + 1, year });
      setPayrollData(res);
      toast({ title: "Success", description: "Payroll created successfully." });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.response?.data?.message || "Failed to create payroll",
        variant: "destructive",
      });
    }
  };

  const monthNames = useMemo(() => [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ], []);

  const years = useMemo(() => {
    const start = 2002;
    const current = now.getFullYear();
    const arr: number[] = [];
    for (let y = current; y >= start; y--) arr.push(y);
    return arr;
  }, [now]);

  // Determine employeeId: prefer query param, fallback to logged-in user from localStorage
  const parsedEmployeeId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const fromQuery = params.get("employeeId");
    if (fromQuery && fromQuery.trim()) return fromQuery.trim();
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        return String(u?._id || u?.id || "");
      }
    } catch {}
    return "";
  }, [location.search]);

  const employeeInfo = useMemo(() => employeeRows[0]?.employeeId, [employeeRows]);

  useEffect(() => {
    const fetchData = async () => {
      if (!parsedEmployeeId) return;
      setLoading(true);
      try {
        const skip = (currentPage - 1) * 10;
        const params: any = { skip, limit: 10 };
        if (month !== null) params.month = month + 1; // API expects 1-12
        if (year !== null) params.year = year;
        const res = await getEmployeePayrollList(parsedEmployeeId, params);
        setEmployeeRows(res?.data ?? []);
        setError(null);
      } catch (e: any) {
        setEmployeeRows([]);
        setError(e?.response?.data?.message || "Failed to load payroll");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [parsedEmployeeId, currentPage, month, year]);

  const openView = async (record: PayrollItem) => {
    try {
      setViewLoading(true);
      const empId = (record as any)?.employeeId?._id ?? (record as any)?.employeeId;
      const m = Number(record.month || (month !== null ? month + 1 : now.getMonth() + 1));
      const y = Number(record.year || (year !== null ? year : now.getFullYear()));
      const detail = await getPayrollByEmployee(String(empId), m, y);
      setViewDetail(detail.data);
      setViewOpen(true);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.response?.data?.message || "Failed to load payroll details",
        variant: "destructive",
      });
    } finally {
      setViewLoading(false);
    }
  };
  const openEdit = async (record: PayrollItem) => {
    try {
      setEditLoading(true);
      const empId = (record as any)?.employeeId?._id ?? (record as any)?.employeeId;
      const m = Number(record.month || (month !== null ? month + 1 : now.getMonth() + 1));
      const y = Number(record.year || (year !== null ? year : now.getFullYear()));
      const detail = await getPayrollByEmployee(String(empId), m, y);
      const d = detail.data as any;
      setEditPayrollId(String(d?._id || (record as any)?._id));
      setEditForm({
        month: d?.month ?? record.month,
        year: d?.year ?? record.year,
        grossEarnings: d?.grossEarnings ?? record.grossEarnings,
        basic: d?.basic ?? record.basic,
        hra: d?.hra ?? record.hra,
        conveyance: d?.conveyance ?? record.conveyance ?? 0,
        specialAllowance: d?.specialAllowance ?? record.specialAllowance ?? 0,
        pf: d?.pf ?? record.pf ?? 0,
        esi: d?.esi ?? record.esi ?? 0,
        tds: d?.tds ?? record.tds ?? 0,
        professionalTax: d?.professionalTax ?? record.professionalTax ?? 0,
        otherDeductions: d?.otherDeductions ?? record.otherDeductions ?? 0,
        lossOfPayDays: d?.lossOfPayDays ?? record.lossOfPayDays ?? 0,
        leaveDeductions: d?.leaveDeductions ?? record.leaveDeductions ?? 0,
        netPayable: d?.netPayable ?? record.netPayable,
        status: d?.status ?? record.status,
        totalWorkedDays: d?.totalWorkedDays ?? record.totalWorkedDays ?? 0,
      });
      setEditOpen(true);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.response?.data?.message || "Failed to load payroll for edit",
        variant: "destructive",
      });
    } finally {
      setEditLoading(false);
    }
  };
  const handleEdit = (id: string) => navigate(`/payroll/edit/${id}`);
  const handleSend = async (record: PayrollItem) => {
    try {
      const empId = (record as any)?.employeeId?._id ?? (record as any)?.employeeId;
      const m = month + 1; // API expects 1-12
      const y = year;
      setSendingId(record._id);
      const res = await sendPayslip(String(empId), m, y);
      toast({ title: "Payslip Sent", description: res?.message || `Payslip sent for ${m}/${y}` });
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.message || "Failed to send payslip", variant: "destructive" });
    } finally {
      setSendingId(null);
    }
  };
  const handleDownload = async (record: PayrollItem) => {
    try {
      const empId = (record as any)?.employeeId?._id ?? (record as any)?.employeeId;
      const m = Number((month !== null ? month + 1 : (record.month || (now.getMonth() + 1))));
      const y = Number((year !== null ? year : (record.year || now.getFullYear())));
      
      const response = await downloadPayroll(String(empId), m, y);
      
      // Create blob and download file
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers or create default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `payroll_${empId}_${m}_${y}.pdf`;
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
        title: "Download Started", 
        description: `Payroll for ${m}/${y} is being downloaded` 
      });
    } catch (e: any) {
      toast({ 
        title: "Download Failed", 
        description: e?.response?.data?.message || "Failed to download payroll", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div
      className="min-h-screen p-3 sm:p-6"
      style={{
        background:
          "linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)",
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header with employee info and filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-emerald-200">
              {employeeInfo?.profilePhotoUrl ? (
                <AvatarImage src={employeeInfo.profilePhotoUrl} alt={`${employeeInfo?.firstName ?? ''} ${employeeInfo?.lastName ?? ''}`} />
              ) : (
                <AvatarFallback className="bg-emerald-100">
                  <User className="h-5 w-5 text-emerald-600" />
                </AvatarFallback>
              )}
            </Avatar>
            <div className="leading-tight">
              <h2 className="text-xl font-semibold text-[#2C373B]">
                {employeeInfo ? `${employeeInfo.firstName ?? ''} ${employeeInfo.lastName ?? ''}` : 'Payroll'}
              </h2>
              {employeeInfo && (
                <p className="text-sm text-[#2C373B]">{employeeInfo?.designation ?? ''}</p>
              )}
              <p className="text-xs text-[#2C373B]/70">Records: {employeeRows.length}</p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
            <Select
              value={month !== null ? String(month) : undefined}
              onValueChange={(val) => {
                setMonth(Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[140px] sm:w-[160px] shrink-0 text-sm border-[#4CDC9C] bg-[rgb(209,250,229)] text-[#2C373B] hover:bg-[#4CDC9C]/70 focus:outline-none focus:ring-0">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {monthNames.map((m, idx) => (
                  <SelectItem key={m} value={String(idx)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={year !== null ? String(year) : undefined}
              onValueChange={(val) => {
                setYear(Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[110px] sm:w-[140px] shrink-0 text-sm border-[#4CDC9C] bg-[rgb(209,250,229)] text-[#2C373B] hover:bg-[#4CDC9C]/70 focus:outline-none focus:ring-0">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              onClick={clearFilters}
              className="text-sm px-3 py-2 rounded-md bg-[#4CDC9C] text-[#2C373B] hover:bg-[#3AC586] focus:outline-none focus:ring-0 shrink-0"
            >
              Clear filters
            </button>

          </div>
        </div>

        {/* Employee payroll list table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border-collapse">
              <thead className="bg-[#2C373B] border-b">
                <tr>
                  <th className="px-2 py-2 text-left text-[12px] font-semibold text-white whitespace-nowrap">Month</th>
                  <th className="px-2 py-2 text-left text-[12px] font-semibold text-white whitespace-nowrap">Basic (₹)</th>
                  <th className="px-2 py-2 text-left text-[12px] font-semibold text-white whitespace-nowrap">HRA (₹)</th>
                  <th className="px-2 py-2 text-left text-[12px] font-semibold text-white whitespace-nowrap">Gross Earnings (₹)</th>
                  <th className="px-2 py-2 text-left text-[12px] font-semibold text-white whitespace-nowrap">Deductions (₹)</th>
                  <th className="px-2 py-2 text-left text-[12px] font-semibold text-white whitespace-nowrap">Unpaid Leave Days</th>
                  <th className="px-2 py-2 text-left text-[12px] font-semibold text-white whitespace-nowrap">Paid Days</th>
                  <th className="px-2 py-2 text-left text-[12px] font-semibold text-white whitespace-nowrap">Net Salary (₹)</th>
                  <th className="px-2 py-2 text-left text-[12px] font-semibold text-white whitespace-nowrap">Status</th>
                  <th className="px-2 py-2 text-left text-[12px] font-semibold text-white whitespace-nowrap">Salary Slip</th>
                </tr>
              </thead>

              <tbody className="text-[14px] text-[#2C373B] font-medium">
                {loading && (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-[#2C373B]">Loading...</td>
                  </tr>
                )}
                {!loading && employeeRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-[#2C373B]">No data available</td>
                  </tr>
                )}
                {!loading && employeeRows.map((p) => (
                  <tr
                    key={p._id}
                    className="border-b last:border-0 hover:bg-emerald-50 transition-colors"
                  >
                    <td className="px-2 py-2">{monthNames[(Number(p.month || 1)) - 1]} {p.year}</td>
                    <td className="px-2 py-2">₹{Number(p.basic || 0).toLocaleString()}</td>
                    <td className="px-2 py-2">₹{Number(p.hra || 0).toLocaleString()}</td>
                    <td className="px-2 py-2">₹{Number(p.grossEarnings || 0).toLocaleString()}</td>
                    <td className="px-2 py-2">₹{computeDeductions(p).toLocaleString()}</td>
                    <td className="px-2 py-2">{Number(p.lossOfPayDays || 0)}</td>
                    <td className="px-2 py-2">{Math.max(0, Number(p.totalWorkedDays || 0) - Number(p.lossOfPayDays || 0))}</td>
                    <td className="px-2 py-2 font-medium">₹{Number(p.netPayable || 0).toLocaleString()}</td>
                    <td className="px-2 py-2">
                      <span
                        className={cn(
                          "text-[11px] px-2 py-0.5 rounded-md",
                          (p.status || '').toLowerCase() === "processed"
                            ? "bg-emerald-100 text-emerald-700"
                            : (p.status || '').toLowerCase() === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                        )}
                      >
                        {(p.status || '').charAt(0).toUpperCase() + (p.status || '').slice(1)}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => handleDownload(p)}
                        className="text-emerald-700 hover:underline"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(() => {
            const showPagination = employeeRows.length === 10 || currentPage > 1;
            return showPagination ? (
              <div className="flex items-center justify-end gap-3 px-4 py-3 border-t bg-gray-50">
                <Button
                  variant="outline"
                  disabled={loading || currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="text-[#2C373B]"
                >
                  Previous
                </Button>
                <span className="text-sm text-[#2C373B]">Page {currentPage}</span>
                <Button
                  variant="outline"
                  disabled={loading || employeeRows.length < 10}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="text-[#2C373B]"
                >
                  Next
                </Button>
              </div>
            ) : null;
          })()}
        </div>
      </div>
      {/* Create Payroll Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg focus:outline-none focus:ring-0 focus:border-0">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-emerald-700">Create Payroll</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            {/* Employee field */}
            <div className="grid gap-2 relative">
              <Label>Employee</Label>
              <div className="relative">
                {selectedEmployeeId ? (
                  <div className="flex items-center justify-between border border-gray-300 rounded-md px-3 py-2 bg-white">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1">
                        <User className="h-4 w-4" />
                        <span className="text-sm font-medium">{employeeSearch}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Clear selected employee"
                      className="text-gray-500 hover:text-gray-700"
                      onClick={() => {
                        setSelectedEmployeeId("");
                        setEmployeeSearch("");
                        setEmployeeDropdownOpen(false);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <Input
                    type="text"
                    placeholder="Search employee by name or code"
                    value={employeeSearch}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEmployeeSearch(v);
                      if (v.trim().length >= 1) {
                        searchEmployees(v.trim());
                      } else {
                        setEmployeeResults([]);
                        setEmployeeDropdownOpen(false);
                      }
                    }}
                    onClick={() => {
                      const q = employeeSearch.trim();
                      searchEmployees(q.length >= 1 ? q : "");
                    }}
                    className="pr-8 focus:outline-none focus:ring-0 focus:border-gray-300 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-gray-300"
                  />
                )}
              </div>
              {employeeDropdownOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg ring-1 ring-black/5 max-h-60 overflow-y-auto p-1">
                  {employeeLoading ? (
                    <div className="p-3 text-sm text-gray-500">Loading...</div>
                  ) : employeeResults.length > 0 ? (
                    employeeResults.map((emp: any) => (
                      <button
                        key={emp._id}
                        type="button"
                        className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 flex items-center justify-between rounded-md"
                        onClick={() => selectEmployee(emp)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {emp.profilePhotoUrl ? (
                              <AvatarImage src={emp.profilePhotoUrl} alt={`${emp.firstName} ${emp.lastName}`} />
                            ) : null}
                            <AvatarFallback>
                              <User className="h-4 w-4 text-gray-500" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">{emp.firstName} {emp.lastName}</span>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{emp.employeeCode}</span>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-gray-500">No employees found</div>
                  )}
                </div>
              )}
            </div>

            {/* Month and Year */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Month</Label>
                <Select value={String(modalMonth)} onValueChange={(v) => setModalMonth(Number(v))}>
                  <SelectTrigger className="w-full text-sm border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-0">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {monthNames.map((m, idx) => (
                      <SelectItem key={m} value={String(idx)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Year</Label>
                <Select value={String(modalYear)} onValueChange={(v) => setModalYear(Number(v))}>
                  <SelectTrigger className="w-full text-sm border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-0">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4 flex gap-2 justify-end">
            <DialogClose asChild>
              <Button variant="outline" className="hover:bg-gray-100 focus:outline-none focus:ring-0 focus:border-0">Cancel</Button>
            </DialogClose>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-0 focus:border-0" onClick={submitCreatePayroll}>
              Create Payroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Payroll Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto focus:outline-none focus:ring-0 focus:border-0">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-emerald-700">Edit Payroll</DialogTitle>
          </DialogHeader>
          {editLoading ? (
            <div className="p-4 text-sm text-gray-600">Loading...</div>
          ) : editForm ? (
            <div className="grid gap-3">
              {[
                { key: "basic", label: "Basic" },
                { key: "hra", label: "HRA" },
                { key: "conveyance", label: "Conveyance" },
                { key: "specialAllowance", label: "Special Allowance" },
                { key: "grossEarnings", label: "Gross Earnings" },
                { key: "pf", label: "PF" },
                { key: "esi", label: "ESI" },
                { key: "tds", label: "TDS" },
                { key: "professionalTax", label: "Professional Tax" },
                { key: "otherDeductions", label: "Other Deductions" },
                { key: "lossOfPayDays", label: "Loss Of Pay Days" },
                { key: "leaveDeductions", label: "Leave Deductions" },
                { key: "totalWorkedDays", label: "Total Worked Days" },
                { key: "netPayable", label: "Net Payable" },
              ].map(({ key, label }) => (
                <div key={key} className="grid gap-1">
                  <Label>{label}</Label>
                  <Input
                    type="number"
                    value={editForm[key] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditForm((prev: any) => ({ ...prev, [key]: v }));
                    }}
                    className="focus:outline-none focus:ring-0 focus:border-gray-300"
                  />
                </div>
              ))}
              <div className="grid gap-1">
                <Label>Status</Label>
                <Select
                  value={String(editForm.status ?? "processed")}
                  onValueChange={(v) => setEditForm((prev: any) => ({ ...prev, status: v }))}
                >
                  <SelectTrigger className="w-full text-sm border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-0">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processed">Processed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          <DialogFooter className="pt-4 flex gap-2 justify-end">
            <DialogClose asChild>
              <Button variant="outline" className="hover:bg-gray-100 focus:outline-none focus:ring-0 focus:border-0">Cancel</Button>
            </DialogClose>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-0 focus:border-0"
              onClick={async () => {
                try {
                  if (!editPayrollId) {
                    toast({ title: "Error", description: "Missing payroll id", variant: "destructive" });
                    return;
                  }
                  const numericKeys = [
                    "grossEarnings","basic","hra","conveyance","specialAllowance","pf","esi","tds","professionalTax","otherDeductions","lossOfPayDays","leaveDeductions","netPayable","totalWorkedDays"
                  ] as const;
                  const payload: any = { status: editForm.status };
                  for (const k of numericKeys) {
                    const val = editForm[k];
                    if (val === null || val === undefined || val === "") continue;
                    const num = typeof val === "number" ? val : Number(val);
                    if (!Number.isNaN(num)) payload[k] = num;
                  }
                  // Ensure month/year are passed for backend validation
                  payload.month = month + 1; // API expects 1-12
                  payload.year = year;
                  const res = await updatePayrollById(editPayrollId, payload, month + 1, year);
                  toast({ title: "Success", description: res?.message || "Payroll updated successfully" });
                  setEditOpen(false);
                  // Refresh list
                  const refreshed = await getPayroll({ page: currentPage, limit: 10, month: month + 1, year });
                  setPayrollData(refreshed);
                } catch (e: any) {
                  toast({ title: "Error", description: e?.response?.data?.message || "Failed to update payroll", variant: "destructive" });
                }
              }}
            >
              Update Payroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* View Payroll Modal */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto focus:outline-none focus:ring-0 focus:border-0">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-emerald-700">Payroll Details</DialogTitle>
          </DialogHeader>
          {viewLoading ? (
            <div className="p-4 text-sm text-gray-600">Loading...</div>
          ) : viewDetail ? (
            <div className="space-y-4">
              {/* Employee header */}
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {viewDetail.employeeId?.profilePhotoUrl ? (
                    <AvatarImage src={viewDetail.employeeId.profilePhotoUrl} alt={`${viewDetail.employeeId?.firstName ?? ''} ${viewDetail.employeeId?.lastName ?? ''}`} />
                  ) : (
                    <AvatarFallback>
                      <User className="h-4 w-4 text-gray-500" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="leading-tight">
                  <div className="font-medium text-gray-900 text-sm">
                    {viewDetail.employeeId?.firstName ?? ''} {viewDetail.employeeId?.lastName ?? ''}
                  </div>
                  <div className="text-xs text-gray-600">
                    {viewDetail.employeeId?.designation ?? ''} • {viewDetail.employeeId?.employeeCode ?? ''}
                  </div>
                </div>
              </div>

              {/* Core info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-md p-3">
                  <div className="text-gray-500">Month</div>
                  <div className="font-semibold">{monthNames[(Number(viewDetail.month) || 1) - 1]}</div>
                </div>
                <div className="bg-gray-50 rounded-md p-3">
                  <div className="text-gray-500">Year</div>
                  <div className="font-semibold">{viewDetail.year}</div>
                </div>
                <div className="bg-gray-50 rounded-md p-3">
                  <div className="text-gray-500">Status</div>
                  <div className="font-semibold capitalize">{viewDetail.status}</div>
                </div>
                <div className="bg-gray-50 rounded-md p-3">
                  <div className="text-gray-500">Total Worked Days</div>
                  <div className="font-semibold">{Number(viewDetail.totalWorkedDays ?? 0)}</div>
                </div>
              </div>

              {/* Earnings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-white border rounded-md p-3">
                  <div className="text-gray-500">Basic</div>
                  <div className="font-semibold">₹{Number(viewDetail.basic || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white border rounded-md p-3">
                  <div className="text-gray-500">HRA</div>
                  <div className="font-semibold">₹{Number(viewDetail.hra || 0).toLocaleString()}</div>
                </div>
                {typeof viewDetail.conveyance !== 'undefined' && (
                  <div className="bg-white border rounded-md p-3">
                    <div className="text-gray-500">Conveyance</div>
                    <div className="font-semibold">₹{Number(viewDetail.conveyance || 0).toLocaleString()}</div>
                  </div>
                )}
                {typeof viewDetail.specialAllowance !== 'undefined' && (
                  <div className="bg-white border rounded-md p-3">
                    <div className="text-gray-500">Special Allowance</div>
                    <div className="font-semibold">₹{Number(viewDetail.specialAllowance || 0).toLocaleString()}</div>
                  </div>
                )}
                <div className="bg-white border rounded-md p-3 sm:col-span-2">
                  <div className="text-gray-500">Gross Earnings</div>
                  <div className="font-semibold">₹{Number(viewDetail.grossEarnings || 0).toLocaleString()}</div>
                </div>
              </div>

              {/* Deductions and Net */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-white border rounded-md p-3">
                  <div className="text-gray-500">PF</div>
                  <div className="font-semibold">₹{Number(viewDetail.pf || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white border rounded-md p-3">
                  <div className="text-gray-500">ESI</div>
                  <div className="font-semibold">₹{Number(viewDetail.esi || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white border rounded-md p-3">
                  <div className="text-gray-500">TDS</div>
                  <div className="font-semibold">₹{Number(viewDetail.tds || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white border rounded-md p-3">
                  <div className="text-gray-500">Professional Tax</div>
                  <div className="font-semibold">₹{Number(viewDetail.professionalTax || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white border rounded-md p-3">
                  <div className="text-gray-500">Other Deductions</div>
                  <div className="font-semibold">₹{Number(viewDetail.otherDeductions || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white border rounded-md p-3">
                  <div className="text-gray-500">Leave Deductions</div>
                  <div className="font-semibold">₹{Number(viewDetail.leaveDeductions || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white border rounded-md p-3 sm:col-span-2">
                  <div className="text-gray-500">Net Payable</div>
                  <div className="font-semibold">₹{Number(viewDetail.netPayable || 0).toLocaleString()}</div>
                </div>
              </div>

              {/* Generated at */}
              <div className="text-xs text-gray-500">
                Generated at: {viewDetail.generatedAt ? new Date(viewDetail.generatedAt).toLocaleString() : '-'}
              </div>
            </div>
          ) : (
            <div className="p-4 text-sm text-gray-600">No details available</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payroll;
