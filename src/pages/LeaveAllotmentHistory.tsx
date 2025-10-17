import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getEmployeeLeaveBalanceHistory, LeaveBalanceHistoryItem } from '@/api/leaves';
import { toast } from 'sonner';

const LEAVE_TYPES = [
  { value: 'all', label: 'All Leave Types' },
  { value: 'casual', label: 'Casual Leave' },
  { value: 'earned', label: 'Earned Leave' },
  { value: 'medical', label: 'Medical Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
];

const LeaveAllotmentHistory: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const employeeName = searchParams.get('name') || 'Employee';
  const employeeDesignation = searchParams.get('designation') || 'No designation';
  const profilePhotoUrl = searchParams.get('photo') || '';

  const [selectedLeaveType, setSelectedLeaveType] = useState('all');
  const [historyData, setHistoryData] = useState<LeaveBalanceHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistoryData = async (leaveType: string = 'all') => {
    if (!employeeId) {
      setError('Employee ID is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await getEmployeeLeaveBalanceHistory(
        employeeId,
        leaveType === 'all' ? undefined : leaveType
      );
      
      if (response.success) {
        setHistoryData(response.data);
      } else {
        setError('Failed to fetch leave balance history');
      }
    } catch (err) {
      console.error('Error fetching leave balance history:', err);
      setError('An error occurred while fetching data');
      toast.error('Failed to load leave balance history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData(selectedLeaveType);
  }, [selectedLeaveType, employeeId]);

  const handleLeaveTypeChange = (value: string) => {
    setSelectedLeaveType(value);
  };

  const clearFilters = () => {
    setSelectedLeaveType('all');
  };

  const handleBack = () => {
    navigate('/leaves/allotment');
  };

  const hasActiveFilter = selectedLeaveType !== 'all';

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)",
      }}
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-md">
                  {profilePhotoUrl ? (
                    <img
                      src={profilePhotoUrl}
                      alt={employeeName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-white">
                      {employeeName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">{employeeName}</h1>
                  <p className="text-sm text-gray-600">{employeeDesignation}</p>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Leave Allotment History
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <div
              className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between rounded-md"
              style={{
                border: hasActiveFilter ? "1px solid #CFEDE3" : "1px solid #EAF7F1",
                borderRadius: 8,
              }}
            >
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <label className="text-sm font-medium text-gray-700">Filter by:</label>
                </div>
                <Select value={selectedLeaveType} onValueChange={handleLeaveTypeChange}>
                  <SelectTrigger className="w-full sm:w-[200px] border-gray-200 focus:border-blue-400 focus:ring-blue-400" style={{ background: "#E1F9EF", color: "#2C373B" }}>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={clearFilters}
                className="text-sm border-gray-200 hover:bg-gray-50 hover:border-gray-300"
              >
                Clear filters
              </Button>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Leave Balance Summary</h2>
            <p className="text-sm text-gray-600 mt-1">Overview of allocated, used, and remaining leave balances</p>
          </div>
          
          <div className="overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="text-sm text-gray-600">Loading leave history...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <div className="flex flex-col items-center gap-4">
                  <div className="text-4xl">⚠️</div>
                  <p className="text-red-600 font-medium">{error}</p>
                  <Button 
                    onClick={() => fetchHistoryData(selectedLeaveType)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-100" style={{ background: "#2C373B" }}>
                      <th className="text-left py-4 px-6 font-semibold text-sm" style={{ color: "#FFFFFF" }}>Leave Types</th>
                      <th className="text-center py-4 px-6 font-semibold text-sm" style={{ color: "#FFFFFF" }}>Total Allocated</th>
                      <th className="text-center py-4 px-6 font-semibold text-sm" style={{ color: "#FFFFFF" }}>Total Taken</th>
                      <th className="text-center py-4 px-6 font-semibold text-sm" style={{ color: "#FFFFFF" }}>Total Balance</th>
                      <th className="text-center py-4 px-6 font-semibold text-sm" style={{ color: "#FFFFFF" }}>Actions</th>
                     </tr>
                  </thead>
                  <tbody className="bg-white">
                    {historyData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-3">
                            <div className="text-4xl">📋</div>
                            <div className="font-medium text-gray-600">No result found</div>
                            <div className="text-sm text-gray-500">Try adjusting your filters</div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      historyData.map((item, index) => (
                        <tr key={index} className="border-b border-gray-50 hover:bg-blue-50 transition-colors duration-150">
                          <td className="py-4 px-6 text-gray-900 capitalize font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              {item.leaveType} leave
                            </div>
                          </td>
                          <td className="py-4 px-6 text-gray-900 text-center font-medium">
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                              {item.allocated}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-gray-900 text-center font-medium">
                            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                              {item.used}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-gray-900 text-center font-medium">
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                              {item.balance}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <Button
                              variant="link"
                              className="text-blue-600 hover:text-blue-800 p-0 h-auto font-medium text-sm hover:underline"
                            >
                              View History
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveAllotmentHistory;