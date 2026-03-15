import api from '@/lib/axios';
import type { ApiResponse, LoginResponse, Admin } from '@/types';

export const authService = {
  login: async (email: string, password: string) => {
    const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', { email, password });
    return data;
  },

  refresh: async (refreshToken: string) => {
    const { data } = await api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', { refreshToken });
    return data;
  },

  logout: async () => {
    const { data } = await api.post<ApiResponse>('/auth/logout');
    return data;
  },

  getMe: async () => {
    const { data } = await api.get<ApiResponse<Admin>>('/auth/me');
    return data;
  },
};
