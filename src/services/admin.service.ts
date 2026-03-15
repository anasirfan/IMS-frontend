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

export const googleService = {
  getAuthUrl: async () => {
    const { data } = await api.get<ApiResponse<{ url: string }>>('/google/auth-url');
    return data;
  },

  fetchEmails: async () => {
    const { data } = await api.post<ApiResponse<{ count: number }>>('/google/fetch-emails');
    return data;
  },

  fetchRecordings: async () => {
    const { data } = await api.post<ApiResponse<{ total: number; matched: number }>>('/google/fetch-recordings');
    return data;
  },

  sendReply: async (candidateEmail: string, subject: string, body: string) => {
    const { data } = await api.post<ApiResponse>('/google/send-reply', { candidateEmail, subject, body });
    return data;
  },

  schedule: async (payload: { candidateId: string; date: string; time: string; duration?: number; interviewerId?: string; notes?: string }) => {
    const { data } = await api.post<ApiResponse<{ eventId: string; meetLink: string; start: string }>>('/google/schedule', payload);
    return data;
  },

  listAmishCvs: async () => {
    const { data } = await api.get<ApiResponse<{ cvs: any[] }>>('/google/list-amish-cvs');
    return data;
  },

  processSelectedCvs: async (selectedCvs: any[]) => {
    const { data } = await api.post<ApiResponse<{ created: any[]; log: string[] }>>('/google/process-selected-cvs', { selectedCvs });
    return data;
  },

  listSentAssessments: async () => {
    const { data } = await api.get<ApiResponse<{ assessments: any[] }>>('/google/list-sent-assessments');
    return data;
  },

  matchAssessment: async (candidateId: string, assessmentEmail: string, messageId?: string) => {
    const { data } = await api.post<ApiResponse>('/google/match-assessment', { candidateId, assessmentEmail, messageId });
    return data;
  },

  listSentScheduling: async () => {
    const { data } = await api.get<ApiResponse<{ schedulingEmails: any[] }>>('/google/list-sent-scheduling');
    return data;
  },

  matchScheduling: async (candidateId: string, schedulingDate: string) => {
    const { data } = await api.post<ApiResponse>('/google/match-scheduling', { candidateId, schedulingDate });
    return data;
  },

  listDriveRecordingsNotes: async () => {
    const { data } = await api.get<ApiResponse<{ recordings: any[]; notes: any[] }>>('/google/list-drive-recordings-notes');
    return data;
  },

  matchRecordingNotes: async (candidateId: string, recordingLink?: string, notesLink?: string) => {
    const { data } = await api.post<ApiResponse>('/google/match-recording-notes', { candidateId, recordingLink, notesLink });
    return data;
  },

  revoke: async () => {
    const { data } = await api.post<ApiResponse>('/google/revoke');
    return data;
  },

  categorize: async (candidateId: string, category: 'CV' | 'ASSESSMENT' | 'REPLY') => {
    const { data } = await api.post<ApiResponse>(`/google/categorize/${candidateId}`, { category });
    return data;
  },

  getConversation: async (candidateId: string) => {
    const { data } = await api.get<ApiResponse<{ candidateId: string; candidateName: string; candidateEmail: string; messages: any[] }>>(`/google/conversation/${candidateId}`);
    return data;
  },
};
