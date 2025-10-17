import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getEmployeeLeaveBalanceHistory, type LeaveBalanceHistoryItem } from '@/api/leaves';
import { getLeavePolicies, type LeavePolicy } from '@/api/leavePolicy';
import EmployeeLeaveBalance from './employee/EmployeeLeaveBalance';

const LeaveBalance = () => {
  const { user } = useAuth();
  if (user?.role === 'employee') {
    return <EmployeeLeaveBalance />;
  }
  const [leaveType, setLeaveType] = useState<string>('all');
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState<boolean>(false);
  const [items, setItems] = useState<LeaveBalanceHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const employeeId = useMemo(() => (user?._id || user?.id) as string | undefined, [user]);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        setLoadingPolicies(true);
        const res = await getLeavePolicies();
        setPolicies(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        console.error('Failed to load leave policies', e);
      } finally {
        setLoadingPolicies(false);
      }
    };
    fetchPolicies();
  }, []);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!employeeId) return;
      try {
        setLoading(true);
        const res = await getEmployeeLeaveBalanceHistory(employeeId, leaveType);
        setItems(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        console.error('Failed to load leave balance', e);
      } finally {
        setLoading(false);
      }
    };
    fetchBalance();
  }, [employeeId, leaveType]);

  const allLeaveTypes = useMemo(() => {
    const types: string[] = [];
    policies.forEach((p) => p.leaveTypes.forEach((lt) => types.push(lt.type)));
    return Array.from(new Set(types));
  }, [policies]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Leave Balance</h1>
        <div className="w-56">
          <Select value={leaveType} onValueChange={(val) => setLeaveType(val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select leave type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {allLeaveTypes.map((t) => (
                <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <Card><CardContent className="p-6">Loading...</CardContent></Card>
        ) : items.length === 0 ? (
          <Card><CardContent className="p-6">No leave balance found</CardContent></Card>
        ) : (
          items.map((item) => (
            <Card key={item._id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{item.leaveType}</span>
                  <Badge variant="outline">Current Year</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-muted-foreground">Allocated</div>
                    <div className="text-2xl font-bold">{item.allocated ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Used</div>
                    <div className="text-2xl font-bold">{item.used ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Balance</div>
                    <div className="text-2xl font-bold">{item.balance ?? 0}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* History table (for single type selection, show detailed history) */}
      {leaveType !== 'all' && items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items[0].history?.map((h) => (
                    <TableRow key={h._id}>
                      <TableCell>{h.year}</TableCell>
                      <TableCell className="capitalize">{h.action}</TableCell>
                      <TableCell>{h.days}</TableCell>
                      <TableCell>{h.remarks}</TableCell>
                      <TableCell>{new Date(h.date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LeaveBalance;