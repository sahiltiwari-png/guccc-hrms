import API from './auth';

export interface OrganizationAdmin {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
}

export interface Organization {
  id?: string;
  _id?: string; // for MongoDB compatibility
  name: string;
  addressLine1: string;
  addressLine2?: string;
  country: string;
  state: string;
  city: string;
  zipCode: string;
  contactPersonName: string;
  contactEmail: string;
  contactPhone: string;
  admin: OrganizationAdmin;
  registrationNumber: string;
  taxId: string;
  industryType: string;
  website?: string;
  domain?: string;
  logoUrl?: string;
  timezone: string;
  workingDays: string;
  defaultShiftId?: string;
  status: string;
  dayStartTime?: string;
  dayEndTime?: string;
  latitude?: number;
  longitude?: number;
}

// Get all organizations
export const getOrganizations = async () => {
  try {
    const response = await API.get('/organizations');
    return response.data;
  } catch (error) {
    console.error('Error fetching organizations:', error);
    throw error;
  }
};

// Get organization by ID 
export const getOrganizationById = async (id: string) => {
  try {
    const response = await API.get(`/organizations/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching organization with ID ${id}:`, error);
    throw error;
  }
};

// Create new organization
export const createOrganization = async (organizationData: Organization) => {
  try {
    const response = await API.post('/organizations', organizationData);
    return response.data;
  } catch (error) {
    console.error('Error creating organization:', error);
    throw error;
  }
};

// Update organization
export const updateOrganization = async (id: string, organizationData: Partial<Organization>) => {
  try {
    const response = await API.put(`/organizations/${id}`, organizationData);
    return response.data;
  } catch (error) {
    console.error(`Error updating organization with ID ${id}:`, error);
    throw error;
  }
};

// Delete organization
export const deleteOrganization = async (id: string) => {
  try {
    const response = await API.delete(`/organizations/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting organization with ID ${id}:`, error);
    throw error;
  }
};