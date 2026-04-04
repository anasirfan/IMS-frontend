'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import {
  ArrowLeft, Zap, Loader2, CheckCircle, XCircle, Clock, Send,
  FileText, Download, Eye, Square, CheckSquare, Filter, RefreshCw,
  Wifi, WifiOff, AlertTriangle, ChevronDown, Users,
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { useJobStream } from '@/hooks/useJobStream';
import type { BatchJob, JobItem, ItemFilter, ItemStatus } from '@/types/automation-jobs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://suzair.duckdns.org/api';

type Phase = 'select' | 'processing' | 'review' | 'sending' | 'done';

interface InboxCandidate {
  id: string;
  name: string;
  email: string;
  position: string;
}

// ─── helpers ───────────────────────────────────────────────────
function pdfUrl(fileName: string) {
  return `${API_URL?.replace('/api', '')}/uploads/assessments/${fileName}`;
}

function statusColor(s: ItemStatus) {
  switch (s) {
    case 'generated': return 'text-emerald';
    case 'sent': return 'text-blue-400';
    case 'failed': return 'text-red-400';
    case 'processing': return 'text-yellow-400';
    case 'skipped': return 'text-gray-500';
    default: return 'text-gray-400';
  }
}

function statusLabel(s: ItemStatus) {
  switch (s) {
    case 'queued': return 'Queued';
    case 'processing': return 'Processing…';
    case 'generated': return 'Ready';
    case 'sent': return 'Sent';
    case 'failed': return 'Failed';
    case 'skipped': return 'Skipped';
    default: return s;
  }
}

const STORAGE_KEY = 'ims_batch_job_id';

