'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateService } from '@/services/candidate.service';
import { googleService } from '@/services/admin.service';
import api from '@/lib/axios';
import Header from '@/components/layout/Header';
import { MetricsSkeleton } from '@/components/ui/LoadingSkeleton';
import { Users, UserCheck, UserX, Calendar, Archive, TrendingUp, BarChart3, Clock, Brain, Zap, CheckCircle2, AlertCircle, Mail, HardDrive, Link2, RefreshCw, ExternalLink, Video, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Metrics } from '@/types';
import Link from 'next/link';
import toast from 'react-hot-toast';

function GoogleControlPanel() {
  const queryClient = useQueryClient();
  const [fetchLog, setFetchLog] = useState<any[]>([]);
  const [fetchResult, setFetchResult] = useState<string | null>(null);
  const [recResult, setRecResult] = useState<string | null>(null);
  const [showEmailExtraction, setShowEmailExtraction] = useState(false);

  const connectMutation = useMutation({
    mutationFn: () => googleService.getAuthUrl(),
    onSuccess: (res) => {
      if (res.data?.url) { window.open(res.data.url, '_blank'); toast.success('Opening Google OAuth...'); }
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const revokeMutation = useMutation({
    mutationFn: () => googleService.revoke(),
    onSuccess: () => { toast.success('Tokens cleared. Click Connect to re-authorize with full scopes.'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const fetchEmailsMutation = useMutation({
    mutationFn: () => googleService.fetchEmails(),
    onSuccess: (res: any) => {
      const count = res.data?.count || 0;
      const candidates = res.data?.candidates || [];
      setFetchResult(`Fetched ${count} new email(s), ${candidates.length} candidates in pipeline`);
      setFetchLog(candidates);
      toast.success(`Fetched ${count} new email(s)`);
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['board-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
    onError: (err: any) => { setFetchResult(err.response?.data?.message || 'Failed'); toast.error(err.response?.data?.message || 'Failed'); },
  });

  const fetchRecordingsMutation = useMutation({
    mutationFn: () => googleService.fetchRecordings(),
    onSuccess: (res: any) => {
      const { total, matched } = res.data || {};
      setRecResult(`Found ${total} recordings, matched ${matched}`);
      toast.success(`Matched ${matched} recordings`);
      queryClient.invalidateQueries({ queryKey: ['board-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
    onError: (err: any) => { setRecResult(err.response?.data?.message || 'Failed'); toast.error('Failed'); },
  });

  const [cvList, setCvList] = useState<any[]>([]);
  const [selectedCvs, setSelectedCvs] = useState<Set<string>>(new Set());
  const [processLog, setProcessLog] = useState<string[]>([]);
  const [createdCandidates, setCreatedCandidates] = useState<any[]>([]);
  const [assessmentList, setAssessmentList] = useState<any[]>([]);

  // Fetch all existing candidates for Steps 3-5
  const { data: allCandidatesData } = useQuery({
    queryKey: ['all-candidates-for-matching'],
    queryFn: async () => {
      const { data } = await api.get('/candidates');
      return data;
    },
  });

  const existingCandidates = allCandidatesData?.data || [];
  const candidatesForMatching = createdCandidates.length > 0 ? createdCandidates : existingCandidates;

  const listCvsMutation = useMutation({
    mutationFn: () => googleService.listAmishCvs(),
    onSuccess: (res: any) => {
      const cvs = res.data?.cvs || [];
      setCvList(cvs);
      setSelectedCvs(new Set(cvs.map((cv: any) => cv.attachmentId))); // Select all by default
      toast.success(`Found ${cvs.length} CV attachments`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to list CVs'),
  });

  const processSelectedMutation = useMutation({
    mutationFn: () => {
      const selected = cvList.filter(cv => selectedCvs.has(cv.attachmentId));
      return googleService.processSelectedCvs(selected);
    },
    onSuccess: (res: any) => {
      const { created, log } = res.data || {};
      setCreatedCandidates(created || []);
      setProcessLog(log || []);
      toast.success(`Created ${created?.length || 0} candidates`);
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['board-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to process CVs'),
  });

  const listAssessmentsMutation = useMutation({
    mutationFn: () => googleService.listSentAssessments(),
    onSuccess: (res: any) => {
      const assessments = res.data?.assessments || [];
      setAssessmentList(assessments);
      toast.success(`Found ${assessments.length} sent assessments`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to list assessments'),
  });

  const matchAssessmentMutation = useMutation({
    mutationFn: ({ candidateId, email, messageId }: { candidateId: string; email: string; messageId?: string }) => 
      googleService.matchAssessment(candidateId, email, messageId),
    onSuccess: () => {
      toast.success('Assessment matched');
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to match assessment'),
  });

  const [schedulingList, setSchedulingList] = useState<any[]>([]);
  const [recordingsList, setRecordingsList] = useState<any[]>([]);
  const [notesList, setNotesList] = useState<any[]>([]);

  const listSchedulingMutation = useMutation({
    mutationFn: () => googleService.listSentScheduling(),
    onSuccess: (res: any) => {
      const scheduling = res.data?.schedulingEmails || [];
      setSchedulingList(scheduling);
      toast.success(`Found ${scheduling.length} scheduling emails`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to list scheduling'),
  });

  const matchSchedulingMutation = useMutation({
    mutationFn: ({ candidateId, date }: { candidateId: string; date: string }) => 
      googleService.matchScheduling(candidateId, date),
    onSuccess: () => {
      toast.success('Scheduling matched');
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to match'),
  });

  const listRecordingsMutation = useMutation({
    mutationFn: () => googleService.listDriveRecordingsNotes(),
    onSuccess: (res: any) => {
      const recordings = res.data?.recordings || [];
      const notes = res.data?.notes || [];
      setRecordingsList(recordings);
      setNotesList(notes);
      toast.success(`Found ${recordings.length} recordings and ${notes.length} notes`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to list recordings'),
  });

  const matchRecordingMutation = useMutation({
    mutationFn: ({ candidateId, recordingLink, notesLink }: { candidateId: string; recordingLink?: string; notesLink?: string }) => 
      googleService.matchRecordingNotes(candidateId, recordingLink, notesLink),
    onSuccess: () => {
      toast.success('Recording/notes matched');
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to match'),
  });

  const categorizeMutation = useMutation({
    mutationFn: ({ id, category }: { id: string; category: 'CV' | 'ASSESSMENT' | 'REPLY' }) => googleService.categorize(id, category),
    onSuccess: () => {
      toast.success('Categorized');
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['board-candidates'] });
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.5 }} className="mt-4 glass-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-emerald" />
          <h2 className="text-sm font-semibold text-gray-200">Google Integration Controls</h2>
        </div>
        <button onClick={() => revokeMutation.mutate()} disabled={revokeMutation.isPending}
          className="text-[10px] text-gray-500 hover:text-red-400 transition-colors">
          {revokeMutation.isPending ? 'Clearing...' : 'Revoke & Re-auth'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Connect OAuth */}
        <div className="glass-surface p-3 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-emerald/20 flex items-center justify-center text-[9px] font-bold text-emerald">1</div>
            <p className="text-[11px] font-semibold text-gray-300">Connect Google</p>
          </div>
          <p className="text-[9px] text-gray-500">Gmail + Calendar + Drive access</p>
          <button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending}
            className="btn-primary w-full text-[11px] py-1.5 flex items-center justify-center gap-1.5">
            <ExternalLink size={12} /> {connectMutation.isPending ? 'Opening...' : 'Connect OAuth'}
          </button>
        </div>

        {/* Fetch Emails */}
        <div className="glass-surface p-3 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center text-[9px] font-bold text-blue-400">2</div>
            <p className="text-[11px] font-semibold text-gray-300">Fetch Emails</p>
          </div>
          <p className="text-[9px] text-gray-500">Scan Gmail since Feb 2, 2026</p>
          <button onClick={() => fetchEmailsMutation.mutate()} disabled={fetchEmailsMutation.isPending}
            className="btn-outline w-full text-[11px] py-1.5 flex items-center justify-center gap-1.5">
            {fetchEmailsMutation.isPending ? <><RefreshCw size={12} className="animate-spin" /> Fetching...</> : <><Mail size={12} /> Fetch Now</>}
          </button>
          {fetchResult && <p className={`text-[9px] ${fetchResult.includes('Failed') ? 'text-red-400' : 'text-emerald'}`}>{fetchResult}</p>}
        </div>

        {/* Fetch Recordings */}
        <div className="glass-surface p-3 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-500/20 flex items-center justify-center text-[9px] font-bold text-purple-400">3</div>
            <p className="text-[11px] font-semibold text-gray-300">Meet Recordings</p>
          </div>
          <p className="text-[9px] text-gray-500">Scan Drive recordings folder</p>
          <button onClick={() => fetchRecordingsMutation.mutate()} disabled={fetchRecordingsMutation.isPending}
            className="btn-outline w-full text-[11px] py-1.5 flex items-center justify-center gap-1.5">
            {fetchRecordingsMutation.isPending ? <><RefreshCw size={12} className="animate-spin" /> Scanning...</> : <><Video size={12} /> Scan Drive</>}
          </button>
          {recResult && <p className={`text-[9px] ${recResult.includes('Failed') ? 'text-red-400' : 'text-emerald'}`}>{recResult}</p>}
        </div>

        {/* Quick Info */}
        <div className="glass-surface p-3 rounded-xl space-y-2">
          <p className="text-[11px] font-semibold text-gray-300">Setup Checklist</p>
          <div className="space-y-1 text-[9px]">
            <p className="text-gray-500">1. Add redirect URI in Google Cloud:</p>
            <p className="text-eton font-mono text-[8px] break-all">69.62.125.138:5041/api/google/callback</p>
            <p className="text-gray-500">2. Click Connect → authorize</p>
            <p className="text-gray-500">3. Fetch Emails → Scan Drive</p>
            <p className="text-gray-600 mt-1">If scope error: click Revoke first</p>
          </div>
        </div>
      </div>

      {/* Manual CV Selection & Processing */}
      <div className="mt-4 border-t border-glass-border pt-4">
        <p className="text-[11px] font-semibold text-gray-300 mb-3">Manual CV Processing from Amish</p>
        
        {/* Email Extraction Accordion */}
        <div className="glass-surface rounded-lg p-4 mb-3">
          <button
            onClick={() => setShowEmailExtraction(!showEmailExtraction)}
            className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-emerald" />
              <p className="text-sm font-semibold text-gray-200">Email Extraction Tools</p>
              <span className="text-xs text-gray-500">(Advanced)</span>
            </div>
            {showEmailExtraction ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>
        </div>

        {showEmailExtraction && (
          <>
            {/* Step 1: List CV Attachments */}
            <div className="glass-surface rounded-lg p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-semibold text-gray-300">Step 1: List CV Attachments</p>
                  <p className="text-[9px] text-gray-500">Searches <span className="text-eton">amish.hassan@es.uol.edu.pk</span> for emails with CV attachments</p>
                </div>
                <button onClick={() => listCvsMutation.mutate()} disabled={listCvsMutation.isPending}
                  className="btn-outline text-[10px] py-1 px-3 flex items-center gap-1.5">
                  {listCvsMutation.isPending ? <><RefreshCw size={11} className="animate-spin" /> Loading...</> : <><Mail size={11} /> List CVs</>}
                </button>
              </div>

              {cvList.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[9px] text-gray-400">{cvList.length} CV attachments found — {selectedCvs.size} selected</p>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedCvs(new Set(cvList.map(cv => cv.attachmentId)))}
                    className="text-[9px] text-emerald hover:underline">Select All</button>
                  <button onClick={() => setSelectedCvs(new Set())}
                    className="text-[9px] text-gray-500 hover:underline">Deselect All</button>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {cvList.map((cv: any) => (
                  <label key={cv.attachmentId} className="flex items-center gap-2 p-2 rounded hover:bg-glass-white5 cursor-pointer transition-colors">
                    <input type="checkbox" checked={selectedCvs.has(cv.attachmentId)}
                      onChange={(e) => {
                        const newSet = new Set(selectedCvs);
                        if (e.target.checked) newSet.add(cv.attachmentId);
                        else newSet.delete(cv.attachmentId);
                        setSelectedCvs(newSet);
                      }}
                      className="w-3 h-3 rounded border-glass-border bg-stealth text-emerald focus:ring-emerald focus:ring-1" />
                    <span className="text-[10px] text-gray-300 flex-1">{cv.filename}</span>
                    <span className="text-[9px] text-gray-500">{(cv.size / 1024).toFixed(0)} KB</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Process Selected */}
        {cvList.length > 0 && (
          <div className="glass-surface rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] font-semibold text-gray-300">Step 2: Process Selected CVs</p>
                <p className="text-[9px] text-gray-500">Downloads {selectedCvs.size} selected CVs and creates candidates with AI analysis</p>
              </div>
              <button onClick={() => processSelectedMutation.mutate()} disabled={processSelectedMutation.isPending || selectedCvs.size === 0}
                className="btn-primary text-[10px] py-1 px-3 flex items-center gap-1.5">
                {processSelectedMutation.isPending ? <><RefreshCw size={11} className="animate-spin" /> Processing...</> : `Process ${selectedCvs.size} CVs`}
              </button>
            </div>

            {processLog.length > 0 && (
              <div className="bg-stealth-surface rounded p-2 max-h-32 overflow-y-auto">
                <p className="text-[9px] font-semibold text-gray-400 mb-1">Process Log</p>
                {processLog.map((line: string, i: number) => (
                  <p key={i} className={`text-[8px] font-mono ${line.includes('CREATED') ? 'text-emerald' : line.includes('ERROR') ? 'text-red-400' : 'text-gray-500'}`}>{line}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Match Assessments */}
        <div className="glass-surface rounded-lg p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-semibold text-gray-300">Step 3: Match Assessment Emails</p>
              <p className="text-[9px] text-gray-500">Match sent assessment emails to candidates — {candidatesForMatching.length} candidates available</p>
            </div>
            <button onClick={() => listAssessmentsMutation.mutate()} disabled={listAssessmentsMutation.isPending}
              className="btn-outline text-[10px] py-1 px-3 flex items-center gap-1.5">
              {listAssessmentsMutation.isPending ? <><RefreshCw size={11} className="animate-spin" /> Loading...</> : <><Mail size={11} /> List Assessments</>}
            </button>
          </div>

          {assessmentList.length > 0 && candidatesForMatching.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {candidatesForMatching.map((candidate: any) => (
                <div key={candidate.id} className="flex items-center gap-2 p-2 rounded bg-stealth-surface">
                  <span className="text-[10px] text-gray-300 w-32 truncate">{candidate.name}</span>
                  <select onChange={(e) => {
                    if (e.target.value) {
                      const assessment = assessmentList[parseInt(e.target.value)];
                      matchAssessmentMutation.mutate({ 
                        candidateId: candidate.id, 
                        email: assessment.to,
                        messageId: assessment.messageId
                      });
                    }
                  }}
                    className="flex-1 text-[9px] bg-charleston text-eton border border-glass-border rounded px-2 py-1">
                    <option value="">Select assessment email...</option>
                    {assessmentList.map((assessment: any, i: number) => (
                      <option key={i} value={i}>{assessment.to} — {assessment.subject.slice(0, 40)}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step 4: Match Scheduling Emails */}
        <div className="glass-surface rounded-lg p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-semibold text-gray-300">Step 4: Match Interview Scheduling</p>
              <p className="text-[9px] text-gray-500">Match sent scheduling emails (Feb 18-24) to candidates — {candidatesForMatching.length} candidates available</p>
            </div>
            <button onClick={() => listSchedulingMutation.mutate()} disabled={listSchedulingMutation.isPending}
              className="btn-outline text-[10px] py-1 px-3 flex items-center gap-1.5">
              {listSchedulingMutation.isPending ? <><RefreshCw size={11} className="animate-spin" /> Loading...</> : <><Mail size={11} /> List Scheduling</>}
            </button>
          </div>

          {schedulingList.length > 0 && candidatesForMatching.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {candidatesForMatching.map((candidate: any) => (
                <div key={candidate.id} className="flex items-center gap-2 p-2 rounded bg-stealth-surface">
                  <span className="text-[10px] text-gray-300 w-32 truncate">{candidate.name}</span>
                  <select onChange={(e) => e.target.value && matchSchedulingMutation.mutate({ candidateId: candidate.id, date: e.target.value })}
                    className="flex-1 text-[9px] bg-charleston text-eton border border-glass-border rounded px-2 py-1">
                    <option value="">Select scheduling email...</option>
                    {schedulingList.map((sched: any, i: number) => (
                      <option key={i} value={sched.date}>{sched.to[0]} — {sched.subject.slice(0, 30)} — {new Date(sched.date).toLocaleDateString()}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step 5: Match Recordings & Notes */}
        <div className="glass-surface rounded-lg p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-semibold text-gray-300">Step 5: Match Drive Recordings & Notes</p>
              <p className="text-[9px] text-gray-500">Match 10 recordings and 10 meeting notes from Drive — {candidatesForMatching.length} candidates available</p>
            </div>
            <button onClick={() => listRecordingsMutation.mutate()} disabled={listRecordingsMutation.isPending}
              className="btn-outline text-[10px] py-1 px-3 flex items-center gap-1.5">
              {listRecordingsMutation.isPending ? <><RefreshCw size={11} className="animate-spin" /> Loading...</> : <><Mail size={11} /> List Recordings</>}
            </button>
          </div>

          {(recordingsList.length > 0 || notesList.length > 0) && candidatesForMatching.length > 0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {candidatesForMatching.map((candidate: any) => (
                <div key={candidate.id} className="p-2 rounded bg-stealth-surface space-y-2">
                  <p className="text-[10px] text-gray-300 font-semibold">{candidate.name}</p>
                  <div className="flex gap-2">
                    <select onChange={(e) => {
                      const recording = recordingsList.find(r => r.link === e.target.value);
                      if (recording) matchRecordingMutation.mutate({ candidateId: candidate.id, recordingLink: recording.link });
                    }}
                      className="flex-1 text-[9px] bg-charleston text-eton border border-glass-border rounded px-2 py-1">
                      <option value="">Select recording...</option>
                      {recordingsList.map((rec: any, i: number) => (
                        <option key={i} value={rec.link}>{rec.name} ({(rec.size / 1024 / 1024).toFixed(1)} MB)</option>
                      ))}
                    </select>
                    <select onChange={(e) => {
                      const note = notesList.find(n => n.link === e.target.value);
                      if (note) matchRecordingMutation.mutate({ candidateId: candidate.id, notesLink: note.link });
                    }}
                      className="flex-1 text-[9px] bg-charleston text-eton border border-glass-border rounded px-2 py-1">
                      <option value="">Select notes...</option>
                      {notesList.map((note: any, i: number) => (
                        <option key={i} value={note.link}>{note.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reject Failed Candidates */}
        <div className="glass-surface rounded-lg p-4">
          <div>
            <p className="text-[10px] font-semibold text-gray-300 mb-2">Mark Rejected Candidates</p>
            <p className="text-[9px] text-gray-500 mb-3">Mark candidates who failed to provide assessment as REJECTED — {candidatesForMatching.length} candidates available</p>
          </div>
          {candidatesForMatching.length > 0 && (
            <div className="space-y-2">
              {candidatesForMatching.map((candidate: any) => (
                <div key={candidate.id} className="flex items-center justify-between p-2 rounded bg-stealth-surface">
                  <span className="text-[10px] text-gray-300">{candidate.name}</span>
                  <button onClick={() => categorizeMutation.mutate({ id: candidate.id, category: 'REJECTED' as any })}
                    className="px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 text-[9px]">
                    Mark REJECTED
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}
      </div>

      {/* Generic Fetch Log */}
      {fetchLog.length > 0 && (
        <div className="mt-4 border-t border-glass-border pt-4">
          <p className="text-[11px] font-semibold text-gray-300 mb-3">Generic Fetch Log — {fetchLog.length} candidate(s)</p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {fetchLog.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-glass-white5 hover:bg-glass-white8 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-xs font-medium text-gray-200 truncate w-32">{c.name}</span>
                  <span className="text-[10px] text-gray-500 truncate w-40">{c.email}</span>
                  <span className="text-[10px] text-gray-500 truncate w-32">{c.position}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${c.status === 'ASSESSMENT' ? 'bg-blue-500/10 text-blue-400' : c.cvPath ? 'bg-emerald/10 text-emerald' : 'bg-glass-white5 text-gray-400'}`}>
                    {c.cvPath ? '📎 CV' : ''} {c.status}
                  </span>
                </div>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  <button onClick={() => categorizeMutation.mutate({ id: c.id, category: 'CV' })}
                    className="text-[9px] px-2 py-0.5 rounded bg-stealth text-eton border border-glass-border hover:border-emerald/30">CV</button>
                  <button onClick={() => categorizeMutation.mutate({ id: c.id, category: 'ASSESSMENT' })}
                    className="text-[9px] px-2 py-0.5 rounded bg-stealth text-blue-400 border border-glass-border hover:border-blue-400/30">Assess</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => candidateService.getMetrics(),
  });

  const { data: aiHealth } = useQuery({
    queryKey: ['ai-health'],
    queryFn: async () => { const { data } = await api.get('/health/ai'); return data.data; },
    staleTime: 60000,
  });

  const metrics: Metrics | null = data?.data || null;

  const cards = metrics
    ? [
        { label: 'Total', value: metrics.total, icon: Users, color: 'text-gray-100', iconColor: 'text-eton', bg: 'bg-eton/10' },
        { label: 'Inbox', value: metrics.byStatus.inbox, icon: Clock, color: 'text-gray-400', iconColor: 'text-gray-400', bg: 'bg-glass-white5' },
        { label: 'Assessment', value: metrics.byStatus.assessment, icon: BarChart3, color: 'text-blue-400', iconColor: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Scheduled', value: metrics.byStatus.scheduled, icon: Calendar, color: 'text-purple-400', iconColor: 'text-purple-400', bg: 'bg-purple-500/10' },
        { label: 'Interview', value: metrics.byStatus.interview, icon: Users, color: 'text-amber-400', iconColor: 'text-amber-400', bg: 'bg-amber-500/10' },
        { label: 'Shortlisted', value: metrics.byStatus.shortlisted || 0, icon: UserCheck, color: 'text-cyan-400', iconColor: 'text-cyan-400', bg: 'bg-cyan-500/10' },
        { label: 'Rejected', value: metrics.byStatus.rejected, icon: UserX, color: 'text-red-400', iconColor: 'text-red-400', bg: 'bg-red-500/10' },
      ]
    : [];

  return (
    <>
      <Header title="Dashboard" subtitle="Limi Stealth recruitment overview">
        <Link href="/dashboard/board" className="btn-primary flex items-center gap-1.5 text-xs">
          <Zap size={14} /> Open Pipeline
        </Link>
      </Header>
      <div className="p-6">
        {isLoading ? (
          <MetricsSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {cards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <div className="glass-card-hover p-4 group">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{card.label}</span>
                        <div className={`p-1.5 rounded-lg ${card.bg}`}>
                          <Icon size={14} className={card.iconColor} />
                        </div>
                      </div>
                      <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* AI & Integration Status */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="mt-6 glass-card p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Brain size={16} className="text-emerald" />
                <h2 className="text-sm font-semibold text-gray-200">AI & Integration Status</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Gmail Sync', configured: aiHealth?.gmail?.configured, note: aiHealth?.gmail?.note || 'Checking...' },
                  { label: 'CV AI Parser (Gemini)', configured: aiHealth?.gemini?.configured, note: aiHealth?.gemini?.configured ? 'Gemini 1.5 Flash ready' : 'Set GEMINI_API_KEY in .env' },
                  { label: 'Drive / Recordings', configured: aiHealth?.drive?.configured, note: aiHealth?.drive?.note || 'Checking...' },
                ].map((item) => (
                  <div key={item.label} className={`glass-surface p-4 rounded-xl ${item.configured ? 'border border-emerald/15' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider">{item.label}</p>
                      {item.configured ? <CheckCircle2 size={13} className="text-emerald" /> : <AlertCircle size={13} className="text-amber-400" />}
                    </div>
                    <p className={`text-sm font-medium ${item.configured ? 'text-emerald' : 'text-amber-400'}`}>
                      {item.configured ? 'Active' : 'Awaiting'}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-1">{item.note}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Cron Job Manual Triggers */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="mt-6 glass-card p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-purple-400" />
                <h2 className="text-sm font-semibold text-gray-200">Cron Job Manual Triggers</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <CronTriggerButton
                  label="Status Transition"
                  description="Move SCHEDULED → INTERVIEW"
                  icon={Calendar}
                  endpoint="/cron/trigger/status-transition"
                  color="purple"
                />
                <CronTriggerButton
                  label="Auto-Match Recordings"
                  description="Match recordings & notes"
                  icon={Video}
                  endpoint="/cron/trigger/auto-match-recordings"
                  color="blue"
                />
                <CronTriggerButton
                  label="Gmail Fetch"
                  description="Fetch new emails"
                  icon={Mail}
                  endpoint="/cron/trigger/gmail-fetch"
                  color="emerald"
                />
                <CronTriggerButton
                  label="Reply Check"
                  description="Check assessment replies"
                  icon={RefreshCw}
                  endpoint="/cron/trigger/reply-check"
                  color="amber"
                />
                <CronTriggerButton
                  label="Mark Emails Read"
                  description="Mark all emails as read"
                  icon={Mail}
                  endpoint="/google/mark-all-read"
                  color="red"
                />
              </div>
            </motion.div>

            {/* Google Integration Control Panel */}
            <GoogleControlPanel />
          </>
        )}
      </div>
    </>
  );
}

function CronTriggerButton({ label, description, icon: Icon, endpoint, color }: {
  label: string;
  description: string;
  icon: any;
  endpoint: string;
  color: string;
}) {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);

  const triggerMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(endpoint);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Trigger completed successfully');
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['board-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Trigger failed');
    },
  });

  const handleTrigger = async () => {
    setIsRunning(true);
    try {
      await triggerMutation.mutateAsync();
    } finally {
      setTimeout(() => setIsRunning(false), 2000);
    }
  };

  const colorClasses = {
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20',
    emerald: 'bg-emerald/10 border-emerald/20 text-emerald hover:bg-emerald/20',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20',
  };

  return (
    <button
      onClick={handleTrigger}
      disabled={isRunning || triggerMutation.isPending}
      className={`glass-surface p-4 rounded-xl border transition-all ${colorClasses[color as keyof typeof colorClasses]} disabled:opacity-50 disabled:cursor-not-allowed text-left`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} />
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="text-[10px] opacity-80 mb-3">{description}</p>
      <div className="flex items-center gap-1 text-[9px] font-medium">
        {isRunning || triggerMutation.isPending ? (
          <>
            <RefreshCw size={10} className="animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Zap size={10} />
            Trigger Now
          </>
        )}
      </div>
    </button>
  );
}
