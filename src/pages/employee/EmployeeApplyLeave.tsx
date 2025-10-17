import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Upload, Send } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { uploadFile } from '@/api/uploadFile';
import { getLeavePolicies, LeavePolicy } from '@/api/leavePolicy';
import { createLeaveRequest, getLeaveRequests, LeaveRequestsResponse, cancelLeaveRequest } from '@/api/leaves';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { ClipboardList, X } from 'lucide-react';

const ApplyLeave = () => {
  const { user } = useAuth();
  if (user?.role === 'superAdmin') {
    return <Navigate to="/dashboard" replace />;
  }
  const [showForm, setShowForm] = useState(true);
  const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>([]);
  const [leaveTypeId, setLeaveTypeId] = useState<string>('');
  const [leaveTypeLabel, setLeaveTypeLabel] = useState<string>('');
  const [leavePolicyId, setLeavePolicyId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [days, setDays] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [documentUrl, setDocumentUrl] = useState<string | undefined>();
  const [documentUrls, setDocumentUrls] = useState<string[]>([]);
  const [documentPreviews, setDocumentPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<LeaveRequestsResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [successOpen, setSuccessOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [daysManuallyEdited, setDaysManuallyEdited] = useState(false);
  const navigate = useNavigate();

  // Compute days when dates chosen
  useEffect(() => {
    if (daysManuallyEdited) return;
    if (startDate && endDate) {
      const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      setDays(diff > 0 ? diff : 0);
    } else {
      setDays(0);
    }
  }, [startDate, endDate, daysManuallyEdited]);

  // Fetch leave types when user opens the dropdown
  const handleOpenLeaveType = async () => {
    try {
      const res = await getLeavePolicies();
      const policies = Array.isArray(res?.data) ? res.data : [];
      setLeavePolicies(policies);
    } catch (err) {
      console.error('Failed to load leave policies', err);
    }
  };

  const ALLOWED_TYPES = ['casual', 'medical', 'earned', 'maternity', 'paternity', 'other'];
  const leaveTypeItems = useMemo(() => {
    const items: { id: string; type: string; policyId: string }[] = [];
    leavePolicies.forEach((p) => {
      p.leaveTypes.forEach((lt) => {
        const t = (lt.type || '').toLowerCase();
        if (lt._id && ALLOWED_TYPES.includes(t)) {
          items.push({ id: lt._id, type: lt.type, policyId: p._id });
        }
      });
    });
    return items;
  }, [leavePolicies]);

  const handleLeaveTypeSelect = (value: string) => {
    const found = leaveTypeItems.find((i) => i.id === value);
    if (found) {
      setLeaveTypeId(found.id);
      setLeaveTypeLabel(found.type);
      setLeavePolicyId(found.policyId);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    const existingCount = documentUrls.length;
    const availableSlots = Math.max(0, 5 - existingCount);
    const toUpload = files.slice(0, availableSlots);
    if (toUpload.length === 0) {
      alert('You can upload up to 5 images.');
      e.currentTarget.value = '';
      return;
    }
    setUploading(true);
    try {
      const uploaded: string[] = [];
      const previews: string[] = [];
      for (const file of toUpload) {
        const url = await uploadFile(file);
        uploaded.push(url);
        if (file.type.startsWith('image/')) {
          previews.push(url);
        }
      }
      const nextUrls = [...documentUrls, ...uploaded].slice(0, 5);
      const nextPreviews = [...documentPreviews, ...previews].slice(0, 5);
      setDocumentUrls(nextUrls);
      setDocumentPreviews(nextPreviews);
      // Maintain legacy single URL (first)
      if (!documentUrl && nextUrls.length > 0) {
        setDocumentUrl(nextUrls[0]);
      }
    } catch (err) {
      console.error('File upload failed', err);
      alert('File upload failed');
    } finally {
      setUploading(false);
      e.currentTarget.value = '';
    }
  };

  const removeDocumentAt = (idx: number) => {
    const nextUrls = documentUrls.filter((_, i) => i !== idx);
    setDocumentUrls(nextUrls);
    const nextPreviews = documentPreviews.filter((_, i) => i !== idx);
    setDocumentPreviews(nextPreviews);
    // keep legacy single documentUrl in sync
    setDocumentUrl(nextUrls[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const employeeId = user?._id || user?.id;
    if (!employeeId || !startDate || !endDate || !leaveTypeId || !leavePolicyId) {
      alert('Please complete all fields');
      return;
    }
    const payload = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      reason,
      leavePolicyId,
      leaveTypeId,
      leaveType: leaveTypeLabel,
      days,
      employeeId,
      documentUrl,
      documentUrls: documentUrls.length ? documentUrls : undefined,
    };
    setSubmitting(true);
    try {
      await createLeaveRequest(payload);
      setShowForm(false);
      setSuccessOpen(true);
      fetchRequests();
    } catch (err: any) {
      console.error('Submit failed', err);
      alert(err?.response?.data?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-close success modal and redirect to Track Leave after short delay
  useEffect(() => {
    if (!successOpen) return;
    const t = setTimeout(() => {
      setSuccessOpen(false);
      navigate('/leaves/track');
    }, 2000);
    return () => clearTimeout(t);
  }, [successOpen, navigate]);

  const fetchRequests = async (page: number = 1) => {
    try {
      const id = user?._id || user?.id;
      const res = await getLeaveRequests(page, 10, statusFilter || undefined, id ? [id] : undefined);
      setRequests(res);
    } catch (err) {
      console.error('Failed to load leave requests', err);
    }
  };

  useEffect(() => {
    if (!showForm) fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter]);

  const renderForm = () => (
    <Card className="max-w-4xl mx-auto rounded-2xl shadow-lg bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Apply for Leave</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Leave Type</Label>
            <Select onOpenChange={(open) => open && handleOpenLeaveType()} value={leaveTypeId} onValueChange={handleLeaveTypeSelect}>
              <SelectTrigger className="h-8 bg-[rgb(209,250,229)] text-[#2C373B] hover:bg-green-100 hover:border-[#9AE6B4]">
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypeItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover open={startOpen} onOpenChange={setStartOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal bg-[rgb(209,250,229)] text-[#2C373B] hover:bg-green-100 hover:border-[#9AE6B4]', !startDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      setStartOpen(false);
                      setDaysManuallyEdited(false);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover open={endOpen} onOpenChange={setEndOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal bg-[rgb(209,250,229)] text-[#2C373B] hover:bg-green-100 hover:border-[#9AE6B4]', !endDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      setEndDate(date);
                      setEndOpen(false);
                      setDaysManuallyEdited(false);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Total Leave days</Label>
              <input
                type="number"
                min={0}
                value={days}
                onChange={(e) => {
                  const val = parseInt(e.target.value || '0', 10);
                  setDays(isNaN(val) ? 0 : val);
                  setDaysManuallyEdited(true);
                }}
                className="h-10 border rounded-md flex items-center px-3 bg-[rgb(209,250,229)] text-[#2C373B] hover:bg-green-100 hover:border-[#9AE6B4]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for leave" className="bg-[rgb(209,250,229)] text-[#2C373B] hover:bg-green-100 hover:border-[#9AE6B4]" />
          </div>

          <div className="space-y-2">
            <Label>Documents (max 5)</Label>
            <div className="flex flex-wrap gap-3">
              {documentPreviews.length > 0 ? (
                documentPreviews.map((src, idx) => (
                  <div key={idx} className="relative h-20 w-20 border rounded-lg bg-[rgb(209,250,229)] overflow-hidden">
                    <img src={src} alt={`doc-${idx}`} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeDocumentAt(idx)} className="absolute top-1 right-1 bg-white/80 rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="h-20 w-20 border rounded-lg bg-[rgb(209,250,229)] flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              {/* non-image files indicator */}
              {documentUrls.length > documentPreviews.length && (
                <span className="text-xs text-muted-foreground">{documentUrls.length - documentPreviews.length} file(s) attached</span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="w-full sm:w-auto border rounded-md p-2 bg-white text-[#2C373B] hover:border-[#9AE6B4]"
              />
              <span className="text-xs text-muted-foreground break-words sm:whitespace-nowrap">You can upload up to 5 images.</span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="bg-[#4CDC9C] text-[#2C373B] hover:bg-[#3fd18e]" disabled={submitting || uploading}>
              <Send className="mr-2 h-4 w-4" />
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const statusToBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'approved') return <Badge className="hrms-status-success">Approved</Badge>;
    if (s === 'pending' || s === 'applied') return <Badge className="hrms-status-warning">Pending</Badge>;
    if (s === 'rejected' || s === 'declined') return <Badge className="hrms-status-error">Declined</Badge>;
    return <Badge>{status}</Badge>;
  };

  const renderTable = () => (
    <div className="max-w-5xl mx-auto">
      {requests?.items?.[0]?.employeeId && (
        <div className="flex items-center gap-3 mb-4">
          <img
            src={(requests.items[0].employeeId as any).profilePhotoUrl}
            alt="profile"
            className="h-10 w-10 rounded-full object-cover"
            onError={(e) => ((e.currentTarget.src = '/placeholder.svg'))}
          />
          <div>
            <div className="font-semibold">
              {(requests.items[0].employeeId as any).firstName} {(requests.items[0].employeeId as any).lastName}
            </div>
            <div className="text-xs text-muted-foreground">{(requests.items[0].employeeId as any).employeeCode}</div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Track Leave request</h2>
        <Button className="bg-[#4CDC9C] text-[#2C373B] hover:bg-[#3fd18e]" onClick={() => setShowForm(true)}>Request Leave</Button>
      </div>
      <div className="flex gap-3 mb-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-8 bg-[rgb(209,250,229)] text-[#2C373B] border border-[#9AE6B4]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
            <SelectItem value="rejected">Declined</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 h-8 bg-[rgb(209,250,229)] text-[#2C373B] border border-[#9AE6B4]"><SelectValue placeholder="Leave type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="casual">casual</SelectItem>
            <SelectItem value="medical">medical</SelectItem>
            <SelectItem value="earned">earned</SelectItem>
            <SelectItem value="maternity">maternity</SelectItem>
            <SelectItem value="paternity">paternity</SelectItem>
            <SelectItem value="other">other</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" className="bg-[#4CDC9C] text-[#2C373B] hover:bg-[#3fd18e]" onClick={() => { setStatusFilter(''); setTypeFilter(''); }}>Clear filters</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-[#23292F] text-white">
            <tr>
              <th className="p-3 text-left text-[12px] font-semibold">Leave type</th>
              <th className="p-3 text-left text-[12px] font-semibold">Start date</th>
              <th className="p-3 text-left text-[12px] font-semibold">End date</th>
              <th className="p-3 text-left text-[12px] font-semibold">Reason</th>
              <th className="p-3 text-left text-[12px] font-semibold">Total days</th>
              <th className="p-3 text-left text-[12px] font-semibold">Status</th>
              <th className="p-3 text-left text-[12px] font-semibold">Add Remark</th>
              <th className="p-3 text-left text-[12px] font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="text-[14px] font-medium text-[#2C373B]">
            {requests?.items?.filter((itm) =>
              ((typeFilter === '' || typeFilter === 'all') || (itm.leaveType?.toLowerCase() === typeFilter)) &&
              ((statusFilter === '' || statusFilter === 'all') || itm.status === statusFilter)
            ).map((itm) => (
              <tr key={itm._id} className="odd:bg-white even:bg-muted/30">
                <td className="p-3">{itm.leaveType}</td>
                <td className="p-3">{format(new Date(itm.startDate), 'do MMMM')}</td>
                <td className="p-3">{format(new Date(itm.endDate), 'do MMMM')}</td>
                <td className="p-3">{itm.reason}</td>
                <td className="p-3">{itm.days} days</td>
                <td className="p-3">{statusToBadge(itm.status)}</td>
                <td className="p-3 text-muted-foreground">-</td>
                <td className="p-3">
                  {['pending', 'applied'].includes((itm.status || '').toLowerCase()) ? (
                    <Button
                      size="sm"
                      className="bg-red-500 hover:bg-red-600 text-white"
                      onClick={async () => {
                        try {
                          await cancelLeaveRequest(itm._id);
                          await fetchRequests();
                        } catch (err: any) {
                          console.error('Cancel failed', err);
                          alert(err?.response?.data?.message || 'Cancel failed');
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-3 text-sm">
        <div>Prev</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="bg-[#4CDC9C] text-[#2C373B] hover:bg-[#3fd18e]">1</Button>
          <span>2</span><span>3</span><span>…</span><span>10</span>
        </div>
        <div>Next</div>
      </div>
    </div>
  );

  // Removed companyAdmin-only gate so all non-superAdmin users can apply leave

  return (
    <div
      className="min-h-screen py-6 px-4"
      style={{
        background:
          "linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)",
      }}
    >
      {showForm ? renderForm() : renderTable()}

      {/* Success Modal */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Leave Request Submitted</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <ClipboardList className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-xl font-semibold">Leave Request Submitted</div>
            <div className="text-sm text-muted-foreground text-center">You can track or cancel the request before approval.</div>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" onClick={() => { setSuccessOpen(false); navigate('/leaves/track'); }}>Track Leave Status</Button>
              <Button className="bg-[#4CDC9C] text-[#2C373B] hover:bg-[#3fd18e]" onClick={() => { setSuccessOpen(false); navigate('/dashboard'); }}>Go to Dashboard</Button>
            </div>
          </div>
          <DialogClose asChild>
            <button aria-label="Close" className="absolute right-4 top-4 rounded-md opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplyLeave;