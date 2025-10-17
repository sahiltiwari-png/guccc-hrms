import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getEmployeeLeaveBalanceHistory, LeaveBalanceHistoryItem } from "@/api/leaves";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LeaveRow = {
  leaveType: string;
  allocated: number;
  used: number;
  balance: number;
};

const LEAVE_ORDER = ["casual", "earned", "medical", "maternity", "paternity", "other"];

const LABELS: Record<string, string> = {
  casual: "Casual leave",
  earned: "Earned leave",
  medical: "Medical leave",
  maternity: "Maternity",
  paternity: "Paternity",
  other: "Others",
};

const TYPE_COLORS: Record<string, string> = {
  casual: "bg-green-100",
  earned: "bg-yellow-100",
  medical: "bg-red-100",
  maternity: "bg-pink-100",
  paternity: "bg-blue-100",
  other: "bg-gray-100",
};

const LeaveBalance = () => {
  const { user } = useAuth();
  const [data, setData] = useState<LeaveBalanceHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = (user as any)?._id || (user as any)?.id;
    if (!id) {
      setError("Missing employee id");
      setLoading(false);
      return;
    }
    setLoading(true);
    getEmployeeLeaveBalanceHistory(id)
      .then((res) => {
        const items = Array.isArray(res?.data) ? res.data : [];
        setData(items);
        setError(null);
      })
      .catch(() => setError("Failed to fetch leave balance"))
      .finally(() => setLoading(false));
  }, [user?._id, (user as any)?.id]);

  const rows: LeaveRow[] = useMemo(() => {
    const byType: Record<string, LeaveRow> = {};
    data.forEach((it) => {
      const key = (it.leaveType || "other").toLowerCase();
      byType[key] = {
        leaveType: key,
        allocated: it.allocated ?? 0,
        used: it.used ?? 0,
        balance: it.balance ?? 0,
      };
    });
    return LEAVE_ORDER.map((t) => byType[t] ?? { leaveType: t, allocated: 0, used: 0, balance: 0 });
  }, [data]);

  const employeeFromApi = useMemo(() => {
    const firstItem = data && data.length > 0 ? data[0] : undefined;
    const empObj = firstItem && (firstItem as any).employeeId;
    return empObj && typeof empObj === "object" ? empObj : null;
  }, [data]);

  const fullName = useMemo(() => {
    const apiFirst = employeeFromApi?.firstName || "";
    const apiLast = employeeFromApi?.lastName || "";
    const apiName = `${apiFirst} ${apiLast}`.trim();

    if (apiName) return apiName;

    const first = (user as any)?.firstName || "";
    const last = (user as any)?.lastName || "";
    const display = (user as any)?.name || `${first} ${last}`.trim();
    return display || "Employee";
  }, [employeeFromApi, user]);

  const designation = employeeFromApi?.designation || (user as any)?.designation || "";
  const avatarUrl = employeeFromApi?.profilePhotoUrl || (user as any)?.profilePhotoUrl || (user as any)?.profileImage || undefined;

  return (
    <div
      className="min-h-screen py-6 px-3 md:px-8"
      style={{
        background:
          "linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)",
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border-[1.5px] border-[#2C373B]/30 shadow-none p-4 sm:p-6">
          {/* Header like screenshot */}
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-10 w-10">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={fullName} />
              ) : (
                <AvatarFallback>{(fullName || "").slice(0, 1).toUpperCase()}</AvatarFallback>
              )}
            </Avatar>
            <div>
              <div className="text-[#2C373B] font-semibold">{fullName}</div>
              <div className="text-gray-500 text-sm">{designation || ""}</div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#2C373B] hover:bg-[#2C373B]">
                  <TableHead className="text-white hover:text-white" style={{fontSize: '12px', fontWeight: 600}}>Leave types</TableHead>
                  <TableHead className="text-white hover:text-white" style={{fontSize: '12px', fontWeight: 600}}>Total Alloted</TableHead>
                  <TableHead className="text-white hover:text-white" style={{fontSize: '12px', fontWeight: 600}}>Total Taken</TableHead>
                  <TableHead className="text-white hover:text-white" style={{fontSize: '12px', fontWeight: 600}}>Total balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-600">Loading...</TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-red-600">{error}</TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.leaveType} className="">
                      <TableCell>
                        <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${TYPE_COLORS[row.leaveType] || 'bg-gray-100'}`}>
                          {LABELS[row.leaveType] || row.leaveType}
                        </div>
                      </TableCell>
                      <TableCell className="text-[#2C373B]">{row.allocated}</TableCell>
                      <TableCell className="text-[#2C373B]">{row.used}</TableCell>
                      <TableCell className="text-[#2C373B]">{row.balance}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveBalance;