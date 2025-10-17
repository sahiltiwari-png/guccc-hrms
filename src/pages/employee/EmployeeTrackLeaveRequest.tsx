import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getLeaveRequests, LeaveRequest, cancelLeaveRequest } from "@/api/leaves";
import { getLeavePolicies, LeavePolicy } from "@/api/leavePolicy";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

const statusOptions = [
  { label: "Applied", value: "applied" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Cancelled", value: "cancelled" },
];

const ALLOWED_TYPES = ["casual", "medical", "earned", "maternity", "paternity", "other", "sick"];

const TrackLeaveRequest = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<string>("");
  const [leaveType, setLeaveType] = useState<string>("");
  const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const truncatePreview = (text: string, maxWords: number = 8) => {
    const words = (text || '').trim().split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return text || '';
    return `${words.slice(0, maxWords).join(' ')}...`;
  };
  const leaveTypeItems = useMemo(() => {
    const items: string[] = [];
    leavePolicies.forEach((p) => {
      p.leaveTypes.forEach((lt) => {
        const t = (lt.type || '').toLowerCase();
        if (ALLOWED_TYPES.includes(t)) {
          items.push(lt.type);
        }
      });
    });
    // Deduplicate
    return Array.from(new Set(items));
  }, [leavePolicies]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  // Fetch when filters change
  useEffect(() => {
    const id = (user as any)?._id || (user as any)?.id;
    if (id) {
      fetchRequests(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, leaveType]);

  // Fetch once the user is available
  useEffect(() => {
    const id = (user as any)?._id || (user as any)?.id;
    if (id) {
      fetchRequests(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchRequests = async (p: number) => {
    try {
      const id = (user as any)?._id || (user as any)?.id;
      if (!id) return;
      setLoading(true);
      const res = await getLeaveRequests(
        p,
        limit,
        status || undefined,
        [id],
        leaveType ? (leaveType || '').toLowerCase() : undefined
      );
      const filtered = leaveType
        ? res.items.filter((i) => (i.leaveType || '').toLowerCase() === (leaveType || '').toLowerCase())
        : res.items;
      setRequests(filtered);
      setTotal(filtered.length);
      setPage(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Load leave types when dropdown opens
  const handleLeaveTypeOpen = async (open: boolean) => {
    if (!open) return;
    try {
      const res = await getLeavePolicies();
      const policies = Array.isArray(res?.data) ? res.data : [];
      setLeavePolicies(policies);
    } catch (err) {
      console.error('Failed to load leave policies', err);
    }
  };

  const handlePrev = () => {
    if (page > 1) fetchRequests(page - 1);
  };
  const handleNext = () => {
    if (page < totalPages) fetchRequests(page + 1);
  };

  const handleConfirmCancel = async () => {
    if (!cancelId) return;
    try {
      setConfirmLoading(true);
      const res = await cancelLeaveRequest(cancelId);
      await fetchRequests(page);
      setConfirmOpen(false);
      setCancelId(null);
      toast({ title: "Cancelled", description: res?.message || "Request cancelled successfully" });
    } catch (err: any) {
      console.error("Cancel failed", err);
      toast({
        title: "Cancel failed",
        description: err?.response?.data?.message || "Could not cancel the request",
        variant: "destructive",
      });
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen px-1 sm:px-3 md:px-6 py-4"
      style={{
        fontFamily: "Montserrat",
        background:
          "linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)",
      }}
    >
      <TooltipProvider>
      <h1 className="text-3xl lg:text-4xl font-bold mb-6" style={{ color: "#2C373B" }}>Track Leave request</h1>

      <div className="bg-white rounded-2xl shadow-md border p-4 lg:p-6">
        {/* Header with avatar, name and filters */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          {/* Avatar removed per request */}
          <div className="flex-1"></div>

          <div className="flex items-center gap-4">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40 h-8 rounded-lg border border-[#9AE6B4] bg-[rgb(209,250,229)] text-[#2C373B]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onOpenChange={handleLeaveTypeOpen} value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger className="w-44 h-8 rounded-lg border border-[#9AE6B4] bg-[rgb(209,250,229)] text-[#2C373B]">
                <SelectValue placeholder="Leave type" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypeItems.length === 0 ? (
                  <div className="px-2 py-2 text-sm text-gray-500" role="none">No leave types</div>
                ) : (
                  leaveTypeItems.map((t) => (
                    <SelectItem key={t} value={(t || '').toLowerCase()}>{t}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <button className="text-emerald-600 font-medium hover:underline" onClick={() => { setStatus(""); setLeaveType(""); fetchRequests(1); }}>Clear filters</button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#2C373B] hover:bg-[#2C373B]">
                <TableHead className="text-white hover:text-white" style={{fontSize: '12px', fontWeight: 600}}>Leave type</TableHead>
                <TableHead className="text-white hover:text-white" style={{fontSize: '12px', fontWeight: 600}}>Start date</TableHead>
                <TableHead className="text-white hover:text-white" style={{fontSize: '12px', fontWeight: 600}}>End Date</TableHead>
                <TableHead className="text-white hover:text-white" style={{fontSize: '12px', fontWeight: 600}}>Reason</TableHead>
                <TableHead className="text-white hover:text-white" style={{fontSize: '12px', fontWeight: 600}}>Total days</TableHead>
                <TableHead className="text-white hover:text-white" style={{fontSize: '12px', fontWeight: 600}}>Status</TableHead>
                <TableHead className="text-white hover:text-white" style={{fontSize: '12px', fontWeight: 600}}>Add Remark</TableHead>
                <TableHead className="text-white hover:text-white" style={{fontSize: '12px', fontWeight: 600}}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-600">Loading...</TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8" style={{ color: "#2C373B" }}>No leave requests found</TableCell>
                </TableRow>
              ) : (
                requests.map((req) => {
                  const start = new Date(req.startDate);
                  const end = new Date(req.endDate);
                  const startFmt = start.toLocaleDateString(undefined, { day: "numeric", month: "long" });
                  const endFmt = end.toLocaleDateString(undefined, { day: "numeric", month: "long" });
                  const statusColor = req.status === "approved" ? "text-emerald-600" : req.status === "rejected" ? "text-red-600" : "text-yellow-600";
                  const rowBg = req.status === "approved" ? "bg-emerald-50" : req.status === "rejected" ? "bg-rose-50" : "bg-amber-50";
                  return (
                    <TableRow key={req._id} className={`${rowBg}`}>
                      <TableCell className="capitalize" style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>{req.leaveType}</TableCell>
                      <TableCell style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>{startFmt}</TableCell>
                      <TableCell style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>{endFmt}</TableCell>
                      <TableCell style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>
                        {req.reason ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{truncatePreview(req.reason)}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="max-w-xs break-words">{req.reason}</div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span>-</span>
                        )}
                      </TableCell>
                      <TableCell style={{fontSize: '14px', fontWeight: 500, color: '#2C373B'}}>{req.days} days</TableCell>
                      <TableCell className={`font-medium ${statusColor}`}>{req.status}</TableCell>
                      <TableCell className="text-gray-500">
                        {req.remarks ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{truncatePreview(req.remarks)}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="max-w-xs break-words">{req.remarks}</div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span>-</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {["pending", "applied"].includes((req.status || '').toLowerCase()) ? (
                          <button
                            className="text-blue-600 hover:underline whitespace-nowrap"
                            onClick={() => {
                              setCancelId(req._id);
                              setConfirmOpen(true);
                            }}
                          >
                            Cancel request
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-2 text-gray-600">
            <span>Prev</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-md" onClick={handlePrev} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 py-1 rounded bg-gray-100">{page}</span>
            <Button variant="outline" className="rounded-md" onClick={handleNext} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span>Next</span>
          </div>
        </div>
      </div>
      {/* Cancel confirmation modal */}
      <AlertDialog open={confirmOpen} onOpenChange={(o) => setConfirmOpen(o)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel leave request?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will cancel your leave request. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmLoading}>No</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={confirmLoading}
            >
              {confirmLoading ? "Cancelling..." : "Yes, cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </TooltipProvider>
    </div>
  );
};

export default TrackLeaveRequest;