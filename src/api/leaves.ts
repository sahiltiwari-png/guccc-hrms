import API from './auth';

export interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  profilePhotoUrl?: string;
}

export interface LeaveRequest {
  _id: string;
  employeeId: Employee;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  days: number;
  status: string;
  remarks?: string;
  // Optional attached documents
  documentUrls?: string[];
  documentUrl?: string;
}

export interface LeaveRequestsResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: LeaveRequest[];
}

// Create leave request payload and API
export interface CreateLeaveRequestPayload {
  startDate: string;
  endDate: string;
  reason: string;
  leavePolicyId: string;
  leaveTypeId: string;
  leaveType: string;
  days: number;
  employeeId: string;
  documentUrl?: string;
  documentUrls?: string[];
}

export const createLeaveRequest = async (
  payload: CreateLeaveRequestPayload
): Promise<{ success: boolean; message?: string; data?: any }> => {
  const res = await API.post('/leaves', payload);
  return res.data;
};

export const getLeaveRequests = async (
  page: number = 1,
  limit: number = 10,
  status?: string,
  userIds?: string[],
  leaveType?: string
): Promise<LeaveRequestsResponse> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  if (status) {
    params.append('status', status);
  }
  
  if (userIds && userIds.length > 0) {
    userIds.forEach(userId => {
      params.append('userId', userId);
    });
  }
  
  if (leaveType) {
    params.append('leaveType', leaveType);
  }
  
  const res = await API.get(`/leaves?${params.toString()}`);
  return res.data;
};

export const getLeaveRequestById = async (id: string): Promise<{ success: boolean; data: LeaveRequest }> => {
  const res = await API.get(`/leaves/${id}`);
  return res.data;
};

export const updateLeaveRequestStatus = async (id: string, status: string, remarks?: string) => {
  const res = await API.post(`/leaves/status/update/${id}`, { status, remarks });
  return res.data;
};

// Cancel leave request by ID
export const cancelLeaveRequest = async (id: string): Promise<{ success: boolean; message?: string; data?: any }> => {
  const res = await API.post(`/leaves/${id}/cancel`);
  return res.data;
};

export interface LeaveBalance {
  leaveType: string;
  allocated: number;
  used: number;
  balance: number;
}

export interface LeaveBalanceEmployee {
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeCode: string;
    designation: string;
    profilePhotoUrl?: string;
  };
  leaveBalances: LeaveBalance[];
}

export interface LeaveBalanceResponse {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: LeaveBalanceEmployee[];
}

export const getLeaveBalance = async (
  page: number = 1,
  limit: number = 10,
  leaveType?: string,
  employeeId?: string
): Promise<LeaveBalanceResponse> => {
  // Get organization ID from localStorage
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    throw new Error('User not found in localStorage');
  }
  
  const user = JSON.parse(userStr);
  const organizationId = user.organizationId;
  
  if (!organizationId) {
    throw new Error('Organization ID not found');
  }

  const params = new URLSearchParams();
  params.append('organizationId', organizationId);
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  if (leaveType) {
    params.append('leaveType', leaveType);
  }
  
  if (employeeId) {
    params.append('employeeId', employeeId);
  }
  
  const res = await API.get(`/leave-balance?${params.toString()}`);
  return res.data;
};

// Employee interfaces and API functions
export interface EmployeeListItem {
  _id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employeeCode: string;
  designation: string;
  status: string;
  profilePhotoUrl?: string;
  dateOfJoining: string;
  department?: string;
  employmentType?: string;
  isActive: boolean;
  loginEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeesResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: EmployeeListItem[];
}

export const getEmployees = async (
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<EmployeesResponse> => {
  // Get organization ID from localStorage
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    throw new Error('User not found in localStorage');
  }
  
  const user = JSON.parse(userStr);
  const organizationId = user.organizationId;
  
  if (!organizationId) {
    throw new Error('Organization ID not found');
  }

  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  if (search) {
    params.append('search', search);
  }
  
  const res = await API.get(`/employees?${params.toString()}`);
  return res.data;
};

// Leave allocation interfaces and API functions
export interface LeaveAllocationRequest {
  organizationId: string;
  employeeId: string;
  leaveType: string;
  days: number;
  remarks?: string;
  leaveTypeId?: string;
  leavePolicyId?: string;
}

export interface LeaveAllocationResponse {
  success: boolean;
  message: string;
  data?: any;
}

export const allocateLeave = async (
  allocationData: Omit<LeaveAllocationRequest, 'organizationId'>
): Promise<LeaveAllocationResponse> => {
  // Get organization ID from localStorage
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    throw new Error('User not found in localStorage');
  }
  
  const user = JSON.parse(userStr);
  const organizationId = user.organizationId;
  
  if (!organizationId) {
    throw new Error('Organization ID not found');
  }

  const requestData: LeaveAllocationRequest = {
    ...allocationData,
    organizationId
  };
  
  const res = await API.post('/leave-balance/allocate', requestData);
  return res.data;
};

// Employee leave balance history interfaces and API function
export interface LeaveBalanceHistoryItem {
  _id: string;
  organizationId: string;
  employeeId: string;
  leaveTypeId: string;
  leavePolicyId: string;
  leaveType: string;
  allocated: number;
  used: number;
  balance: number;
  history: Array<{
    year: number;
    action: string;
    days: number;
    remarks: string;
    _id: string;
    date: string;
  }>;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface LeaveBalanceHistoryResponse {
  success: boolean;
  data: LeaveBalanceHistoryItem[];
}

export const getEmployeeLeaveBalanceHistory = async (
  employeeId: string,
  leaveType?: string
): Promise<LeaveBalanceHistoryResponse> => {
  // Get organization ID from localStorage
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    throw new Error('User not found in localStorage');
  }
  
  const user = JSON.parse(userStr);
  const organizationId = user.organizationId;
  
  if (!organizationId) {
    throw new Error('Organization ID not found');
  }

  const params = new URLSearchParams();
  params.append('organizationId', organizationId);
  
  if (leaveType && leaveType !== 'all') {
    params.append('leaveType', leaveType);
  }
  
  const res = await API.get(`/leave-balance/${employeeId}?${params.toString()}`);
  return res.data;
};

export interface LeaveReportData {
  employeeCode: string;
  employeeName: string;
  email: string;
  designation: string;
  department: string;
  profilePhotoUrl?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  approverName: string;
}

export interface LeaveReportResponse {
  message: string;
  count: number;
  data: LeaveReportData[];
}

export const getLeavesReport = async (params?: {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  leaveType?: string;
}): Promise<LeaveReportResponse> => {
  const queryParams = new URLSearchParams();
  
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.employeeId) queryParams.append('employeeId', params.employeeId);
  if (params?.leaveType && params.leaveType !== 'all') queryParams.append('leaveType', params.leaveType);
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const response = await API.get(`/reports/leaves-report${queryString}`);
  return response.data;
};

export const downloadLeavesReport = async (params?: {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  leaveType?: string;
}) => {
  const queryParams = new URLSearchParams();
  
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.employeeId) queryParams.append('employeeId', params.employeeId);
  if (params?.leaveType && params.leaveType !== 'all') queryParams.append('leaveType', params.leaveType);
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const response = await API.get(`/reports/leaves-report/download${queryString}`, {
    responseType: 'blob',
  });
  
  // Create blob link to download
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  
  // Get filename from response headers or use default
  const contentDisposition = response.headers['content-disposition'];
  let filename = 'leaves-report.xlsx';
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
};