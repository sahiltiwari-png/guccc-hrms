import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, User, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  getSalaryStructures,
  getSalaryStructureByEmployee,
  updateSalaryStructure,
  deleteSalaryStructure,
  type SalaryStructure,
  type SalaryStructuresResponse,
  createSalaryStructure,
} from "@/api/salaryStructures";
import { getEmployees, getEmployeeById } from "@/api/employees";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import EmployeeSalarySlips from "@/pages/employee/EmployeeSalarySlips";

interface SalaryResponseShape {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: SalaryStructure[];
}

const SalarySlip = () => {
  const { user } = useAuth();
  if ((user as any)?.role === "employee") {
    return <EmployeeSalarySlips />;
  }

  const [salaryData, setSalaryData] = useState<SalaryResponseShape | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<SalaryStructure | null>(null);
  const [viewDetail, setViewDetail] = useState<SalaryStructure | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [createForm, setCreateForm] = useState<any>({
    employeeId: "",
    ctc: "",
    basic: "",
    gross: "",
    hra: "",
    conveyance: "",
    specialAllowance: "",
    pf: "",
    esi: "",
    tds: "",
    professionalTax: "",
    otherDeductions: "",
  });
  const [grossEdited, setGrossEdited] = useState(false);

  const toNum = (v: any) => {
    if (v === "" || v === null || v === undefined) return 0;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const computeGrossFromForm = (form: any) => {
    // Sum all fields except ctc and gross
    return (
      toNum(form.basic) +
      toNum(form.hra) +
      toNum(form.conveyance) +
      toNum(form.specialAllowance) +
      toNum(form.pf) +
      toNum(form.esi) +
      toNum(form.tds) +
      toNum(form.professionalTax) +
      toNum(form.otherDeductions)
    );
  };
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeResults, setEmployeeResults] = useState<any[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchSalaryData = async () => {
      setLoading(true);
      try {
        const params: any = { page: currentPage, limit: 10 };
        const res: SalaryStructuresResponse = await getSalaryStructures(params);
        const items = res.data || [];
        const employeeCache = new Map<string, any>();
        const enrichedItems: SalaryStructure[] = await Promise.all(
          items.map(async (item: any) => {
            // Normalize backend shape: if "employee" exists, assign to employeeId
            if (item && item.employee && !item.employeeId) {
              item.employeeId = item.employee;
            }

            const empVal = item?.employeeId ?? item?.employee;
            let empId: string | undefined = undefined;
            if (typeof empVal === "string") {
              empId = empVal;
            } else if (empVal && typeof empVal === "object") {
              empId = empVal._id || empVal.id;
            }
            if (empId && (!empVal || !empVal.firstName)) {
              try {
                if (employeeCache.has(empId)) {
                  item.employeeId = employeeCache.get(empId);
                } else {
                  const emp = await getEmployeeById(empId);
                  item.employeeId = emp;
                  employeeCache.set(empId, emp);
                }
              } catch (e) {
                // ignore enrichment errors; keep original item
              }
            }
            return item as SalaryStructure;
          })
        );
        const shape: SalaryResponseShape = {
          page: res.page,
          limit: res.limit,
          total: res.total,
          totalPages: res.totalPages,
          items: enrichedItems,
        };
        setSalaryData(shape);
        setError(null);
      } catch (err) {
        setError("Failed to load salary structures");
        setSalaryData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSalaryData();
  }, [currentPage]);

  const openView = async (record: SalaryStructure) => {
    try {
      setSelectedRecord(record);
      const rawEmp: any = (record as any)?.employeeId ?? (record as any)?.employee;
      const empId: string | undefined =
        typeof rawEmp === "string" ? rawEmp : rawEmp?._id || rawEmp?.id;
      if (!empId) {
        toast({
          title: "Error",
          description: "Employee ID is missing for this salary structure.",
          variant: "destructive",
        });
        return;
      }
      const detail = await getSalaryStructureByEmployee(empId);
      setViewDetail(detail.data);
      setViewOpen(true);
    } catch (e: any) {
      setError("Failed to load salary structure details");
      toast({
        title: "Error",
        description:
          e?.response?.data?.message || "Failed to load salary structure details",
        variant: "destructive",
      });
    }
  };

  const openEdit = async (record: SalaryStructure) => {
    try {
      setSelectedRecord(record);
      const empId = (record as any)?.employeeId?._id ?? (record as any)?.employeeId;
      const detail = await getSalaryStructureByEmployee(empId);
      setEditForm({ ...detail.data });
      setEditOpen(true);
    } catch (e) {
      setError("Failed to load salary structure for edit");
      toast({
        title: "Error",
        description:
          (e as any)?.response?.data?.message || "Failed to load salary structure for edit",
        variant: "destructive",
      });
    }
  };

  const openDelete = (record: SalaryStructure) => {
    setSelectedRecord(record);
    setDeleteOpen(true);
  };

  const openCreate = () => {
    setCreateOpen(true);
    setEmployeeDropdownOpen(false);
    // Initialize gross based on current fields if not manually edited
    setCreateForm((prev: any) => ({ ...prev, gross: computeGrossFromForm(prev) }));
    setGrossEdited(false);
  };

  const handleCreateEditChange = (field: string, value: string | number) => {
    // If user edits gross, mark it as manually edited
    if (field === "gross") {
      setGrossEdited(true);
      setCreateForm((prev: any) => ({ ...prev, gross: value }));
      return;
    }
    // Update field; if gross not edited by user, auto-recompute
    setCreateForm((prev: any) => {
      const next = { ...prev, [field]: value };
      if (!grossEdited) {
        next.gross = computeGrossFromForm(next);
      }
      return next;
    });
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
    setCreateForm((prev: any) => ({ ...prev, employeeId: emp._id }));
    setEmployeeSearch(`${emp.firstName} ${emp.lastName} (${emp.employeeCode})`);
    setEmployeeDropdownOpen(false);
  };

  const handleEditChange = (field: string, value: string | number) => {
    setEditForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleUpdate = async () => {
    if (!selectedRecord?._id) return;
    try {
      const numericFields = [
        "basic",
        "hra",
        "gross",
        "ctc",
        "conveyance",
        "specialAllowance",
        "pf",
        "esi",
        "tds",
        "professionalTax",
        "otherDeductions",
      ] as const;

      const payload: any = {};
      for (const key of numericFields) {
        const val = editForm[key];
        if (val === "" || val === null || val === undefined) continue; // skip empty so backend preserves existing
        const num = typeof val === "number" ? val : Number(val);
        if (!Number.isNaN(num)) payload[key] = num;
      }

      await updateSalaryStructure(selectedRecord._id, payload);
      setEditOpen(false);
      // refresh list
      const res: SalaryStructuresResponse = await getSalaryStructures({ page: currentPage, limit: 10 });
      setSalaryData({ page: res.page, limit: res.limit, total: res.total, totalPages: res.totalPages, items: res.data });
    } catch (e) {
      setError("Failed to update salary structure");
      toast({
        title: "Error",
        description:
          (e as any)?.response?.data?.message || "Failed to update salary structure",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord?._id) return;
    try {
      await deleteSalaryStructure(selectedRecord._id);
      setDeleteOpen(false);
      // refresh list after delete
      const res: SalaryStructuresResponse = await getSalaryStructures({ page: currentPage, limit: 10 });
      setSalaryData({ page: res.page, limit: res.limit, total: res.total, totalPages: res.totalPages, items: res.data });
    } catch (e) {
      setError("Failed to delete salary structure");
      toast({
        title: "Error",
        description:
          (e as any)?.response?.data?.message || "Failed to delete salary structure",
        variant: "destructive",
      });
    }
  };

  const handleCreate = async () => {
    try {
      if (!createForm.employeeId) {
        setError("Please select an employee");
        toast({
          title: "Validation Error",
          description: "Please select an employee before creating.",
          variant: "destructive",
        });
        return;
      }
      const toNumber = (v: any, def = 0) => {
        if (v === "" || v === null || v === undefined) return def;
        const n = typeof v === "number" ? v : Number(v);
        return Number.isNaN(n) ? def : n;
      };
      const payload = {
        employeeId: createForm.employeeId,
        ctc: toNumber(createForm.ctc),
        basic: toNumber(createForm.basic),
        gross: toNumber(createForm.gross),
        hra: toNumber(createForm.hra),
        conveyance: toNumber(createForm.conveyance),
        specialAllowance: toNumber(createForm.specialAllowance),
        pf: toNumber(createForm.pf),
        esi: toNumber(createForm.esi),
        tds: toNumber(createForm.tds),
        professionalTax: toNumber(createForm.professionalTax),
        otherDeductions: toNumber(createForm.otherDeductions),
      };
      await createSalaryStructure(payload);
      setCreateOpen(false);
      setCreateForm({
        employeeId: "",
        ctc: "",
        basic: "",
        gross: "",
        hra: "",
        conveyance: "",
        specialAllowance: "",
        pf: "",
        esi: "",
        tds: "",
        professionalTax: "",
        otherDeductions: "",
      });
      setEmployeeSearch("");
      // refresh list
      const res: SalaryStructuresResponse = await getSalaryStructures({ page: currentPage, limit: 10 });
      setSalaryData({ page: res.page, limit: res.limit, total: res.total, totalPages: res.totalPages, items: res.data });
      setError(null);
    } catch (e) {
      setError("Failed to create salary structure");
      toast({
        title: "Error",
        description:
          (e as any)?.response?.data?.message || "Failed to create salary structure",
        variant: "destructive",
      });
    }
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
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="text-2xl font-semibold" style={{color: '#2C373B'}}>Salary Structure</h1>
            <p className="text-sm" style={{color: '#2C373B'}}>
              Overview of employee salary structures with detailed breakdown
            </p>
          </div>
          <Button
            className="hover:opacity-80"
            style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
            onClick={openCreate}
          >
            Create Salary Structure
          </Button>
        </div>
        <div className="h-4" />

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <p>Loading salary slip data...</p>
            </div>
          ) : (
            <div className="overflow-x-hidden w-full">
              <table className="min-w-full w-full text-sm">
                <thead className="border-b" style={{ background: '#2C373B', color: '#FFFFFF' }}>
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold" style={{fontSize: '12px', fontWeight: '600', color: '#FFFFFF'}}>Employee</th>
                    <th className="px-4 py-2 text-left font-semibold" style={{fontSize: '12px', fontWeight: '600', color: '#FFFFFF'}}>Code</th>
                    <th className="px-4 py-2 text-left font-semibold" style={{fontSize: '12px', fontWeight: '600', color: '#FFFFFF'}}>CTC</th>
                    <th className="px-4 py-2 text-left font-semibold" style={{fontSize: '12px', fontWeight: '600', color: '#FFFFFF'}}>HRA</th>
                    <th className="px-4 py-2 text-left font-semibold" style={{fontSize: '12px', fontWeight: '600', color: '#FFFFFF'}}>Conveyance</th>
                    <th className="px-4 py-2 text-left font-semibold" style={{fontSize: '12px', fontWeight: '600', color: '#FFFFFF'}}>
                      <span title="Special Allowance">Special All......</span>
                    </th>
                    <th className="px-4 py-2 text-left font-semibold" style={{fontSize: '12px', fontWeight: '600', color: '#FFFFFF'}}>Gross</th>
                    <th className="px-4 py-2 text-left font-semibold" style={{fontSize: '12px', fontWeight: '600', color: '#FFFFFF'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryData && salaryData.items.length > 0 ? (
                    salaryData.items.map((record) => (
                      <tr
                        key={record._id}
                        className="border-b last:border-0 hover:bg-emerald-50 transition-colors"
                      >
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              {record.employeeId?.profilePhotoUrl ? (
                                <AvatarImage
                                  src={record.employeeId.profilePhotoUrl}
                                  alt={`${record.employeeId?.firstName ?? ""} ${record.employeeId?.lastName ?? ""}`}
                                />
                              ) : null}
                              <AvatarFallback>
                                <User className="h-5 w-5" style={{color: '#2C373B'}} />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium" style={{fontSize: '14px', fontWeight: '500', color: '#2C373B'}}>{record.employeeId?.firstName ?? ""} {record.employeeId?.lastName ?? ""}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2" style={{fontSize: '14px', fontWeight: '500', color: '#2C373B'}}>{record.employeeId?.employeeCode ?? ""}</td>
                        <td className="px-4 py-2" style={{fontSize: '14px', fontWeight: '500', color: '#2C373B'}}>₹{Number(record.ctc ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-2" style={{fontSize: '14px', fontWeight: '500', color: '#2C373B'}}>₹{Number(record.hra ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-2" style={{fontSize: '14px', fontWeight: '500', color: '#2C373B'}}>₹{Number(record.conveyance ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-2" style={{fontSize: '14px', fontWeight: '500', color: '#2C373B'}}>₹{Number(record.specialAllowance ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-2" style={{fontSize: '14px', fontWeight: '500', color: '#2C373B'}}>₹{Number(record.gross ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-2 flex gap-2">
                          <Button
                            variant="link"
                            size="icon"
                            className="h-8 w-8 p-0 hover:opacity-80 focus:outline-none focus:ring-0 focus:border-0"
                            style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
                            onClick={() => openView(record)}
                          >
                            <Eye className="w-5 h-5" />
                          </Button>
                          <Button
                            variant="link"
                            size="icon"
                            className="h-8 w-8 p-0 hover:opacity-80 focus:outline-none focus:ring-0 focus:border-0"
                            style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
                            onClick={() => openEdit(record)}
                          >
                            <Edit className="w-5 h-5" />
                          </Button>
                          <Button
                            variant="link"
                            size="icon"
                            className="h-8 w-8 p-0 hover:opacity-80 focus:outline-none focus:ring-0 focus:border-0"
                            style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
                            onClick={() => openDelete(record)}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-gray-600">No data found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* View Modal */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg focus:outline-none focus:ring-0 focus:border-0">
          <DialogHeader>
            <DialogTitle style={{color: '#2C373B'}}>Salary Details</DialogTitle>
          </DialogHeader>
          {viewDetail && (
            <div className="space-y-2 text-sm text-gray-700">
              <p style={{color: '#2C373B'}}><strong>Name:</strong> {viewDetail.employeeId?.firstName ?? ""} {viewDetail.employeeId?.lastName ?? ""}</p>
              <p style={{color: '#2C373B'}}><strong>Code:</strong> {viewDetail.employeeId?.employeeCode ?? ""}</p>
              <p style={{color: '#2C373B'}}><strong>Basic:</strong> ₹{Number(viewDetail.basic ?? 0).toLocaleString()}</p>
              <p style={{color: '#2C373B'}}><strong>CTC:</strong> ₹{Number(viewDetail.ctc ?? 0).toLocaleString()}</p>
              <p style={{color: '#2C373B'}}><strong>Gross:</strong> ₹{Number(viewDetail.gross ?? 0).toLocaleString()}</p>
              <p style={{color: '#2C373B'}}><strong>HRA:</strong> ₹{Number(viewDetail.hra ?? 0).toLocaleString()}</p>
              <p style={{color: '#2C373B'}}><strong>Conveyance:</strong> ₹{Number(viewDetail.conveyance ?? 0).toLocaleString()}</p>
              <p style={{color: '#2C373B'}}><strong>Special Allowance:</strong> ₹{Number(viewDetail.specialAllowance ?? 0).toLocaleString()}</p>
              <p style={{color: '#2C373B'}}><strong>PF:</strong> ₹{Number(viewDetail.pf ?? 0).toLocaleString()}</p>
              <p style={{color: '#2C373B'}}><strong>ESI:</strong> ₹{Number(viewDetail.esi ?? 0).toLocaleString()}</p>
              <p style={{color: '#2C373B'}}><strong>TDS:</strong> ₹{Number(viewDetail.tds ?? 0).toLocaleString()}</p>
              <p style={{color: '#2C373B'}}><strong>Professional Tax:</strong> ₹{Number(viewDetail.professionalTax ?? 0).toLocaleString()}</p>
              <p style={{color: '#2C373B'}}><strong>Other Deductions:</strong> ₹{Number(viewDetail.otherDeductions ?? 0).toLocaleString()}</p>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="hover:opacity-80 focus:outline-none focus:ring-0 focus:border-0" style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}>
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto focus:outline-none focus:ring-0 focus:border-0">
          <DialogHeader>
            <DialogTitle style={{color: '#2C373B'}}>Edit Salary Structure</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="grid gap-3">
              {[
                "ctc",
                "basic",
                "hra",
                "gross",
                "conveyance",
                "specialAllowance",
                "pf",
                "esi",
                "tds",
                "professionalTax",
                "otherDeductions",
              ].map((field) => (
                <div key={field} className="grid gap-1">
                  <Label className="capitalize" style={{color: '#2C373B'}}>{field}</Label>
                  <Input
                    type="number"
                    value={editForm[field] ?? ""}
                    onChange={(e) => handleEditChange(field, e.target.value)}
                    className="h-8 focus:outline-none focus:ring-0 focus:border-gray-300"
                    style={{backgroundColor: 'rgb(209 250 229)', color: '#2C373B'}}
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter className="pt-4 flex gap-2 justify-end">
            <DialogClose asChild>
              <Button variant="outline" className="hover:opacity-80 focus:outline-none focus:ring-0 focus:border-0" style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              className="hover:opacity-80 focus:outline-none focus:ring-0 focus:border-0"
              style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
              onClick={handleUpdate}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md focus:outline-none focus:ring-0 focus:border-0">
          <DialogHeader>
            <DialogTitle style={{color: '#2C373B'}}>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{color: '#2C373B'}}>
            Are you sure you want to delete the salary structure for{" "}
            <strong>{selectedRecord?.employeeId?.firstName} {selectedRecord?.employeeId?.lastName}</strong>?
          </p>
          <DialogFooter className="flex gap-2 justify-end">
            <DialogClose asChild>
              <Button variant="outline" className="hover:opacity-80 focus:outline-none focus:ring-0 focus:border-0" style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleDelete}
              className="hover:opacity-80 focus:outline-none focus:ring-0 focus:border-0"
              style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto focus:outline-none focus:ring-0 focus:border-0">
          <DialogHeader>
            <DialogTitle style={{color: '#2C373B'}}>Create Salary Structure</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2 relative">
              <Label>Employee</Label>
              <div className="relative">
                {createForm.employeeId ? (
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
                        setCreateForm((prev: any) => ({ ...prev, employeeId: "" }));
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
                    className="pr-8 h-8 focus:outline-none focus:ring-0 focus:border-gray-300 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-gray-300"
                    style={{backgroundColor: 'rgb(209 250 229)', color: '#2C373B'}}
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
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "ctc",
                "basic",
                "hra",
                "conveyance",
                "specialAllowance",
                "pf",
                "esi",
                "tds",
                "professionalTax",
                "otherDeductions",
                "gross",
              ].map((field) => (
                <div key={field} className="grid gap-2">
                  <Label className="capitalize" style={{color: '#2C373B'}}>{field}</Label>
                  <Input
                    type="number"
                    value={createForm[field] ?? ""}
                    onChange={(e) => handleCreateEditChange(field, e.target.value)}
                    className="h-8 focus:outline-none focus:ring-0 focus:border-gray-300 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-gray-300"
                    style={{backgroundColor: 'rgb(209 250 229)', color: '#2C373B'}}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="pt-4 flex gap-2 justify-end">
            <DialogClose asChild>
              <Button variant="outline" className="hover:opacity-80 focus:outline-none focus:ring-0 focus:border-0" style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleCreate}
              className="hover:opacity-80 focus:outline-none focus:ring-0 focus:border-0"
              style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
            >
              Add Salary Structure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalarySlip;
