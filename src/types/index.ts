export interface Admin {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'HR_ADMIN' | 'INTERVIEWER';
  avatarUrl?: string | null;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  admin: Admin;
}

export type RoundStage = 'INBOX' | 'ASSESSMENT' | 'SCHEDULED' | 'INTERVIEW' | 'SHORTLISTED' | 'HIRED' | 'REJECTED';

export const ROUND_STAGES: RoundStage[] = ['INBOX', 'ASSESSMENT', 'SCHEDULED', 'INTERVIEW', 'SHORTLISTED', 'HIRED', 'REJECTED'];

export const STAGE_LABELS: Record<RoundStage, string> = {
  INBOX: 'Inbox',
  ASSESSMENT: 'Assessment',
  SCHEDULED: 'Scheduled',
  INTERVIEW: 'Interview',
  SHORTLISTED: 'Shortlisted',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
};

export const STAGE_COLORS: Record<RoundStage, string> = {
  INBOX: 'badge-inbox',
  ASSESSMENT: 'badge-screening',
  SCHEDULED: 'badge-technical',
  INTERVIEW: 'badge-final',
  SHORTLISTED: 'badge-hired',
  HIRED: 'badge-hired',
  REJECTED: 'badge-rejected',
};

export interface KeyHighlights {
  top_skills: string[];
  years_of_experience: number;
  last_company: string;
  education_summary: string;
  seniority_level: string;
  risk_flags: string[];
}

export interface CandidateMessage {
  id: string;
  subject?: string;
  body: string;
  direction: 'INCOMING' | 'OUTGOING';
  isRead: boolean;
  createdAt: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  position: string;
  interviewDate: string | null;
  status: string;
  roundStage: RoundStage;
  remarks: string | null;
  cvPath: string | null;
  meetingRecording: string | null;
  meetingNotes: string | null;
  assessmentGiven: boolean;
  assessmentLink: string | null;
  assessmentStatus: string | null;
  completedLink: string | null;
  rating: number | null;
  isArchived: boolean;
  aiScore: number | null;
  aiFeedback: string | null;
  keyHighlights: string | null;
  aiSummary: string | null;
  googleDriveLink: string | null;
  meetTranscript: string | null;
  gmailThreadId: string | null;
  calendarEventId: string | null;
  meetLink: string | null;
  interviewerId: string | null;
  interviewer?: string | { id: string; name: string; email: string } | null;
  interviewQuestions: string | null;
  messages?: CandidateMessage[];
  activityLogs?: ActivityLog[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  details: string | null;
  adminId: string;
  candidateId: string | null;
  admin: { id: string; name: string; email: string };
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  meta?: Pagination;
  /** Optional machine-readable error code (e.g. bulk upload incomplete candidate) */
  code?: string;
}

/** Canonical role labels aligned with backend `position-normalizer` */
export const KNOWN_CANONICAL_POSITIONS = [
  'AI Engineer',
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'Web Developer',
  'DevOps Engineer',
  'iOS Developer',
  'Electrical Engineer',
  'Electronics Engineer',
  'Embedded Systems Engineer',
  '3D Designer',
  '3D Artist',
  '3D Specialist',
] as const;

export type KnownCanonicalPosition = (typeof KNOWN_CANONICAL_POSITIONS)[number];

export type BulkUploadRowStatus =
  | 'pending'
  | 'processing'
  | 'success'
  | 'needs_input'
  | 'failed';

/** Payload when bulk upload cannot create a candidate without more fields */
export interface CandidateIncompletePayload {
  missing?: string[];
  partial?: Record<string, unknown>;
}

export interface Metrics {
  total: number;
  byStatus: {
    inbox: number;
    assessment: number;
    scheduled: number;
    interview: number;
    shortlisted: number;
    rejected: number;
  };
  // Legacy flat fields for backward compatibility
  inbox?: number;
  assessment?: number;
  scheduled?: number;
  interview?: number;
  shortlisted?: number;
  hired?: number;
  rejected?: number;
  interviewsThisWeek?: number;
  archived?: number;
  shortlistedPercent?: number;
  rejectedPercent?: number;
}

export interface CandidateFilters {
  status?: string;
  roundStage?: string;
  search?: string;
  position?: string;
  dateFrom?: string;
  dateTo?: string;
  archived?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
