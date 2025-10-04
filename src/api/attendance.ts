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
