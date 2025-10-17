import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as apiLogin } from '@/api/auth';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  organizationId: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  setUser: (user: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in on initial load
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (storedUser && token) {
      const userData = JSON.parse(storedUser);
      // Normalize photo field for UI avatar: prefer profilePhotoUrl, fallback to existing profileImage
      if (!userData.profileImage && userData.profilePhotoUrl) {
        userData.profileImage = userData.profilePhotoUrl;
        localStorage.setItem('user', JSON.stringify(userData));
      }
      setUser(userData);
      if (userData.organizationId) {
        setOrganizationId(userData.organizationId);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await apiLogin(email, password);
      // Store user data, token, and role
      const userData = response.user || { email };
      // Normalize photo field for UI avatar
      if (!userData.profileImage && userData.profilePhotoUrl) {
        userData.profileImage = userData.profilePhotoUrl;
      }
      if (response.role) {
        userData.role = response.role;
      }
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', response.token || 'dummy-token');
      if (response.role) {
        localStorage.setItem('role', response.role);
      }
      setUser(userData);
      if (userData.organizationId) {
        setOrganizationId(userData.organizationId);
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setUser(null);
    setOrganizationId(null);
    navigate('/login');
  };

  const value = {
    isAuthenticated: !!user,
    user,
    organizationId,
    login,
    logout,
    loading,
    setUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};