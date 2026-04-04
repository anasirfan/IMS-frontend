export type JobStatus = 'queued' | 'running' | 'completed' | 'completed_with_errors' | 'failed';
export type JobMode = 'preview' | 'send';
export type ItemStatus = 'queued' | 'processing' | 'generated' | 'sent' | 'failed' | 'skipped';

export interface BatchJob {
  id: string;
  mode: JobMode;
  status: JobStatus;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  skippedItems: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface JobItem {
  id: string;
  jobId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePosition?: string;
  mode: JobMode;
  status: ItemStatus;
  pdfFileName?: string | null;
  assessmentData?: any;
  emailData?: any;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SSEEventType =
  | 'job_snapshot'
  | 'job_started'
  | 'item_started'
  | 'item_generated'
  | 'item_sent'
  | 'item_failed'
  | 'job_progress'
  | 'job_completed';

export interface SSEEvent {
  type: SSEEventType;
  data: any;
}

export type ItemFilter = 'all' | 'queued' | 'processing' | 'ready' | 'failed' | 'sent';