// ─── page ──────────────────────────────────────────────────────
export default function BatchJobPage() {
  const router = useRouter();

  // core state
  const [phase, setPhase] = useState<Phase>('select');
  const [job, setJob] = useState<BatchJob | null>(null);
  const [items, setItems] = useState<Map<string, JobItem>>(new Map());
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [sendJobId, setSendJobId] = useState<string | null>(null);

  // selection state
  const [candidates, setCandidates] = useState<InboxCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendSelectedIds, setSendSelectedIds] = useState<Set<string>>(new Set());

  // UI
  const [filter, setFilter] = useState<ItemFilter>('all');
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);

  // ─── SSE callbacks ───────────────────────────────────────────
  const handleJobUpdate = useCallback((j: BatchJob) => setJob(j), []);

  const handleItemUpdate = useCallback((item: JobItem) => {
    setItems((prev) => {
      const next = new Map(prev);
      next.set(item.candidateId, item);
      return next;
    });
  }, []);

  const handleJobComplete = useCallback((j: BatchJob) => {
    setJob(j);
    if (j.mode === 'preview') {
      setPhase('review');
      toast.success(`Preview complete: ${j.successfulItems} ready, ${j.failedItems} failed`);
    } else if (j.mode === 'send') {
      setPhase('done');
      toast.success(`Send complete: ${j.successfulItems} sent, ${j.failedItems} failed`);
    }
  }, []);

  // SSE for preview job
  const { connected: previewConnected, reconnecting: previewReconnecting } = useJobStream({
    jobId: activeJobId,
    onJobUpdate: handleJobUpdate,
    onItemUpdate: handleItemUpdate,
    onComplete: handleJobComplete,
    enabled: phase === 'processing',
  });

  // SSE for send job
  const handleSendItemUpdate = useCallback((item: JobItem) => {
    setItems((prev) => {
      const next = new Map(prev);
      next.set(item.candidateId, item);
      return next;
    });
  }, []);

  const handleSendJobUpdate = useCallback((j: BatchJob) => {
    // store send job progress but keep main job ref for counts
    setJob((prev) => prev ? { ...prev, ...j } : j);
  }, []);

  const { connected: sendConnected } = useJobStream({
    jobId: sendJobId,
    onJobUpdate: handleSendJobUpdate,
    onItemUpdate: handleSendItemUpdate,
    onComplete: handleJobComplete,
    enabled: phase === 'sending',
  });

  // ─── recovery on mount ──────────────────────────────────────
  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId) {
      recoverJob(savedId);
    } else {
      fetchCandidates();
    }
  }, []);

  async function recoverJob(jobId: string) {
    try {
      const [jobRes, itemsRes] = await Promise.all([
        api.get(`/automation/jobs/${jobId}`),
        api.get(`/automation/jobs/${jobId}/items`),
      ]);
      const recoveredJob: BatchJob = jobRes.data?.data || jobRes.data;
      const recoveredItems: JobItem[] = itemsRes.data?.data || itemsRes.data || [];

      setJob(recoveredJob);
      const map = new Map<string, JobItem>();
      recoveredItems.forEach((it) => map.set(it.candidateId, it));
      setItems(map);
      setActiveJobId(jobId);

      const terminal = ['completed', 'completed_with_errors', 'failed'];
      if (terminal.includes(recoveredJob.status)) {
        if (recoveredJob.mode === 'preview') {
          setPhase('review');
          // pre-select all ready items for send
          const ready = recoveredItems.filter((i) => i.status === 'generated').map((i) => i.candidateId);
          setSendSelectedIds(new Set(ready));
        } else {
          setPhase('done');
        }
      } else {
        setPhase('processing');
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      fetchCandidates();
    }
  }

  // ─── fetch candidates ────────────────────────────────────────
  async function fetchCandidates() {
    setLoadingCandidates(true);
    try {
      const res = await api.get('/candidates?status=INBOX&roundStage=INBOX');
      const data: InboxCandidate[] = res.data?.data || res.data || [];
      setCandidates(data);
      setSelectedIds(new Set(data.map((c) => c.id)));
    } catch {
      toast.error('Failed to load INBOX candidates');
    } finally {
      setLoadingCandidates(false);
    }
  }

  // ─── start preview job ───────────────────────────────────────
  async function startPreviewJob() {
    if (selectedIds.size === 0) {
      toast.error('Select at least one candidate');
      return;
    }
    setStarting(true);
    try {
      const res = await api.post('/automation/jobs/preview', {
        candidateIds: Array.from(selectedIds),
      });
      const data = res.data?.data || res.data;
      const jobId = data.id || data.jobId;
      setActiveJobId(jobId);
      localStorage.setItem(STORAGE_KEY, jobId);
      setPhase('processing');
      setItems(new Map());
      toast.success('Preview job started');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start preview job');
    } finally {
      setStarting(false);
    }
  }

  // ─── start send job ──────────────────────────────────────────
  async function startSendJob() {
    if (sendSelectedIds.size === 0) {
      toast.error('Select at least one ready candidate to send');
      return;
    }
    setSending(true);
    try {
      const res = await api.post('/automation/jobs/send', {
        previewJobId: activeJobId,
        candidateIds: Array.from(sendSelectedIds),
      });
      const data = res.data?.data || res.data;
      const sId = data.id || data.jobId;
      setSendJobId(sId);
      setPhase('sending');
      toast.success('Send job started');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start send job');
    } finally {
      setSending(false);
    }
  }

  // ─── new batch ───────────────────────────────────────────────
  function startNewBatch() {
    localStorage.removeItem(STORAGE_KEY);
    setPhase('select');
    setJob(null);
    setItems(new Map());
    setActiveJobId(null);
    setSendJobId(null);
    setSelectedIds(new Set());
    setSendSelectedIds(new Set());
    setFilter('all');
    fetchCandidates();
  }

  // ─── derived data ────────────────────────────────────────────
  const itemList = useMemo(() => Array.from(items.values()), [items]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return itemList;
    if (filter === 'queued') return itemList.filter((i) => i.status === 'queued');
    if (filter === 'processing') return itemList.filter((i) => i.status === 'processing');
    if (filter === 'ready') return itemList.filter((i) => i.status === 'generated');
    if (filter === 'failed') return itemList.filter((i) => i.status === 'failed');
    if (filter === 'sent') return itemList.filter((i) => i.status === 'sent');
    return itemList;
  }, [itemList, filter]);

  const counts = useMemo(() => {
    const c = { total: itemList.length, queued: 0, processing: 0, ready: 0, failed: 0, sent: 0 };
    itemList.forEach((i) => {
      if (i.status === 'queued') c.queued++;
      else if (i.status === 'processing') c.processing++;
      else if (i.status === 'generated') c.ready++;
      else if (i.status === 'failed') c.failed++;
      else if (i.status === 'sent') c.sent++;
    });
    return c;
  }, [itemList]);

  const progress = job && job.totalItems > 0
    ? Math.round((job.processedItems / job.totalItems) * 100)
    : 0;

  // ─── selection helpers ───────────────────────────────────────
  function toggleCandidate(id: string) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleAllCandidates() {
    setSelectedIds((prev) =>
      prev.size === candidates.length ? new Set() : new Set(candidates.map((c) => c.id))
    );
  }

  function toggleSendItem(id: string) {
    setSendSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleAllSendItems() {
    const readyIds = itemList.filter((i) => i.status === 'generated').map((i) => i.candidateId);
    setSendSelectedIds((prev) =>
      prev.size === readyIds.length ? new Set() : new Set(readyIds)
    );
  }

  // auto-select ready items when preview completes
  useEffect(() => {
    if (phase === 'review') {
      const ready = itemList.filter((i) => i.status === 'generated').map((i) => i.candidateId);
      setSendSelectedIds(new Set(ready));
    }
  }, [phase]);

  // ─── render ──────────────────────────────────────────────────
  return (
    <>
      <Header title="Batch Assessment" subtitle="Generate and send assessments in background">
        <button
          onClick={() => router.push('/dashboard/automation')}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Automation
        </button>
      </Header>

      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* ── Connection status ── */}
        {(phase === 'processing' || phase === 'sending') && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
            (previewConnected || sendConnected)
              ? 'bg-emerald/10 text-emerald border border-emerald/20'
              : previewReconnecting
                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {(previewConnected || sendConnected) ? <Wifi size={14} /> : <WifiOff size={14} />}
            {(previewConnected || sendConnected) ? 'Connected — receiving live updates'
              : previewReconnecting ? 'Reconnecting…'
              : 'Disconnected'}
          </div>
        )}

        {/* ── Phase: Select candidates ── */}
        {phase === 'select' && (
          <div className="glass-surface p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Users size={20} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-200">Select Candidates</h2>
                  <p className="text-sm text-gray-500">Choose INBOX candidates for batch assessment</p>
                </div>
              </div>
              <button
                onClick={fetchCandidates}
                disabled={loadingCandidates}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 bg-glass-white5 hover:bg-glass-white10 rounded-lg border border-glass-border transition-colors"
              >
                <RefreshCw size={12} className={loadingCandidates ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {loadingCandidates ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-blue-400" />
              </div>
            ) : candidates.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No INBOX candidates found.
              </div>
            ) : (
              <>
                {/* select all */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <button onClick={toggleAllCandidates} className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 transition-colors">
                    {selectedIds.size === candidates.length
                      ? <CheckSquare size={16} className="text-blue-400" />
                      : <Square size={16} />}
                    {selectedIds.size === candidates.length ? 'Deselect All' : 'Select All'}
                    <span className="text-gray-600">({selectedIds.size}/{candidates.length})</span>
                  </button>
                </div>

                <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
                  {candidates.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => toggleCandidate(c.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                        selectedIds.has(c.id)
                          ? 'bg-blue-500/10 border-blue-500/30'
                          : 'bg-glass-white5 border-glass-border hover:bg-glass-white10'
                      }`}
                    >
                      {selectedIds.has(c.id)
                        ? <CheckSquare size={18} className="text-blue-400 flex-shrink-0" />
                        : <Square size={18} className="text-gray-600 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate">{c.name}</p>
                        <p className="text-xs text-gray-500 truncate">{c.email}</p>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">{c.position}</span>
                    </div>
                  ))}
                </div>

                {/* action */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-glass-border">
                  <p className="text-sm text-gray-500">{selectedIds.size} candidate{selectedIds.size !== 1 ? 's' : ''} selected</p>
                  <button
                    onClick={startPreviewJob}
                    disabled={starting || selectedIds.size === 0}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
                  >
                    {starting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                    Generate Preview
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Progress / Review / Send / Done ── */}
        {phase !== 'select' && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Total', value: counts.total, icon: Users, color: 'text-gray-300', bg: 'bg-glass-white10' },
                { label: 'Processing', value: counts.queued + counts.processing, icon: Loader2, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                { label: 'Ready', value: counts.ready, icon: CheckCircle, color: 'text-emerald', bg: 'bg-emerald/10' },
                { label: 'Failed', value: counts.failed, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
                { label: 'Sent', value: counts.sent, icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              ].map((card) => (
                <div key={card.label} className={`${card.bg} border border-glass-border rounded-xl p-4`}>
                  <div className="flex items-center gap-2 mb-1">
                    <card.icon size={14} className={`${card.color} ${card.label === 'Processing' && (counts.queued + counts.processing) > 0 ? 'animate-spin' : ''}`} />
                    <span className="text-xs text-gray-500">{card.label}</span>
                  </div>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {(phase === 'processing' || phase === 'sending') && (
              <div className="glass-surface p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-300 font-medium">
                    {phase === 'processing' ? 'Generating previews…' : 'Sending assessments…'}
                  </p>
                  <p className="text-sm text-gray-400">{progress}%</p>
                </div>
                <div className="w-full h-2 bg-glass-white10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      phase === 'processing' ? 'bg-blue-500' : 'bg-emerald'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {job?.processedItems || 0} / {job?.totalItems || 0} processed
                  {phase === 'processing' && ' — you can navigate away, processing continues in the background'}
                </p>
              </div>
            )}

            {/* Done banner */}
            {phase === 'done' && (
              <div className="bg-emerald/10 border border-emerald/30 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-emerald" />
                  <div>
                    <p className="text-sm font-medium text-emerald">Batch Complete</p>
                    <p className="text-xs text-gray-400">
                      {counts.sent} sent, {counts.failed} failed, {counts.ready} not sent
                    </p>
                  </div>
                </div>
                <button
                  onClick={startNewBatch}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-glass-white5 hover:bg-glass-white10 border border-glass-border rounded-lg text-gray-300 transition-colors"
                >
                  <RefreshCw size={14} />
                  New Batch
                </button>
              </div>
            )}

            {/* Review banner + send action */}
            {phase === 'review' && (
              <div className="glass-surface p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye size={20} className="text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-200">Preview Complete — Review & Send</p>
                    <p className="text-xs text-gray-500">
                      Select candidates below and click Send Selected. Only ready items can be sent.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={startNewBatch}
                    className="px-3 py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    onClick={startSendJob}
                    disabled={sending || sendSelectedIds.size === 0}
                    className="flex items-center gap-2 px-5 py-2 bg-emerald hover:bg-emerald/80 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
                  >
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Send Selected ({sendSelectedIds.size})
                  </button>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {([
                { key: 'all' as ItemFilter, label: 'All', count: counts.total },
                { key: 'processing' as ItemFilter, label: 'Queued / Processing', count: counts.queued + counts.processing },
                { key: 'ready' as ItemFilter, label: 'Ready', count: counts.ready },
                { key: 'failed' as ItemFilter, label: 'Failed', count: counts.failed },
                { key: 'sent' as ItemFilter, label: 'Sent', count: counts.sent },
              ]).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    filter === f.key
                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                      : 'bg-glass-white5 border-glass-border text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}

              {/* Select all ready for send (review phase only) */}
              {phase === 'review' && (
                <button
                  onClick={toggleAllSendItems}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-emerald transition-colors"
                >
                  <CheckSquare size={14} />
                  {sendSelectedIds.size === counts.ready ? 'Deselect All Ready' : 'Select All Ready'}
                </button>
              )}
            </div>

            {/* Candidate items list */}
            <div className="space-y-1">
              {filteredItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No items match this filter.
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.candidateId}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      phase === 'review' && item.status === 'generated' && sendSelectedIds.has(item.candidateId)
                        ? 'bg-emerald/5 border-emerald/30'
                        : 'bg-glass-white5 border-glass-border'
                    }`}
                  >
                    {/* Send checkbox (review phase, ready items only) */}
                    {phase === 'review' && item.status === 'generated' && (
                      <button onClick={() => toggleSendItem(item.candidateId)} className="flex-shrink-0">
                        {sendSelectedIds.has(item.candidateId)
                          ? <CheckSquare size={18} className="text-emerald" />
                          : <Square size={18} className="text-gray-600" />}
                      </button>
                    )}

                    {/* Status icon */}
                    <div className="flex-shrink-0">
                      {item.status === 'processing' && <Loader2 size={16} className="animate-spin text-yellow-400" />}
                      {item.status === 'queued' && <Clock size={16} className="text-gray-500" />}
                      {item.status === 'generated' && <CheckCircle size={16} className="text-emerald" />}
                      {item.status === 'sent' && <Send size={16} className="text-blue-400" />}
                      {item.status === 'failed' && <XCircle size={16} className="text-red-400" />}
                      {item.status === 'skipped' && <AlertTriangle size={16} className="text-gray-500" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{item.candidateName}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${statusColor(item.status)}`}>
                          {statusLabel(item.status)}
                        </span>
                        {item.candidatePosition && (
                          <span className="text-xs text-gray-600">• {item.candidatePosition}</span>
                        )}
                        {item.errorMessage && (
                          <span className="text-xs text-red-400 truncate">— {item.errorMessage}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.pdfFileName && (
                        <>
                          <a
                            href={pdfUrl(item.pdfFileName)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-glass-white5 hover:bg-glass-white10 border border-glass-border rounded-lg text-gray-300 transition-colors"
                            title="View PDF"
                          >
                            <Eye size={12} />
                            PDF
                          </a>
                          <a
                            href={pdfUrl(item.pdfFileName)}
                            download
                            className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                            title="Download PDF"
                          >
                            <Download size={14} />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
