import API from './auth';

export interface EmployeeRef {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  employeeCode: string;
  designation?: string;
}

export interface SalaryStructure {
  _id: string;
  employeeId: EmployeeRef;
  organizationId: string;
  basic: number;
  hra: number;
  conveyance: number;
  specialAllowance: number;
  gross: number;
  ctc: number;
  pf?: number;
  esi?: number;
  tds?: number;
  professionalTax?: number;
  otherDeductions?: number;
  effectiveFrom?: string;
  __v?: number;
}

export interface SalaryStructuresResponse {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: SalaryStructure[];
}

export interface SalaryStructureDetailResponse {
  success: boolean;
  data: SalaryStructure;
}

export const getSalaryStructures = async (params?: { page?: number; limit?: number }) => {
  const query: string[] = [];
  if (params) {
    if (params.page) query.push(`page=${params.page}`);
    if (params.limit) query.push(`limit=${params.limit}`);
  }
  const qs = query.length ? `?${query.join('&')}` : '';
  const res = await API.get(`/salary-structures${qs}`);
  return res.data as SalaryStructuresResponse;
};

export const getSalaryStructureByEmployee = async (employeeId: string) => {
  const res = await API.get(`/salary-structures/${employeeId}`);
  return res.data as SalaryStructureDetailResponse;
};

export const updateSalaryStructure = async (id: string, payload: Partial<SalaryStructure>) => {
  const res = await API.put(`/salary-structures/${id}`, payload);
  return res.data as SalaryStructureDetailResponse;
};

export const deleteSalaryStructure = async (id: string) => {
  const res = await API.delete(`/salary-structures/${id}`);
  return res.data as { success: boolean };
};

export interface CreateSalaryStructurePayload {
  employeeId: string;
  basic: number;
  hra: number;
  gross: number;
  ctc: number;
  conveyance: number;
  specialAllowance: number;
  pf: number;
  esi: number;
  tds: number;
  professionalTax: number;
  otherDeductions: number;
}

export const createSalaryStructure = async (payload: CreateSalaryStructurePayload) => {
  const res = await API.post(`/salary-structures`, payload);
  return res.data as SalaryStructureDetailResponse;
};