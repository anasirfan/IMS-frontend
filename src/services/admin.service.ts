import api from '@/lib/axios';
import type { ApiResponse, Admin, ActivityLog } from '@/types';

export const adminService = {
  getAll: async () => {
    const { data } = await api.get<ApiResponse<Admin[]>>('/admins');
    return data;
  },

  create: async (payload: { name: string; email: string; password: string; role?: string }) => {
    const { data } = await api.post<ApiResponse<Admin>>('/admins', payload);
    return data;
  },

  getActivityLogs: async (page: number = 1, limit: number = 50) => {
    const { data } = await api.get<ApiResponse<ActivityLog[]>>(`/activity-logs?page=${page}&limit=${limit}`);
    return data;
  },
};
