import API from './auth';

export interface RegularizationRequest {
  _id: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    designation: string;
    profilePhotoUrl?: string;
  };
  date: string;
  field: string;
  requestedTime: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface RegularizationResponse {
  total: number;
  requests: RegularizationRequest[];
}

export interface RegularizationFilters {
  employeeId?: string;
  status?: 'pending' | 'approved' | 'rejected';
  page?: number;
  limit?: number;
}

export const getRegularizationRequests = async (filters: RegularizationFilters = {}): Promise<RegularizationResponse> => {
  try {
    const params = new URLSearchParams();
    
    if (filters.employeeId) {
      params.append('employeeId', filters.employeeId);
    }
    
    if (filters.status) {
      params.append('status', filters.status);
    }
    
    if (filters.page) {
      params.append('page', filters.page.toString());
    }
    
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }

    const queryString = params.toString();
    const url = `/regularizations/attendance${queryString ? `?${queryString}` : ''}`;
    
    const response = await API.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching regularization requests:', error);
    throw error;
  }
};

export const updateRegularizationRequest = async (
  requestId: string, 
  updates: { status: string; reviewComment: string }
): Promise<RegularizationRequest> => {
  try {
    const response = await API.put(`/regularizations/attendance/status-update/${requestId}`, updates);
    return response.data;
  } catch (error) {
    console.error('Error updating regularization request:', error);
    throw error;
  }
};

export interface CreateRegularizationRequest {
  date: string;
  field: 'clockIn' | 'clockOut';
  requestedTime: string;
  reason: string;
  // Optional employeeId for creating a request; required by backend
  employeeId?: string;
}

export const createRegularizationRequest = async (
  requestData: CreateRegularizationRequest
): Promise<RegularizationRequest> => {
  try {
    const response = await API.post('/regularizations/attendance', requestData);
    return response.data;
  } catch (error) {
    console.error('Error creating regularization request:', error);
    throw error;
  }
};