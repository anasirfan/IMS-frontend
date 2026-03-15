import api from '@/lib/axios';
import type { ApiResponse, Candidate, CandidateFilters, Metrics } from '@/types';

export const candidateService = {
  getAll: async (filters: CandidateFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<ApiResponse<Candidate[]>>(`/candidates?${params.toString()}`);
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get<ApiResponse<Candidate & { activityLogs: any[] }>>(`/candidates/${id}`);
    return data;
  },

  create: async (formData: FormData) => {
    const { data } = await api.post<ApiResponse<Candidate>>('/candidates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  update: async (id: string, formData: FormData) => {
    const { data } = await api.put<ApiResponse<Candidate>>(`/candidates/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  updateStatus: async (id: string, status: string) => {
    const { data } = await api.patch<ApiResponse<Candidate>>(`/candidates/${id}/status`, { 
      status,
      roundStage: status  // Backend expects both status and roundStage
    });
    return data;
  },

  toggleShortlist: async (id: string) => {
    const { data } = await api.patch<ApiResponse<Candidate>>(`/candidates/${id}/shortlist`);
    return data;
  },

  toggleArchive: async (id: string) => {
    const { data } = await api.patch<ApiResponse<Candidate>>(`/candidates/${id}/archive`);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete<ApiResponse>(`/candidates/${id}`);
    return data;
  },

  getMetrics: async () => {
    const { data } = await api.get<ApiResponse<Metrics>>('/candidates/metrics');
    return data;
  },

  aiAnalyze: async (id: string) => {
    const { data } = await api.post<ApiResponse>(`/ai/${id}/analyze`);
    return data;
  },

  aiScore: async (id: string, notes?: string) => {
    const { data } = await api.post<ApiResponse>(`/ai/${id}/score`, { notes });
    return data;
  },

  aiGenerateEmail: async (candidateName: string, position: string, round: string, dateTime: string) => {
    const { data } = await api.post<ApiResponse<{ emailBody: string }>>('/ai/candidates/generate-email', { candidateName, position, round, dateTime });
    return data;
  },

  generateAssessmentEmail: async (id: string) => {
    const { data } = await api.post<ApiResponse<{ subject: string; body: string }>>(`/candidates/${id}/generate-assessment-email`);
    return data;
  },

  sendAssessment: async (id: string, formData: FormData) => {
    const { data } = await api.post<ApiResponse>(`/candidates/${id}/send-assessment`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  sendReply: async (id: string, subject: string, body: string) => {
    const { data } = await api.post<ApiResponse>(`/candidates/${id}/reply`, { subject, body });
    return data;
  },

  generateInterviewQuestions: async (id: string) => {
    const { data } = await api.post<ApiResponse<any>>(`/ai/candidates/${id}/interview-questions`);
    return data;
  },

  exportCsv: async (filters: CandidateFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, String(value));
      }
    });
    const response = await api.get(`/candidates/export?${params.toString()}`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidates-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
