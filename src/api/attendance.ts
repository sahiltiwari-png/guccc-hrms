import API from './auth';

export const getAttendance = async (params?: {
  page?: number;
  limit?: number;
  status?: string | null;
  date?: string | null;
  employeeId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}) => {
  const query = [];
  if (params) {
    if (params.page) query.push(`page=${params.page}`);
    if (params.limit) query.push(`limit=${params.limit}`);
    if (params.status) query.push(`status=${params.status}`);
    if (params.date) query.push(`date=${params.date}`);
    if (params.employeeId) query.push(`employeeId=${params.employeeId}`);
    if (params.startDate) query.push(`startDate=${params.startDate}`);
    if (params.endDate) query.push(`endDate=${params.endDate}`);
  }
  const queryString = query.length ? `?${query.join('&')}` : '';
  const response = await API.get(`/attendance${queryString}`);
  return response.data;
};

// Attendance report (all) interfaces and API
export interface AttendanceReportItem {
  clockIn: string | null;
  clockOut: string | null;
  totalWorkingHours: string | null;
  status: string;
  markedBy?: string;
  _id: string;
  employeeCode: string;
  employeeName: string;
  email?: string;
  designation?: string;
  department?: string;
  profilePhotoUrl?: string;
  date: string;
}

export interface AttendanceReportResponse {
  success: boolean;
  data: AttendanceReportItem[];
}

export const getAttendanceReportAll = async (params?: {
  // date range support (legacy)
  startDate?: string;
  endDate?: string;
  // new month/year filter support
  month?: number | string;
  year?: number | string;
  // optional filters
  status?: string; // expected values like 'present', 'absent', etc.
  employeeId?: string;
}) => {
  const query: string[] = [];
  if (params) {
    // Prefer month/year when provided
    if (params.month !== undefined) query.push(`month=${params.month}`);
    if (params.year !== undefined) query.push(`year=${params.year}`);
    // Fallback to start/end date
    if (params.startDate) query.push(`startDate=${params.startDate}`);
    if (params.endDate) query.push(`endDate=${params.endDate}`);
    // Pass employee filter if present
    if (params.employeeId) query.push(`employeeId=${params.employeeId}`);
    // Note: status is not used in the new flow, but kept for compatibility
    if (params.status && params.status !== 'all') query.push(`status=${params.status}`);
  }
  const qs = query.length ? `?${query.join('&')}` : '';
  const response = await API.get(`/reports/attendance-report/all${qs}`);
  return response.data as AttendanceReportResponse;
};

// Download attendance report for a given range/filters
export const downloadAttendanceReport = async (params?: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}) => {
  const query: string[] = [];
  if (params) {
    if (params.employeeId) query.push(`employeeId=${params.employeeId}`);
    if (params.startDate) query.push(`startDate=${params.startDate}`);
    if (params.endDate) query.push(`endDate=${params.endDate}`);
    if (params.status) query.push(`status=${params.status}`);
  }
  const qs = query.length ? `?${query.join('&')}` : '';
  const response = await API.get(`/reports/attendance/download${qs}`, {
    responseType: 'blob',
  });
  return response;
};

// Download monthly attendance report
export const downloadMonthlyAttendanceReport = async (params: {
  organizationId: string;
  month?: number | string;
  year?: number | string;
}) => {
  const query: string[] = [];
  if (params.organizationId) query.push(`organizationId=${params.organizationId}`);
  if (params.month !== undefined) query.push(`month=${params.month}`);
  if (params.year !== undefined) query.push(`year=${params.year}`);
  const qs = query.length ? `?${query.join('&')}` : '';
  const res = await API.get(`/reports/monthly-attendance-report/download${qs}`, {
    responseType: 'blob',
  });
  return res;
};

export const getEmployeeAttendanceById = async (employeeId: string, params?: any) => {
  try {
    const query = [];
    if (params) {
      if (params.page) query.push(`page=${params.page}`);
      if (params.limit) query.push(`limit=${params.limit}`);
      if (params.status) query.push(`status=${params.status}`);
      if (params.startDate) query.push(`startDate=${params.startDate}`);
      if (params.endDate) query.push(`endDate=${params.endDate}`);
    }
    const queryString = query.length ? `?${query.join('&')}` : '?page=1&limit=10';
    const response = await API.get(`/attendance/list-by-id/${employeeId}${queryString}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching employee attendance:", error);
    throw error;
  }
};

export const updateAttendance = async (employeeId: string, attendanceId: string, data: {
  clockIn: string;
  clockOut: string;
  date: string;
}) => {
  try {
    const response = await API.patch(`/attendance/${employeeId}/${attendanceId}`, data);
    return response.data;
  } catch (error) {
    console.error("Error updating attendance:", error);
    throw error;
  }
};

// Clock-in an employee for today
export const clockInEmployee = async (
  employeeId: string,
  data: { latitude: number; longitude: number; markedBy: string }
) => {
  try {
    const response = await API.post(`/attendance/clock-in/${employeeId}`, data);
    return response.data;
  } catch (error) {
    console.error("Error clocking in:", error);
    throw error;
  }
};

// Clock-out an employee for today
export const clockOutEmployee = async (
  employeeId: string,
  data: { latitude: number; longitude: number }
) => {
  try {
    const response = await API.post(`/attendance/clock-out/${employeeId}`, data);
    return response.data;
  } catch (error) {
    console.error("Error clocking out:", error);
    throw error;
  }
};
