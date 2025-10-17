import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getLeavePolicies,
  getLeavePolicy,
  createLeavePolicy,
  updateLeavePolicy,
  updateLeaveType,
  createLeaveType,
  LeavePolicy,
  LeaveType,
  CreateLeavePolicyPayload,
  UpdateLeavePolicyPayload,
  UpdateLeaveTypePayload,
} from "@/api/leavePolicy";
import { useAuth } from "@/contexts/AuthContext";

const LeavePolicy = () => {
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingLeaveType, setAddingLeaveType] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFormMode, setIsFormMode] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<LeavePolicy | null>(null);
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);
  const { organizationId } = useAuth();

  const [policyForm, setPolicyForm] = useState({
    name: "",
    effectiveFrom: "",
    effectiveTo: "",
    isDefault: false,
    isActive: true,
  });

  const [leaveTypeForm, setLeaveTypeForm] = useState({
    type: "",
    interval: "",
    intervalValue: "",
    carryForward: false,
    maxCarryForward: "",
    encashable: false,
    maxEncashable: "",
    probationApplicable: true,
    expireMonthly: false,
    minContinuousWorkDays: "",
    allowNegativeBalance: false,
    maxNegativeBalance: "",
    allowUnpaidLeave: false,
  });

  const [currentLeaveTypes, setCurrentLeaveTypes] = useState<
    Omit<LeaveType, "_id">[]
  >([]);

  const [editPolicyForm, setEditPolicyForm] = useState({
    name: "",
    effectiveFrom: "",
    effectiveTo: "",
    isDefault: false,
    isActive: true,
  });

  const [editLeaveTypeForm, setEditLeaveTypeForm] = useState({
    interval: "",
    intervalValue: "",
    carryForward: false,
    maxCarryForward: "",
    encashable: false,
    maxEncashable: "",
    probationApplicable: true,
    expireMonthly: false,
    minContinuousWorkDays: "",
    allowNegativeBalance: false,
    maxNegativeBalance: "",
    allowUnpaidLeave: false,
  });

  const leaveTypeOptions = [
    { value: "casual", label: "Casual Leave" },
    { value: "medical", label: "Medical Leave" },
    { value: "earned", label: "Earned Leave" },
    { value: "maternity", label: "Maternity Leave" },
    { value: "paternity", label: "Paternity Leave" },
    { value: "other", label: "Other Leave" },
  ];

  const intervalOptions = [
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "yearly", label: "Yearly" },
  ];

  useEffect(() => {
    fetchPolicies();
  }, [organizationId]);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const response = await getLeavePolicies();
      if (response.success && response.data.length > 0) {
        setPolicies(response.data);
        setIsFormMode(false);
      } else {
        setPolicies([]);
        setIsFormMode(true);
      }
    } catch (error) {
      setPolicies([]);
      setIsFormMode(true);
      toast({
        title: "Error",
        description: "Failed to fetch leave policies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = async () => {
    if (!organizationId) {
      toast({
        title: "Error",
        description: "Organization ID not found",
        variant: "destructive",
      });
      return;
    }

    if (!policyForm.name || !policyForm.effectiveFrom || currentLeaveTypes.length === 0) {
      toast({
        title: "Error",
        description: "Please fill all required fields and add at least one leave type",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload: CreateLeavePolicyPayload = {
        organizationId,
        name: policyForm.name,
        effectiveFrom: policyForm.effectiveFrom,
        effectiveTo: policyForm.effectiveTo,
        isDefault: policyForm.isDefault,
        isActive: policyForm.isActive,
        leaveTypes: currentLeaveTypes,
      };

      await createLeavePolicy(payload);
      toast({
        title: "Success",
        description: "Leave policy created successfully!",
      });

      setPolicyForm({
        name: "",
        effectiveFrom: "",
        effectiveTo: "",
        isDefault: false,
        isActive: true,
      });
      setCurrentLeaveTypes([]);
      fetchPolicies();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create leave policy",
        variant: "destructive",
      });
    }
  };

  const handleAddLeaveType = async () => {
    if (!leaveTypeForm.type || !leaveTypeForm.interval || !leaveTypeForm.intervalValue || parseInt(leaveTypeForm.intervalValue) <= 0) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    setAddingLeaveType(true);

    const newLeaveType: Omit<LeaveType, "_id"> = { 
      ...leaveTypeForm,
      intervalValue: parseInt(leaveTypeForm.intervalValue) || 0,
      minContinuousWorkDays: parseInt(leaveTypeForm.minContinuousWorkDays) || 0,
      maxCarryForward: parseInt(leaveTypeForm.maxCarryForward) || 0,
      maxEncashable: parseInt(leaveTypeForm.maxEncashable) || 0,
      maxNegativeBalance: parseInt(leaveTypeForm.maxNegativeBalance) || 0,
    };

    try {
      // If we have a selected policy (editing existing policy), call the API
      if (selectedPolicy) {
        await createLeaveType(selectedPolicy._id, newLeaveType);
        
        // Refresh the selected policy to show the new leave type
        const response = await getLeavePolicy(selectedPolicy._id);
        setSelectedPolicy(response.data);
        
        // Also refresh the policies list
        const policiesResponse = await getLeavePolicies();
        setPolicies(policiesResponse.data);
      } else {
        // If creating a new policy, just add to local state
        setCurrentLeaveTypes([...currentLeaveTypes, newLeaveType]);
      }

      setLeaveTypeForm({
        type: "",
        interval: "",
        intervalValue: "",
        carryForward: false,
        maxCarryForward: "",
        encashable: false,
        maxEncashable: "",
        probationApplicable: true,
        expireMonthly: false,
        minContinuousWorkDays: "",
        allowNegativeBalance: false,
        maxNegativeBalance: "",
        allowUnpaidLeave: false,
      });

      setIsModalOpen(false);
      toast({
        title: "Success",
        description: "Leave type added successfully",
      });
    } catch (error) {
      console.error("Error adding leave type:", error);
      toast({
        title: "Error",
        description: "Failed to add leave type. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingLeaveType(false);
    }
  };

  const removeLeaveType = (index: number) => {
    const updatedTypes = currentLeaveTypes.filter((_, i) => i !== index);
    setCurrentLeaveTypes(updatedTypes);
    toast({
      title: "Removed",
      description: "Leave type removed",
    });
  };

  const handleEditPolicy = async (policyId: string) => {
    try {
      const response = await getLeavePolicy(policyId);
      if (response.success) {
        setSelectedPolicy(response.data);
        setEditPolicyForm({
          name: response.data.name,
          effectiveFrom: response.data.effectiveFrom,
          effectiveTo: response.data.effectiveTo,
          isDefault: response.data.isDefault,
          isActive: response.data.isActive,
        });
        setIsEditModalOpen(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch policy data",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePolicy = async () => {
    if (!selectedPolicy) return;

    try {
      const payload: UpdateLeavePolicyPayload = {
        name: editPolicyForm.name,
        effectiveFrom: editPolicyForm.effectiveFrom,
        effectiveTo: editPolicyForm.effectiveTo,
        isDefault: editPolicyForm.isDefault,
        isActive: editPolicyForm.isActive,
      };

      await updateLeavePolicy(selectedPolicy._id, payload);
      toast({
        title: "Success",
        description: "Policy updated successfully!",
      });

      setIsEditModalOpen(false);
      setSelectedPolicy(null);
      fetchPolicies();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update policy",
        variant: "destructive",
      });
    }
  };

  const handleEditLeaveType = (leaveType: LeaveType) => {
    setEditingLeaveType(leaveType);
    setEditLeaveTypeForm({
      interval: leaveType.interval,
      intervalValue: leaveType.intervalValue.toString(),
      carryForward: leaveType.carryForward,
      maxCarryForward: leaveType.maxCarryForward.toString(),
      encashable: leaveType.encashable,
      maxEncashable: leaveType.maxEncashable.toString(),
      probationApplicable: leaveType.probationApplicable,
      expireMonthly: leaveType.expireMonthly,
      minContinuousWorkDays: leaveType.minContinuousWorkDays.toString(),
      allowNegativeBalance: leaveType.allowNegativeBalance,
      maxNegativeBalance: leaveType.maxNegativeBalance.toString(),
      allowUnpaidLeave: leaveType.allowUnpaidLeave,
    });
  };

  const handleUpdateLeaveType = async () => {
    if (!selectedPolicy || !editingLeaveType) return;

    try {
      const payload: UpdateLeaveTypePayload = { 
        ...editLeaveTypeForm,
        intervalValue: parseInt(editLeaveTypeForm.intervalValue) || 0,
        minContinuousWorkDays: parseInt(editLeaveTypeForm.minContinuousWorkDays) || 0,
        maxCarryForward: parseInt(editLeaveTypeForm.maxCarryForward) || 0,
        maxEncashable: parseInt(editLeaveTypeForm.maxEncashable) || 0,
        maxNegativeBalance: parseInt(editLeaveTypeForm.maxNegativeBalance) || 0,
      };
      await updateLeaveType(selectedPolicy._id, editingLeaveType._id!, payload);
      
      toast({
        title: "Success",
        description: "Leave type updated successfully!",
      });

      setEditingLeaveType(null);
      fetchPolicies();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update leave type",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-1 sm:px-3 md:px-6 py-4"
        style={{
          background:
            "linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)",
        }}
      >
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const activePolicy = policies.find((p) => p.isActive) || policies[0];
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const now = new Date();
  const monthStartLabel = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const monthEndLabel = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div
      className="min-h-screen px-1 sm:px-3 md:px-6 py-4"
      style={{
        background:
          "linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)",
      }}
    >
      <div className="w-full space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <h1 className="text-xl font-semibold tracking-wide" style={{color: '#2C373B'}}>Review the policy information and manage leave types</h1>
        </div>

        {isFormMode ? (
          <Card className="w-full shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle style={{color: '#2C373B'}}>Policy Basics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* form fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" style={{color: '#2C373B'}}>Policy Name *</Label>
                  <Input
                    id="name"
                    value={policyForm.name}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, name: e.target.value })
                    }
                    placeholder="Enter policy name"
                    style={{height: '36px', backgroundColor: 'rgb(209 250 229)'}}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="effectiveFrom" style={{color: '#2C373B'}}>Effective From *</Label>
                  <Input
                    id="effectiveFrom"
                    type="date"
                    value={policyForm.effectiveFrom}
                    onChange={(e) =>
                      setPolicyForm({
                        ...policyForm,
                        effectiveFrom: e.target.value,
                      })
                    }
                    style={{height: '36px', backgroundColor: 'rgb(209 250 229)'}}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="effectiveTo" style={{color: '#2C373B'}}>Effective To</Label>
                  <Input
                    id="effectiveTo"
                    type="date"
                    value={policyForm.effectiveTo}
                    onChange={(e) =>
                      setPolicyForm({
                        ...policyForm,
                        effectiveTo: e.target.value,
                      })
                    }
                    style={{height: '36px', backgroundColor: 'rgb(209 250 229)'}}
                  />
                </div>
              </div>

              {/* checkboxes */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isDefault"
                    checked={policyForm.isDefault}
                    onCheckedChange={(checked) =>
                      setPolicyForm({
                        ...policyForm,
                        isDefault: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="isDefault" style={{color: '#2C373B'}}>Default Policy</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={policyForm.isActive}
                    onCheckedChange={(checked) =>
                      setPolicyForm({
                        ...policyForm,
                        isActive: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="isActive" style={{color: '#2C373B'}}>Active</Label>
                </div>
              </div>

              {/* added leave types */}
              {currentLeaveTypes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold" style={{color: '#2C373B'}}>Added Leave Types</h3>
                  <div className="space-y-2">
                    {currentLeaveTypes.map((leaveType, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm"
                      >
                        <div>
                          <span className="font-medium capitalize">
                            {leaveType.type}
                          </span>
                          <span className="text-sm text-gray-500 ml-2">
                            {leaveType.intervalValue} / {leaveType.interval}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeLeaveType(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(true)}
                  className="hover:opacity-90"
                  style={{ backgroundColor: '#E8F8F3', color: '#2D7A5A', borderColor: '#4CDC9C' }}
                  disabled={addingLeaveType}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {addingLeaveType ? "Adding..." : "Add Leave Type"}
                </Button>
                <Button
                  onClick={handleCreatePolicy}
                  className="hover:opacity-90"
                  style={{ backgroundColor: '#4CDC9C' }}
                  disabled={currentLeaveTypes.length === 0}
                >
                  Create Policy
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg rounded-2xl">
            <CardHeader className="px-3 py-3 sm:px-5 sm:py-5">
              <CardTitle>Existing Leave Policies</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-5 pt-0">
              {/* Banner above table */}
              <div className="mb-4">
                <div className="bg-[#2C373B] text-white rounded-2xl px-3 py-4 md:px-6 md:py-5 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="text-sm md:text-base font-medium">Leave Policy details</div>
                    <div className="space-y-0.5">
                      <div className="text-xs md:text-sm font-medium text-white/90">Annual Leave Policy</div>
                      <div className="text-xs md:text-sm text-gray-300">{monthStartLabel} - {monthEndLabel}</div>
                    </div>
                  </div>
                  <div className="text-emerald-400 font-semibold">Active</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#2C373B] hover:bg-[#2C373B]">
                      <TableHead className="text-white hover:text-white" style={{fontSize: '12px', fontWeight: 600}}>Leave Types</TableHead>
                      <TableHead className="text-white hover:text-white" style={{fontSize: '12px', fontWeight: 600}}>Leave cycle</TableHead>
                      <TableHead className="text-white hover:text-white" style={{fontSize: '12px', fontWeight: 600}}>Leave days</TableHead>
                      <TableHead className="text-white hover:text-white" style={{fontSize: '12px', fontWeight: 600}}>Carry Forward</TableHead>
                      <TableHead className="text-white hover:text-white" style={{fontSize: '12px', fontWeight: 600}}>Encashment</TableHead>
                      <TableHead className="text-white hover:text-white" style={{fontSize: '12px', fontWeight: 600}}>Probation Applicable</TableHead>
                      <TableHead className="text-white hover:text-white" style={{fontSize: '12px', fontWeight: 600}}>Continuous days(Min)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policies.map((policy) =>
                      policy.leaveTypes.map((leaveType, index) => {
                        const typeBgClass = (() => {
                          switch ((leaveType.type || '').toLowerCase()) {
                            case 'casual':
                              return 'bg-green-300';
                            case 'earned':
                              return 'bg-rose-300';
                            case 'medical':
                              return 'bg-yellow-300';
                            case 'maternity':
                              return 'bg-violet-300';
                            case 'paternity':
                              return 'bg-sky-300';
                            case 'other':
                            case 'others':
                              return 'bg-gray-300';
                            default:
                              return 'bg-gray-300';
                          }
                        })();
                        return (
                          <TableRow key={`${policy._id}-${index}`}>
                            {/* Leave Types (colored cell) */}
                            <TableCell className={`capitalize ${typeBgClass}`} style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>
                              {leaveType.type}
                            </TableCell>
                            {/* Leave cycle (interval) */}
                            <TableCell className="capitalize" style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>
                              {leaveType.interval}
                            </TableCell>
                            {/* Leave days (limit) */}
                            <TableCell style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>{leaveType.intervalValue}</TableCell>
                            {/* Carry Forward */}
                            <TableCell style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>
                              {leaveType.carryForward ? 'Yes' : 'No'}
                            </TableCell>
                            {/* Encashment */}
                            <TableCell style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>
                              {leaveType.encashable ? 'Yes' : 'No'}
                            </TableCell>
                            {/* Probation Applicable */}
                            <TableCell style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>
                              {leaveType.probationApplicable ? 'Yes' : 'No'}
                            </TableCell>
                            {/* Continuous days(Min) */}
                            <TableCell style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>
                              {leaveType.minContinuousWorkDays || 'N/A'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle style={{color: '#2C373B'}}>Add Leave Type</DialogTitle>
            </DialogHeader>
            {/* modal form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              {/* Leave type dropdown */}
              <div className="space-y-2">
                <Label style={{color: '#2C373B'}}>Leave Type *</Label>
                <Select
                  value={leaveTypeForm.type}
                  onValueChange={(value) =>
                    setLeaveTypeForm({ ...leaveTypeForm, type: value })
                  }
                >
                  <SelectTrigger style={{height: '36px', backgroundColor: 'rgb(209 250 229)'}}>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Interval dropdown */}
              <div className="space-y-2">
                <Label style={{color: '#2C373B'}}>Interval *</Label>
                <Select
                  value={leaveTypeForm.interval}
                  onValueChange={(value) =>
                    setLeaveTypeForm({ ...leaveTypeForm, interval: value })
                  }
                >
                  <SelectTrigger style={{height: '36px', backgroundColor: 'rgb(209 250 229)'}}>
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {intervalOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Inputs */}
              <div className="space-y-2">
                <Label style={{color: '#2C373B'}}>Interval Value *</Label>
                <Input
                  type="number"
                  value={leaveTypeForm.intervalValue}
                  onChange={(e) =>
                    setLeaveTypeForm({
                      ...leaveTypeForm,
                      intervalValue: e.target.value,
                    })
                  }
                  placeholder="e.g. 2"
                  style={{height: '36px', backgroundColor: 'rgb(209 250 229)'}}
                />
              </div>

              <div className="space-y-2">
                <Label style={{color: '#2C373B'}}>Min Continuous Work Days</Label>
                <Input
                  type="number"
                  value={leaveTypeForm.minContinuousWorkDays}
                  onChange={(e) =>
                    setLeaveTypeForm({
                      ...leaveTypeForm,
                      minContinuousWorkDays: e.target.value,
                    })
                  }
                  placeholder="Enter min work days"
                  style={{height: '36px', backgroundColor: 'rgb(209 250 229)'}}
                />
              </div>

              {/* checkboxes */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={leaveTypeForm.carryForward}
                  onCheckedChange={(checked) =>
                    setLeaveTypeForm({
                      ...leaveTypeForm,
                      carryForward: checked as boolean,
                    })
                  }
                />
                <Label style={{color: '#2C373B'}}>Carry Forward</Label>
              </div>

              {leaveTypeForm.carryForward && (
                <div className="space-y-2">
                  <Label>Max Carry Forward</Label>
                  <Input
                    type="number"
                    value={leaveTypeForm.maxCarryForward}
                    placeholder="Enter max carry forward days"
                    onChange={(e) =>
                      setLeaveTypeForm({
                        ...leaveTypeForm,
                        maxCarryForward: e.target.value,
                      })
                    }
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={leaveTypeForm.encashable}
                  onCheckedChange={(checked) =>
                    setLeaveTypeForm({
                      ...leaveTypeForm,
                      encashable: checked as boolean,
                    })
                  }
                />
                <Label style={{color: '#2C373B'}}>Encashable</Label>
              </div>

              {leaveTypeForm.encashable && (
                <div className="space-y-2">
                  <Label>Max Encashable</Label>
                  <Input
                    type="number"
                    value={leaveTypeForm.maxEncashable}
                    placeholder="Enter max encashable days"
                    onChange={(e) =>
                      setLeaveTypeForm({
                        ...leaveTypeForm,
                        maxEncashable: e.target.value,
                      })
                    }
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={leaveTypeForm.allowNegativeBalance}
                  onCheckedChange={(checked) =>
                    setLeaveTypeForm({
                      ...leaveTypeForm,
                      allowNegativeBalance: checked as boolean,
                    })
                  }
                />
                <Label>Allow Negative Balance</Label>
              </div>

              {leaveTypeForm.allowNegativeBalance && (
                <div className="space-y-2">
                  <Label>Max Negative Balance</Label>
                  <Input
                    type="number"
                    value={leaveTypeForm.maxNegativeBalance}
                    placeholder="Enter max negative balance days"
                    onChange={(e) =>
                      setLeaveTypeForm({
                        ...leaveTypeForm,
                        maxNegativeBalance: e.target.value,
                      })
                    }
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={leaveTypeForm.expireMonthly}
                  onCheckedChange={(checked) =>
                    setLeaveTypeForm({
                      ...leaveTypeForm,
                      expireMonthly: checked as boolean,
                    })
                  }
                />
                <Label style={{color: '#2C373B'}}>Expire Monthly</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={leaveTypeForm.probationApplicable}
                  onCheckedChange={(checked) =>
                    setLeaveTypeForm({
                      ...leaveTypeForm,
                      probationApplicable: checked as boolean,
                    })
                  }
                />
                <Label style={{color: '#2C373B'}}>Applicable in Probation</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={leaveTypeForm.allowUnpaidLeave}
                  onCheckedChange={(checked) =>
                    setLeaveTypeForm({
                      ...leaveTypeForm,
                      allowUnpaidLeave: checked as boolean,
                    })
                  }
                />
                <Label style={{color: '#2C373B'}}>Allow Unpaid Leave</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
                disabled={addingLeaveType}
                style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
              >
                Cancel
              </Button>
              <Button
                  onClick={handleAddLeaveType}
                  className="hover:opacity-90"
                  style={{ backgroundColor: '#4CDC9C', color: '#2C373B' }}
                  disabled={addingLeaveType}
                >
                {addingLeaveType ? "Adding..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Policy Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle style={{color: '#2C373B'}}>Edit Policy</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Policy Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" style={{color: '#2C373B'}}>Policy Name *</Label>
                  <Input
                    id="edit-name"
                    value={editPolicyForm.name}
                    onChange={(e) =>
                      setEditPolicyForm({ ...editPolicyForm, name: e.target.value })
                    }
                    placeholder="Enter policy name"
                    style={{height: '36px', backgroundColor: 'rgb(209 250 229)'}}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-effective-from" style={{color: '#2C373B'}}>Effective From *</Label>
                  <Input
                    id="edit-effective-from"
                    type="date"
                    value={editPolicyForm.effectiveFrom}
                    onChange={(e) =>
                      setEditPolicyForm({ ...editPolicyForm, effectiveFrom: e.target.value })
                    }
                    style={{height: '36px', backgroundColor: 'rgb(209 250 229)'}}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-effective-to" style={{color: '#2C373B'}}>Effective To (Optional)</Label>
                  <Input
                    id="edit-effective-to"
                    type="date"
                    value={editPolicyForm.effectiveTo}
                    onChange={(e) =>
                      setEditPolicyForm({ ...editPolicyForm, effectiveTo: e.target.value })
                    }
                    style={{height: '36px', backgroundColor: 'rgb(209 250 229)'}}
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={editPolicyForm.isDefault}
                    onCheckedChange={(checked) =>
                      setEditPolicyForm({ ...editPolicyForm, isDefault: checked as boolean })
                    }
                  />
                  <Label style={{color: '#2C373B'}}>Use as Default Policy</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={editPolicyForm.isActive}
                    onCheckedChange={(checked) =>
                      setEditPolicyForm({ ...editPolicyForm, isActive: checked as boolean })
                    }
                  />
                  <Label style={{color: '#2C373B'}}>Active</Label>
                </div>
              </div>

              {/* Leave Types List */}
              {selectedPolicy && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold" style={{color: '#2C373B'}}>Leave Types</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsModalOpen(true)}
                      className="hover:opacity-90"
                      style={{ backgroundColor: '#E8F8F3', color: '#2D7A5A', borderColor: '#4CDC9C' }}
                      disabled={addingLeaveType}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {addingLeaveType ? "Adding..." : "Add Leave Type"}
                    </Button>
                  </div>
                  {selectedPolicy.leaveTypes.length > 0 ? (
                    <div className="space-y-2">
                      {selectedPolicy.leaveTypes.map((leaveType, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm"
                        >
                          <div>
                            <span className="font-medium capitalize">
                              {leaveType.type}
                            </span>
                            <span className="text-sm text-gray-500 ml-2">
                              {leaveType.intervalValue} / {leaveType.interval}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditLeaveType(leaveType)}
                            style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm" style={{color: '#2C373B'}}>No leave types added yet.</p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)} style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdatePolicy}
                  className="hover:opacity-90"
                  style={{ backgroundColor: '#4CDC9C', color: '#2C373B' }}
                >
                  Update Policy
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Leave Type Modal */}
        <Dialog open={!!editingLeaveType} onOpenChange={() => setEditingLeaveType(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle style={{color: '#2C373B'}}>Edit Leave Type - {editingLeaveType?.type}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              {/* Interval dropdown */}
              <div className="space-y-2">
                <Label style={{color: '#2C373B'}}>Interval *</Label>
                <Select
                  value={editLeaveTypeForm.interval}
                  onValueChange={(value) =>
                    setEditLeaveTypeForm({ ...editLeaveTypeForm, interval: value })
                  }
                >
                  <SelectTrigger style={{height: '36px', backgroundColor: 'rgb(209 250 229)'}}>
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {intervalOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Interval value */}
              <div className="space-y-2">
                <Label style={{color: '#2C373B'}}>Interval Value *</Label>
                <Input
                  type="number"
                  value={editLeaveTypeForm.intervalValue}
                  onChange={(e) =>
                    setEditLeaveTypeForm({
                      ...editLeaveTypeForm,
                      intervalValue: e.target.value,
                    })
                  }
                  placeholder="Enter interval value"
                  style={{height: '36px', backgroundColor: 'rgb(209 250 229)'}}
                />
              </div>

              {/* Max Carry Forward */}
              <div className="space-y-2">
                <Label style={{color: '#2C373B'}}>Max Carry Forward</Label>
                <Input
                  type="number"
                  value={editLeaveTypeForm.maxCarryForward}
                  onChange={(e) =>
                    setEditLeaveTypeForm({
                      ...editLeaveTypeForm,
                      maxCarryForward: e.target.value,
                    })
                  }
                  placeholder="Enter max carry forward"
                  style={{height: '36px', backgroundColor: 'rgb(209 250 229)'}}
                />
              </div>

              {/* Max Encashable */}
              <div className="space-y-2">
                <Label style={{color: '#2C373B'}}>Max Encashable</Label>
                <Input
                  type="number"
                  value={editLeaveTypeForm.maxEncashable}
                  onChange={(e) =>
                    setEditLeaveTypeForm({
                      ...editLeaveTypeForm,
                      maxEncashable: e.target.value,
                    })
                  }
                  placeholder="Enter max encashable"
                  style={{height: '36px', backgroundColor: 'rgb(209 250 229)'}}
                />
              </div>

              {/* Min Continuous Work Days */}
              <div className="space-y-2">
                <Label style={{color: '#2C373B'}}>Min Continuous Work Days</Label>
                <Input
                  type="number"
                  value={editLeaveTypeForm.minContinuousWorkDays}
                  onChange={(e) =>
                    setEditLeaveTypeForm({
                      ...editLeaveTypeForm,
                      minContinuousWorkDays: e.target.value,
                    })
                  }
                  placeholder="Enter min work days"
                  style={{height: '36px', backgroundColor: 'rgb(209 250 229)'}}
                />
              </div>

              {/* Max Negative Balance */}
              <div className="space-y-2">
                <Label style={{color: '#2C373B'}}>Max Negative Balance</Label>
                <Input
                  type="number"
                  value={editLeaveTypeForm.maxNegativeBalance}
                  onChange={(e) =>
                    setEditLeaveTypeForm({
                      ...editLeaveTypeForm,
                      maxNegativeBalance: e.target.value,
                    })
                  }
                  placeholder="Enter max negative balance"
                  style={{height: '36px', backgroundColor: 'rgb(209 250 229)'}}
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={editLeaveTypeForm.carryForward}
                  onCheckedChange={(checked) =>
                    setEditLeaveTypeForm({
                      ...editLeaveTypeForm,
                      carryForward: checked as boolean,
                    })
                  }
                />
                <Label>Carry Forward</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={editLeaveTypeForm.allowNegativeBalance}
                  onCheckedChange={(checked) =>
                    setEditLeaveTypeForm({
                      ...editLeaveTypeForm,
                      allowNegativeBalance: checked as boolean,
                    })
                  }
                />
                <Label style={{color: '#2C373B'}}>Allow Negative balance</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={editLeaveTypeForm.encashable}
                  onCheckedChange={(checked) =>
                    setEditLeaveTypeForm({
                      ...editLeaveTypeForm,
                      encashable: checked as boolean,
                    })
                  }
                />
                <Label>Encashable</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={editLeaveTypeForm.expireMonthly}
                  onCheckedChange={(checked) =>
                    setEditLeaveTypeForm({
                      ...editLeaveTypeForm,
                      expireMonthly: checked as boolean,
                    })
                  }
                />
                <Label>Expire Monthly</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={editLeaveTypeForm.probationApplicable}
                  onCheckedChange={(checked) =>
                    setEditLeaveTypeForm({
                      ...editLeaveTypeForm,
                      probationApplicable: checked as boolean,
                    })
                  }
                />
                <Label>Applicable in Probation</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={editLeaveTypeForm.allowUnpaidLeave}
                  onCheckedChange={(checked) =>
                    setEditLeaveTypeForm({
                      ...editLeaveTypeForm,
                      allowUnpaidLeave: checked as boolean,
                    })
                  }
                />
                <Label>Allow Unpaid Leave</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setEditingLeaveType(null)} style={{backgroundColor: '#4CDC9C', color: '#2C373B'}}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateLeaveType}
                className="hover:opacity-90"
                style={{ backgroundColor: '#4CDC9C', color: '#2C373B' }}
              >
                Update Leave Type
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default LeavePolicy;
