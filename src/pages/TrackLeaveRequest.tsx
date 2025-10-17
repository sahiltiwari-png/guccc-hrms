import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getLeavePolicies, type LeavePolicy } from '@/api/leavePolicy';
import { cancelLeaveRequest, getLeaveRequests, type LeaveRequest, type LeaveRequestsResponse } from '@/api/leaves';
import EmployeeTrackLeaveRequest from './employee/EmployeeTrackLeaveRequest';

const statusOptions = ['all', 'pending', 'approved', 'rejected', 'cancelled'];

const TrackLeaveRequest = () => {
  const { user } = useAuth();
  if (user?.role === 'employee') {
    return <EmployeeTrackLeaveRequest />;
  }
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [status, setStatus] = useState<string>('all');
  const [leaveType, setLeaveType] = useState<string>('');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(false);

  const employeeId = useMemo(() => (user?._id || user?.id) as string | undefined, [user]);

  useEffect(() => {
    const loadPolicies = async () => {
      try {
        const res = await getLeavePolicies();
        setPolicies(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        console.error('Failed to load leave policies', e);
      }
    };
    loadPolicies();
  }, []);

  const allLeaveTypes = useMemo(() => {
    const types: string[] = [];
    policies.forEach((p) => p.leaveTypes.forEach((lt) => types.push(lt.type)));
    return Array.from(new Set(types));
  }, [policies]);

  const fetchRequests = async (p: number) => {
    try {
      if (!employeeId) return;
      setLoading(true);
      const res: LeaveRequestsResponse = await getLeaveRequests(
        p,
        limit,
        status !== 'all' ? status : undefined,
        [employeeId],
        leaveType ? leaveType.toLowerCase() : undefined
      );
      const filtered = leaveType
        ? res.items.filter((i) => (i.leaveType || '').toLowerCase() === (leaveType || '').toLowerCase())
        : res.items;
      setRequests(filtered);
      setTotal(res.total || filtered.length);
      setPage(p);
    } catch (e) {
      console.error('Failed to load leave requests', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, leaveType, employeeId]);

  const handleCancel = async (id: string) => {
    const ok = window.confirm('Cancel this leave request?');
    if (!ok) return;
    try {
      await cancelLeaveRequest(id);
      // Refresh current page
      fetchRequests(page);
    } catch (e) {
      console.error('Failed to cancel leave request', e);
      alert('Failed to cancel');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Track Leave Requests</h1>
        <div className="flex items-center gap-2">
          <div className="w-40">
            <Select value={status} onValueChange={(val) => setStatus(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s === 'all' ? 'All Status' : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Select value={leaveType} onValueChange={(val) => setLeaveType(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Leave type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {allLeaveTypes.map((t) => (
                  <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="py-6 text-center">Loading...</TableCell></TableRow>
                ) : requests.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="py-6 text-center">No leave requests found</TableCell></TableRow>
                ) : (
                  requests.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell className="capitalize">{r.leaveType || '-'}</TableCell>
                      <TableCell>{new Date(r.startDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(r.endDate).toLocaleDateString()}</TableCell>
                      <TableCell>{r.days}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{r.status}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate" title={r.reason}>{r.reason}</TableCell>
                      <TableCell>
                        {r.documentUrls && r.documentUrls.length > 0 ? (
                          <div className="flex gap-2 flex-wrap">
                            {r.documentUrls.map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noreferrer" className="text-emerald-700 underline">File {idx + 1}</a>
                            ))}
                          </div>
                        ) : r.documentUrl ? (
                          <a href={r.documentUrl} target="_blank" rel="noreferrer" className="text-emerald-700 underline">File</a>
                        ) : (
                          <span>-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.status?.toLowerCase() === 'pending' ? (
                          <Button size="sm" variant="outline" onClick={() => handleCancel(r._id)}>Cancel</Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => fetchRequests(Math.max(1, page - 1))} disabled={page <= 1}>Prev</Button>
              <span className="text-sm">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => fetchRequests(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackLeaveRequest;