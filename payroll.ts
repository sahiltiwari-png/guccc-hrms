import API from './auth';

export interface PayrollEmployeeRef {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  employeeCode?: string;
  designation?: string;
  profilePhotoUrl?: string;
}

export interface PayrollItem {
  _id: string;
  employeeId: PayrollEmployeeRef;
  organizationId: string;
  month: number;
  year: number;
  salaryStructureId: string;
  grossEarnings: number;
  basic: number;
  hra: number;
  conveyance?: number;
  specialAllowance?: number;
  pf?: number;
  esi?: number;
  tds?: number;
  professionalTax?: number;
  otherDeductions?: number;
  lossOfPayDays?: number;
  leaveDeductions?: number;
  netPayable: number;
  status: string; // e.g., 'pending', 'processed', 'failed'
  totalWorkedDays?: number;
  generatedAt?: string;
  __v?: number;
}

export interface PayrollResponse {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: PayrollItem[];
}

export const getPayroll = async (params?: { page?: number; limit?: number; month?: number; year?: number }) => {
  const query: string[] = [];
  if (params) {
    if (params.page) query.push(`page=${params.page}`);
    if (params.limit) query.push(`limit=${params.limit}`);
    if (params.month) query.push(`month=${params.month}`);
    if (params.year) query.push(`year=${params.year}`);
  }
  const qs = query.length ? `?${query.join('&')}` : '';
  const res = await API.get(`/payroll${qs}`);
  return res.data as PayrollResponse;
};

export const createPayroll = async (payload: { employeeId: string; month: number; year: number }) => {
  const res = await API.post('/payroll', payload);
  return res.data;
};

export interface PayrollDetailResponse {
  message: string;
  success: boolean;
  data: PayrollItem;
}

export const getPayrollByEmployee = async (employeeId: string, month?: number, year?: number) => {
  const query: string[] = [];
  if (month) query.push(`month=${month}`);
  if (year) query.push(`year=${year}`);
  const qs = query.length ? `?${query.join('&')}` : '';
  const res = await API.get(`/payroll/${employeeId}${qs}`);
  return res.data as PayrollDetailResponse;
};

export interface UpdatePayrollPayload {
  month?: number;
  year?: number;
  grossEarnings?: number;
  basic?: number;
  hra?: number;
  conveyance?: number;
  specialAllowance?: number;
  pf?: number;
  esi?: number;
  tds?: number;
  professionalTax?: number;
  otherDeductions?: number;
  lossOfPayDays?: number;
  leaveDeductions?: number;
  netPayable?: number;
  status?: string;
  totalWorkedDays?: number;
}

export interface UpdatePayrollResponse {
  success: boolean;
  message: string;
  payroll: PayrollItem;
}

export const updatePayrollById = async (payrollId: string, payload: UpdatePayrollPayload, month?: number, year?: number) => {
  const query: string[] = [];
  if (month) query.push(`month=${month}`);
  if (year) query.push(`year=${year}`);
  const qs = query.length ? `?${query.join('&')}` : '';
  const res = await API.put(`/payroll/updateById/${payrollId}${qs}`, payload);
  return res.data as UpdatePayrollResponse;
};

export const sendPayslip = async (employeeId: string, month: number, year: number) => {
  const res = await API.post(`/payroll/send-payslip/${employeeId}/${month}/${year}`);
  return res.data;
};

export const downloadPayroll = async (employeeId: string, month: number, year: number) => {
  const res = await API.get(`/payroll/download/${employeeId}/${month}/${year}`, {
    responseType: 'blob'
  });
  return res;
};

// New interface for payroll reports
export interface PayrollReportItem {
  employeeCode: string;
  employeeName: string;
  email: string;
  designation: string;
  department?: string;
  profilePhotoUrl: string;
  month: number;
  year: number;
  grossEarnings: number;
  deductions: string;
  lossOfPayDays: number;
  netPayable: string;
  status: string;
  generatedAt: string;
  totalWorkedDays: number;
}

export interface PayrollReportResponse {
  success: boolean;
  data: PayrollReportItem[];
}

export const getPayrollReport = async (params?: { 
  employeeId?: string; 
  month?: number; 
  year?: number; 
  status?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const query: string[] = [];
  if (params) {
    if (params.employeeId) query.push(`employeeId=${params.employeeId}`);
    if (params.month) query.push(`month=${params.month}`);
    if (params.year) query.push(`year=${params.year}`);
    if (params.status) query.push(`status=${params.status}`);
    if (params.startDate) query.push(`startDate=${params.startDate}`);
    if (params.endDate) query.push(`endDate=${params.endDate}`);
  }
  const qs = query.length ? `?${query.join('&')}` : '';
  const res = await API.get(`/reports/payroll${qs}`);
  return res.data as PayrollReportResponse;
};

export const downloadPayrollReport = async (params?: { 
  employeeId?: string; 
  month?: number; 
  year?: number; 
  status?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const query: string[] = [];
  if (params) {
    if (params.employeeId) query.push(`employeeId=${params.employeeId}`);
    if (params.month) query.push(`month=${params.month}`);
    if (params.year) query.push(`year=${params.year}`);
    if (params.status) query.push(`status=${params.status}`);
    if (params.startDate) query.push(`startDate=${params.startDate}`);
    if (params.endDate) query.push(`endDate=${params.endDate}`);
  }
  const qs = query.length ? `?${query.join('&')}` : '';
  const res = await API.get(`/reports/payroll/download${qs}`, {
    responseType: 'blob'
  });
  return res;
};

// Employee-specific payroll list (skip/limit with optional month/year filters)
export interface PayrollEmployeeListResponse {
  message: string;
  success: boolean;
  data: PayrollItem[];
}

export const getEmployeePayrollList = async (
  employeeId: string,
  params?: { skip?: number; limit?: number; month?: number; year?: number }
) => {
  const query: string[] = [];
  if (params) {
    if (typeof params.skip !== 'undefined') query.push(`skip=${params.skip}`);
    if (typeof params.limit !== 'undefined') query.push(`limit=${params.limit}`);
    if (typeof params.month !== 'undefined') query.push(`month=${params.month}`);
    if (typeof params.year !== 'undefined') query.push(`year=${params.year}`);
  }
  const qs = query.length ? `?${query.join('&')}` : '';
  const res = await API.get(`/payroll/employee/${employeeId}${qs}`);
  return res.data as PayrollEmployeeListResponse;
};
