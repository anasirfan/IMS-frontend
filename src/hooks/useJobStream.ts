'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { keysToCamelCase } from '@/lib/caseTransform';
import type { BatchJob, JobItem, SSEEventType } from '@/types/automation-jobs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://suzair.duckdns.org/api';

interface UseJobStreamOptions {
  jobId: string | null;
  onJobUpdate?: (job: BatchJob) => void;
  onItemUpdate?: (item: JobItem) => void;
  onComplete?: (job: BatchJob) => void;
  enabled?: boolean;
}

interface UseJobStreamReturn {
  connected: boolean;
  error: string | null;
  reconnecting: boolean;
  disconnect: () => void;
}

export function useJobStream({
  jobId,
  onJobUpdate,
  onItemUpdate,
  onComplete,
  enabled = true,
}: UseJobStreamOptions): UseJobStreamReturn {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retriesRef = useRef(0);
  const MAX_RETRIES = 10;

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnected(false);
    setReconnecting(false);
  }, []);

  const connect = useCallback(() => {
    if (!jobId || !enabled) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const url = `${API_URL}/automation/jobs/${jobId}/stream${token ? `?token=${token}` : ''}`;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError(null);
      setReconnecting(false);
      retriesRef.current = 0;
    };

    es.onerror = () => {
      es.close();
      setConnected(false);

      if (retriesRef.current < MAX_RETRIES) {
        retriesRef.current += 1;
        setReconnecting(true);
        const delay = Math.min(1000 * Math.pow(2, retriesRef.current - 1), 30000);
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      } else {
        setError('Lost connection to job stream. Please refresh.');
        setReconnecting(false);
      }
    };

    const eventTypes: SSEEventType[] = [
      'job_snapshot',
      'job_started',
      'item_started',
      'item_generated',
      'item_sent',
      'item_failed',
      'job_progress',
      'job_completed',
    ];

    eventTypes.forEach((eventType) => {
      es.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const raw = JSON.parse(e.data);
          const data = keysToCamelCase(raw);

          switch (eventType) {
            case 'job_snapshot':
            case 'job_started':
            case 'job_progress':
              if (data.job) onJobUpdate?.(data.job);
              if (data.items) {
                (data.items as JobItem[]).forEach((item) => onItemUpdate?.(item));
              }
              break;

            case 'item_started':
            case 'item_generated':
            case 'item_sent':
            case 'item_failed':
              if (data.item) onItemUpdate?.(data.item);
              if (data.job) onJobUpdate?.(data.job);
              break;

            case 'job_completed':
              if (data.job) {
                onJobUpdate?.(data.job);
                onComplete?.(data.job);
              }
              break;
          }
        } catch {
          // ignore parse errors
        }
      });
    });
  }, [jobId, enabled, onJobUpdate, onItemUpdate, onComplete]);

  useEffect(() => {
    if (jobId && enabled) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [jobId, enabled, connect, disconnect]);

  return { connected, error, reconnecting, disconnect };
}
