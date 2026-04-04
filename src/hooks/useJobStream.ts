'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
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

class FatalSSEError extends Error {}

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
  const abortRef = useRef<AbortController | null>(null);
  const retriesRef = useRef(0);
  const MAX_RETRIES = 10;

  // Store latest callbacks in refs so the SSE loop always sees fresh values
  const onJobUpdateRef = useRef(onJobUpdate);
  const onItemUpdateRef = useRef(onItemUpdate);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onJobUpdateRef.current = onJobUpdate; }, [onJobUpdate]);
  useEffect(() => { onItemUpdateRef.current = onItemUpdate; }, [onItemUpdate]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const disconnect = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setConnected(false);
    setReconnecting(false);
  }, []);

  function handleSSEEvent(eventType: string, raw: any) {
    const data = keysToCamelCase(raw);

    switch (eventType) {
      case 'job_snapshot':
      case 'job_started':
      case 'job_progress':
        if (data.job) onJobUpdateRef.current?.(data.job);
        if (data.items) {
          (data.items as JobItem[]).forEach((item) => onItemUpdateRef.current?.(item));
        }
        break;

      case 'item_started':
      case 'item_generated':
      case 'item_sent':
      case 'item_failed':
        if (data.item) onItemUpdateRef.current?.(data.item);
        if (data.job) onJobUpdateRef.current?.(data.job);
        break;

      case 'job_completed':
        if (data.job) {
          onJobUpdateRef.current?.(data.job);
          onCompleteRef.current?.(data.job);
        }
        break;
    }
  }

  const connect = useCallback(async () => {
    if (!jobId || !enabled) return;

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const url = `${API_URL}/automation/jobs/${jobId}/stream`;

    try {
      await fetchEventSource(url, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: ctrl.signal,

        async onopen(response) {
          if (response.ok) {
            setConnected(true);
            setError(null);
            setReconnecting(false);
            retriesRef.current = 0;
            return;
          }
          if (response.status === 401 || response.status === 403) {
            throw new FatalSSEError(`Auth failed: ${response.status}`);
          }
          throw new Error(`SSE open failed: ${response.status}`);
        },

        onmessage(ev) {
          if (!ev.data) return;
          try {
            const raw = JSON.parse(ev.data);
            handleSSEEvent(ev.event || 'job_progress', raw);
          } catch {
            // ignore parse errors
          }
        },

        onclose() {
          setConnected(false);
          // fetchEventSource will retry automatically unless we throw
        },

        onerror(err) {
          setConnected(false);

          // Fatal errors — stop retrying
          if (err instanceof FatalSSEError) {
            setError(err.message);
            ctrl.abort();
            throw err;
          }

          // Retry with backoff
          retriesRef.current += 1;
          if (retriesRef.current > MAX_RETRIES) {
            setError('Lost connection to job stream. Please refresh.');
            setReconnecting(false);
            ctrl.abort();
            throw err; // stop retrying
          }

          setReconnecting(true);
          // Return delay in ms — fetchEventSource waits then retries
          return Math.min(1000 * Math.pow(2, retriesRef.current - 1), 30000);
        },

        openWhenHidden: true, // keep streaming even if tab is hidden
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // normal cleanup
      if (!(err instanceof FatalSSEError)) {
        setError(err.message || 'SSE connection failed');
      }
    }
  }, [jobId, enabled]);

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
