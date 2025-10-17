import axios from 'axios';


const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Add a request interceptor to include the token in every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to auto-logout on invalid/expired token
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const msg = (
      (error?.response?.data?.message as string | undefined) || ''
    ).toLowerCase();

    const isInvalidToken =
      status === 401 ||
      msg.includes('invalid token') ||
      msg.includes('token expired') ||
      msg.includes('jwt');

    if (isInvalidToken) {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
      } catch {}
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const login = async (email: string, password: string) => {
  try {
    const response = await API.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export default API;
