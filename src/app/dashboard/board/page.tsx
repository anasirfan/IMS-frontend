'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { candidateService } from '@/services/candidate.service';
import Header from '@/components/layout/Header';
import { formatDateTime } from '@/lib/utils';
import type { Candidate, RoundStage, KeyHighlights } from '@/types';
import { ROUND_STAGES, STAGE_LABELS, STAGE_COLORS } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Brain, User, Briefcase, Clock, Sparkles, Download, MoreVertical, Calendar, FileText, Loader2, ChevronDown, ChevronUp, Mail, Video, CheckCircle, Copy, Send } from 'lucide-react';

function parseHighlights(raw: string | null): KeyHighlights | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

interface AISummary {
  overview: string;
  strengths: string[];
  weaknesses: string[];
  top_skills: string[];
  years_of_experience: number;
  education: string;
  last_company: string;
  seniority_level: string;
  suggested_roles: Array<{
    role: string;
    fit_score: number;
    reasoning: string;
  }>;
  overall_assessment: string;
  interview_focus_areas: string[];
  red_flags: string[];
}

function parseSummary(raw: string | null): AISummary | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function AiScoreBadge({ score }: { score: number | null }) {
  if (!score) return null;
  const color = score >= 4 ? 'text-emerald' : score >= 3 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-1 badge-ai text-[10px]">
      <Brain size={10} />
      <span className={color}>{score.toFixed(1)}</span>
    </div>
  );
}

function KanbanCard({ candidate, index, onMove, onDelete, onSchedule, onGenerateSummary, onViewCV, onSendAssessment }: { candidate: Candidate; index: number; onMove: (candidateId: string, newStage: RoundStage) => void; onDelete: (candidateId: string) => void; onSchedule: (candidate: Candidate) => void; onGenerateSummary: (candidateId: string) => void; onViewCV: (candidateId: string) => void; onSendAssessment: (candidate: Candidate) => void; }) {
  const highlights = parseHighlights(candidate.keyHighlights);
  const summary = parseSummary(candidate.aiSummary || null);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  return (
    <Draggable draggableId={candidate.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
          >
            <div
              className={`glass-card-hover p-3 mb-2 group relative ${
                snapshot.isDragging ? 'shadow-glow border-emerald/30 ring-1 ring-emerald/20' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <Link href={`/dashboard/candidates/${candidate.id}`} className="flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-100 truncate group-hover:text-emerald transition-colors">
                      {candidate.name}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                      <Briefcase size={10} /> {candidate.position}
                    </p>
                    {candidate.email && (
                      <p className="text-[10px] text-gray-600 truncate flex items-center gap-1 mt-0.5">
                        <Mail size={9} /> {candidate.email}
                      </p>
                    )}
                  </div>
                </Link>
                <div className="flex items-center gap-1">
                  <AiScoreBadge score={candidate.aiScore} />
                  <div className="relative z-[100]">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                      }}
                      className="p-1 hover:bg-glass-white5 rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical size={14} className="text-gray-400" />
                    </button>
                    {showMenu && (
                      <>
                        <div className="fixed inset-0 z-[90]" onClick={() => setShowMenu(false)} />
                        <div className="absolute right-0 top-6 z-[100] w-40 glass-surface rounded-lg shadow-xl border border-glass-border p-1">
                          <p className="text-[10px] text-gray-500 px-2 py-1 font-semibold">Move to</p>
                          {ROUND_STAGES.filter(s => s !== candidate.roundStage).map((stage) => (
                            <button
                              key={stage}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onMove(candidate.id, stage);
                                setShowMenu(false);
                              }}
                              className="w-full text-left px-2 py-1.5 text-[11px] text-gray-300 hover:bg-glass-white5 rounded transition-colors"
                            >
                              {STAGE_LABELS[stage]}
                            </button>
                          ))}
                          <div className="border-t border-glass-border my-1" />
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowDeleteModal(true);
                              setShowMenu(false);
                            }}
                            className="w-full text-left px-2 py-1.5 text-[11px] text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {highlights && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {highlights.top_skills.slice(0, 3).map((s) => (
                    <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-glass-white5 text-gray-400 border border-glass-border">
                      {s}
                    </span>
                  ))}
                  {highlights.seniority_level && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald/5 text-emerald/70 border border-emerald/10">
                      {highlights.seniority_level}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-gray-500">
                <div className="flex items-center gap-1.5">
                  {candidate.interviewer && (
                    <span className="flex items-center gap-1">
                      <User size={9} /> {typeof candidate.interviewer === 'string' ? candidate.interviewer.split('@')[0] : candidate.interviewer.name.split(' ')[0]}
                    </span>
                  )}
                </div>
                {candidate.interviewDate && (
                  <span className="flex items-center gap-1">
                    <Clock size={9} /> {new Date(candidate.interviewDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>

              {candidate.rating && (
                <div className="mt-1.5 text-[10px] text-yellow-500">
                  {'★'.repeat(candidate.rating)}{'☆'.repeat(5 - candidate.rating)}
                </div>
              )}

              {/* Assessment Status */}
              {(candidate as any).assessment_given && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px]">
                  <Mail size={10} className="text-amber-400" />
                  <span className="text-amber-400">Assessment Sent</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-2 pt-2 border-t border-glass-border flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {((candidate as any).round_stage === 'INBOX' || candidate.status === 'INBOX') && !(candidate as any).assessment_given && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSendAssessment(candidate);
                    }}
                    className="flex-1 text-[10px] px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded transition-colors flex items-center justify-center gap-1"
                    title="Send Assessment"
                  >
                    <Mail size={10} /> Assessment
                  </button>
                )}
                {candidate.status !== 'SCHEDULED' && candidate.status !== 'INTERVIEW' && candidate.status !== 'SHORTLISTED' && candidate.status !== 'HIRED' && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSchedule(candidate);
                    }}
                    className="flex-1 text-[10px] px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded transition-colors flex items-center justify-center gap-1"
                    title="Schedule Interview"
                  >
                    <Calendar size={10} /> Schedule
                  </button>
                )}
                {!candidate.aiSummary && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onGenerateSummary(candidate.id);
                    }}
                    className="flex-1 text-[10px] px-2 py-1 bg-emerald/10 hover:bg-emerald/20 text-emerald rounded transition-colors flex items-center justify-center gap-1"
                    title="Generate AI Summary"
                  >
                    <Sparkles size={10} /> AI
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onViewCV(candidate.id);
                  }}
                  className="flex-1 text-[10px] px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded transition-colors flex items-center justify-center gap-1"
                  title="View CV"
                >
                  <FileText size={10} /> CV
                </button>
              </div>

              {/* AI Summary Section */}
              {summary && (
                <div className="mt-2 pt-2 border-t border-glass-border">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowSummary(!showSummary);
                    }}
                    className="w-full flex items-center justify-between text-[10px] text-emerald hover:text-emerald/80 transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      <Sparkles size={10} /> AI Summary
                    </span>
                    {showSummary ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </button>
                  {showSummary && (
                    <div className="mt-2 space-y-2 text-[10px]">
                      <p className="text-gray-400 leading-relaxed">{summary.overview}</p>
                      {summary.suggested_roles.length > 0 && (
                        <div>
                          <p className="text-emerald font-semibold mb-1">Suggested Roles:</p>
                          {summary.suggested_roles.slice(0, 2).map((role, i) => (
                            <div key={i} className="mb-1 p-1.5 bg-glass-white5 rounded">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-200">{role.role}</span>
                                <span className="text-emerald">{role.fit_score}%</span>
                              </div>
                              <p className="text-gray-500 text-[9px] mt-0.5">{role.reasoning}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Delete Confirmation Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-surface p-6 rounded-xl shadow-2xl border border-glass-border max-w-md w-full mx-4"
              >
                <h3 className="text-lg font-semibold text-gray-100 mb-2">Delete Candidate</h3>
                <p className="text-sm text-gray-400 mb-6">
                  Are you sure you want to delete <span className="text-emerald font-medium">{candidate.name}</span>? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="btn-outline flex-1 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onDelete(candidate.id);
                      setShowDeleteModal(false);
                    }}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

const COLUMN_ICON_COLORS: Record<string, string> = {
  INBOX: 'text-gray-400',
  ASSESSMENT: 'text-blue-400',
  SCHEDULED: 'text-purple-400',
  INTERVIEW: 'text-amber-400',
  SHORTLISTED: 'text-cyan-400',
  HIRED: 'text-emerald',
  REJECTED: 'text-red-400',
};

export default function BoardPage() {
  const queryClient = useQueryClient();
  const [scheduleModal, setScheduleModal] = useState<{ show: boolean; candidate: Candidate | null }>({ show: false, candidate: null });
  const [cvModal, setCvModal] = useState<{ show: boolean; candidateId: string | null }>({ show: false, candidateId: null });
  const [scheduleData, setScheduleData] = useState({ date: '', time: '', round: 'Technical Interview', duration: 30, interviewer: 'anas.i@limiai.uk' });
  const [meetLink, setMeetLink] = useState('');
  const [generatingMeet, setGeneratingMeet] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState({ subject: '', body: '' });
  const [generatingEmailTemplate, setGeneratingEmailTemplate] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [scheduledInterviews, setScheduledInterviews] = useState<any[]>([]);
  const [cvContent, setCvContent] = useState<{ text: string; name: string } | null>(null);
  const [loadingCV, setLoadingCV] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState<string | null>(null);
  const [assessmentModal, setAssessmentModal] = useState<{ show: boolean; candidate: Candidate | null }>({ show: false, candidate: null });
  const [assessmentEmail, setAssessmentEmail] = useState({ subject: '', body: '' });
  const [assessmentFile, setAssessmentFile] = useState<File | null>(null);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [sendingAssessment, setSendingAssessment] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['board-candidates'],
    queryFn: () => candidateService.getAll({ limit: 200 }),
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      candidateService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-candidates'] });
    },
    onError: () => toast.error('Failed to update stage'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => candidateService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-candidates'] });
      toast.success('Candidate deleted');
    },
    onError: () => toast.error('Failed to delete candidate'),
  });

  const allCandidates: Candidate[] = data?.data || [];

  const columns: Record<RoundStage, Candidate[]> = {
    INBOX: [], ASSESSMENT: [], SCHEDULED: [], INTERVIEW: [], SHORTLISTED: [], HIRED: [], REJECTED: [],
  };

  allCandidates.forEach((c) => {
    const stage = (c.roundStage || c.status || 'INBOX') as RoundStage;
    if (columns[stage]) columns[stage].push(c);
    else columns.INBOX.push(c);
  });

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId as RoundStage;

    queryClient.setQueryData(['board-candidates'], (old: any) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: old.data.map((c: Candidate) =>
          c.id === draggableId ? { ...c, roundStage: newStage, status: newStage } : c
        ),
      };
    });

    stageMutation.mutate({ id: draggableId, status: newStage });
    toast.success(`Moved to ${STAGE_LABELS[newStage]}`);
  }, [queryClient, stageMutation]);

  const handleMove = useCallback((candidateId: string, newStage: RoundStage) => {
    queryClient.setQueryData(['board-candidates'], (old: any) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: old.data.map((c: Candidate) =>
          c.id === candidateId ? { ...c, roundStage: newStage, status: newStage } : c
        ),
      };
    });

    stageMutation.mutate({ id: candidateId, status: newStage });
    toast.success(`Moved to ${STAGE_LABELS[newStage]}`);
  }, [queryClient, stageMutation]);

  const handleDelete = useCallback((candidateId: string) => {
    deleteMutation.mutate(candidateId);
  }, [deleteMutation]);

  const handleSchedule = useCallback(async (candidate: Candidate) => {
    setScheduleModal({ show: true, candidate });
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleData({
      date: tomorrow.toISOString().split('T')[0],
      time: '14:00',
      round: 'Technical Interview',
      duration: 30,
      interviewer: 'anas.i@limiai.uk'
    });
    setMeetLink('');
    setEmailTemplate({ subject: '', body: '' });
    
    // Fetch scheduled interviews for conflict detection
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://suzair.duckdns.org/api'}/candidates/scheduled`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const result = await response.json();
      setScheduledInterviews(result.data || []);
    } catch (error) {
      console.error('Failed to fetch scheduled interviews:', error);
    }
  }, []);

  const generateMeetLink = useCallback(async () => {
    if (!scheduleModal.candidate || !scheduleData.date || !scheduleData.time) {
      toast.error('Please select date and time first');
      return;
    }

    // Check for time slot conflicts
    const selectedDateTime = new Date(`${scheduleData.date}T${scheduleData.time}:00`);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://suzair.duckdns.org/api'}/candidates/scheduled`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const result = await response.json();
      const scheduledInterviews = result.data || [];
      
      // Check for conflicts (within 1 hour window)
      const conflict = scheduledInterviews.find((interview: any) => {
        if (interview.id === scheduleModal.candidate?.id) return false; // Skip self
        const interviewTime = new Date(interview.interview_date);
        const timeDiff = Math.abs(selectedDateTime.getTime() - interviewTime.getTime());
        return timeDiff < 3600000; // 1 hour in milliseconds
      });

      if (conflict) {
        toast.error(`Time slot conflict! ${conflict.name} has an interview at ${new Date(conflict.interview_date).toLocaleTimeString()}`, {
          duration: 5000
        });
        return;
      }
    } catch (error) {
      console.error('Failed to check time slot conflicts:', error);
    }

    setGeneratingMeet(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://suzair.duckdns.org/api'}/google/create-meet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          candidateId: scheduleModal.candidate.id,
          candidateName: scheduleModal.candidate.name,
          position: scheduleModal.candidate.position,
          dateTime: `${scheduleData.date}T${scheduleData.time}:00`,
          duration: scheduleData.duration,
          round: scheduleData.round,
          interviewer: scheduleData.interviewer
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const link = result.data.meetLink;
        setMeetLink(link);
        
        // Copy to clipboard
        navigator.clipboard.writeText(link);
        toast.success('Meet link copied to clipboard!');
        
        // Generate AI email template
        await generateEmailTemplate(link);
      } else {
        toast.error(result.message || 'Failed to generate Meet link');
      }
    } catch (error) {
      toast.error('Failed to generate Meet link');
    } finally {
      setGeneratingMeet(false);
    }
  }, [scheduleModal, scheduleData]);

  const generateEmailTemplate = useCallback(async (meetLinkParam: string) => {
    if (!scheduleModal.candidate) return;

    setGeneratingEmailTemplate(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://suzair.duckdns.org/api'}/ai/generate-meeting-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          candidateName: scheduleModal.candidate.name,
          position: scheduleModal.candidate.position,
          round: scheduleData.round,
          dateTime: `${scheduleData.date}T${scheduleData.time}:00`,
          meetLink: meetLinkParam,
          duration: scheduleData.duration
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setEmailTemplate(result.data);
      } else {
        toast.error('Failed to generate email template');
      }
    } catch (error) {
      toast.error('Failed to generate email template');
    } finally {
      setGeneratingEmailTemplate(false);
    }
  }, [scheduleModal, scheduleData]);

  const sendMeetingInvite = useCallback(async () => {
    if (!scheduleModal.candidate || !meetLink || !emailTemplate.subject) {
      toast.error('Please generate Meet link first');
      return;
    }

    setSendingInvite(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://suzair.duckdns.org/api'}/candidates/${scheduleModal.candidate.id}/send-meeting-invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: emailTemplate.subject,
          body: emailTemplate.body,
          meetLink,
          dateTime: `${scheduleData.date}T${scheduleData.time}:00`
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Meeting invitation sent!');
        queryClient.invalidateQueries({ queryKey: ['board-candidates'] });
        setScheduleModal({ show: false, candidate: null });
        setMeetLink('');
        setEmailTemplate({ subject: '', body: '' });
      } else {
        toast.error(result.message || 'Failed to send invitation');
      }
    } catch (error) {
      toast.error('Failed to send invitation');
    } finally {
      setSendingInvite(false);
    }
  }, [scheduleModal, meetLink, emailTemplate, scheduleData, queryClient]);

  const handleGenerateSummary = useCallback(async (candidateId: string) => {
    setGeneratingSummary(candidateId);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://suzair.duckdns.org/api'}/ai/${candidateId}/generate-summary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['board-candidates'] });
        toast.success('AI Summary generated!');
      } else {
        toast.error(result.message || 'Failed to generate summary');
      }
    } catch (error) {
      toast.error('Failed to generate summary');
    } finally {
      setGeneratingSummary(null);
    }
  }, [queryClient]);

  const handleViewCV = useCallback(async (candidateId: string) => {
    setCvModal({ show: true, candidateId });
    setLoadingCV(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://suzair.duckdns.org/api'}/ai/${candidateId}/view-cv`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setCvContent({ text: result.data.cvText, name: result.data.candidateName });
      } else {
        toast.error('Failed to load CV');
        setCvModal({ show: false, candidateId: null });
      }
    } catch (error) {
      toast.error('Failed to load CV');
      setCvModal({ show: false, candidateId: null });
    } finally {
      setLoadingCV(false);
    }
  }, []);

  const handleSendAssessment = useCallback(async (candidate: Candidate) => {
    setAssessmentModal({ show: true, candidate });
    setGeneratingEmail(true);
    try {
      const response = await candidateService.generateAssessmentEmail(candidate.id);
      setAssessmentEmail({ subject: response.data.subject, body: response.data.body });
      toast.success('Email generated - review and edit before sending');
    } catch (error) {
      toast.error('Failed to generate email');
      setAssessmentModal({ show: false, candidate: null });
    } finally {
      setGeneratingEmail(false);
    }
  }, []);

  const submitAssessment = useCallback(async () => {
    if (!assessmentModal.candidate) return;
    setSendingAssessment(true);
    try {
      const formData = new FormData();
      formData.append('subject', assessmentEmail.subject);
      formData.append('body', assessmentEmail.body);
      if (assessmentFile) formData.append('attachment', assessmentFile);
      
      await candidateService.sendAssessment(assessmentModal.candidate.id, formData);
      queryClient.invalidateQueries({ queryKey: ['board-candidates'] });
      setAssessmentModal({ show: false, candidate: null });
      setAssessmentEmail({ subject: '', body: '' });
      setAssessmentFile(null);
      toast.success('Assessment email sent successfully!');
    } catch (error) {
      toast.error('Failed to send assessment');
    } finally {
      setSendingAssessment(false);
    }
  }, [assessmentModal, assessmentEmail, assessmentFile, queryClient]);

  const submitSchedule = useCallback(async () => {
    if (!scheduleModal.candidate) return;
    
    try {
      const dateTime = `${scheduleData.date}T${scheduleData.time}:00`;
      
      // Generate email
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://suzair.duckdns.org/api'}/ai/generate-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          candidateName: scheduleModal.candidate.name,
          position: scheduleModal.candidate.position,
          round: scheduleData.round,
          dateTime: new Date(dateTime).toLocaleString()
        })
      });
      const emailResult = await emailResponse.json();
      
      // Schedule interview
      const scheduleResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://suzair.duckdns.org/api'}/google/schedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          candidateId: scheduleModal.candidate.id,
          interviewDate: dateTime,
          duration: 60,
          notes: emailResult.data?.emailBody || ''
        })
      });
      const scheduleResult = await scheduleResponse.json();
      
      if (scheduleResult.success) {
        toast.success('Interview scheduled successfully!');
        queryClient.invalidateQueries({ queryKey: ['board-candidates'] });
        setScheduleModal({ show: false, candidate: null });
      } else {
        toast.error(scheduleResult.message || 'Failed to schedule');
      }
    } catch (error) {
      toast.error('Failed to schedule interview');
    }
  }, [scheduleModal, scheduleData, queryClient]);

  return (
    <>
      <Header title="Pipeline Board" subtitle="Drag candidates between stages">
        <button
          onClick={() => { candidateService.exportCsv({}); toast.success('Exporting...'); }}
          className="btn-ghost flex items-center gap-1.5 text-xs"
        >
          <Download size={14} /> Export
        </button>
      </Header>

      <div className="p-4 overflow-x-auto">
        {isLoading ? (
          <div className="flex gap-4">
            {ROUND_STAGES.map((s) => (
              <div key={s} className="w-72 flex-shrink-0">
                <div className="skeleton h-8 w-full mb-3 rounded-lg" />
                {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 w-full mb-2 rounded-xl" />)}
              </div>
            ))}
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-3 min-h-[calc(100vh-120px)]">
              {ROUND_STAGES.map((stage) => (
                <div key={stage} className="w-72 flex-shrink-0 flex flex-col">
                  <div className="glass-surface px-3 py-2 mb-2 flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        stage === 'HIRED' ? 'bg-emerald' :
                        stage === 'REJECTED' ? 'bg-red-400' :
                        stage === 'INTERVIEW' ? 'bg-amber-400' :
                        stage === 'SCHEDULED' ? 'bg-purple-400' :
                        stage === 'SHORTLISTED' ? 'bg-cyan-400' :
                        stage === 'ASSESSMENT' ? 'bg-blue-400' : 'bg-gray-400'
                      }`} />
                      <span className="text-xs font-semibold text-gray-300 tracking-wide">
                        {STAGE_LABELS[stage]}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-gray-500 bg-glass-white5 px-1.5 py-0.5 rounded">
                      {columns[stage].length}
                    </span>
                  </div>

                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 rounded-xl p-1.5 transition-all duration-200 min-h-[200px] ${
                          snapshot.isDraggingOver
                            ? 'bg-emerald/5 border border-dashed border-emerald/20'
                            : 'border border-transparent'
                        }`}
                      >
                        {columns[stage].map((candidate, index) => (
                          <KanbanCard 
                            key={candidate.id} 
                            candidate={candidate} 
                            index={index} 
                            onMove={handleMove} 
                            onDelete={handleDelete}
                            onSchedule={handleSchedule}
                            onGenerateSummary={handleGenerateSummary}
                            onViewCV={handleViewCV}
                            onSendAssessment={handleSendAssessment}
                          />
                        ))}
                        {provided.placeholder}
                        {columns[stage].length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex items-center justify-center h-24 text-xs text-gray-600">
                            No candidates
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Enhanced Schedule Interview Modal */}
      {scheduleModal.show && scheduleModal.candidate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-surface p-6 rounded-xl shadow-2xl border border-glass-border max-w-2xl w-full my-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="text-purple-400" size={20} />
              <h3 className="text-lg font-semibold text-gray-100">Schedule Interview</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Scheduling interview for <span className="text-emerald font-medium">{scheduleModal.candidate.name}</span>
            </p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Interview Round</label>
                  <select
                    value={scheduleData.round}
                    onChange={(e) => setScheduleData({ ...scheduleData, round: e.target.value })}
                    className="w-full bg-glass-white5 border border-glass-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald/50"
                  >
                    <option value="Technical Interview">Technical Interview</option>
                    <option value="HR Interview">HR Interview</option>
                    <option value="Final Interview">Final Interview</option>
                    <option value="Screening Call">Screening Call</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Duration</label>
                  <select
                    value={scheduleData.duration}
                    onChange={(e) => setScheduleData({ ...scheduleData, duration: parseInt(e.target.value) })}
                    className="w-full bg-glass-white5 border border-glass-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald/50"
                  >
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Interviewer</label>
                <select
                  value={scheduleData.interviewer}
                  onChange={(e) => setScheduleData({ ...scheduleData, interviewer: e.target.value })}
                  className="w-full bg-glass-white5 border border-glass-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald/50"
                >
                  <option value="anas.i@limiai.uk">Anas Irfan (anas.i@limiai.uk)</option>
                  <option value="arqam.malik@limiai.uk">Arqam Malik (arqam.malik@limiai.uk)</option>
                  <option value="shahryar.alam@limiai.uk">Shahryar Alam (shahryar.alam@limiai.uk)</option>
                  <option value="suzair.khan@limiai.uk">Suzair Khan (suzair.khan@limiai.uk)</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={scheduleData.date}
                    onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                    className="w-full bg-glass-white5 border border-glass-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald/50"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Time</label>
                  <input
                    type="time"
                    value={scheduleData.time}
                    onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                    className="w-full bg-glass-white5 border border-glass-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald/50"
                  />
                </div>
              </div>

              {/* Occupied Time Slots Warning */}
              {scheduleData.date && scheduledInterviews.length > 0 && (() => {
                const selectedDate = scheduleData.date;
                const sameDay = scheduledInterviews.filter(i => 
                  i.interview_date && i.interview_date.startsWith(selectedDate)
                );
                
                if (sameDay.length > 0) {
                  return (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock size={14} className="text-amber-400" />
                        <span className="text-xs font-semibold text-amber-400">Occupied Time Slots on {selectedDate}</span>
                      </div>
                      <div className="space-y-1">
                        {sameDay.map((interview: any) => {
                          const time = new Date(interview.interview_date).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          });
                          return (
                            <div key={interview.id} className="text-xs text-gray-300 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              <span>{time} - {interview.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Generate Meet Link Button */}
              <button
                onClick={generateMeetLink}
                disabled={!scheduleData.date || !scheduleData.time || generatingMeet}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <Video size={16} />
                {generatingMeet ? 'Generating...' : 'Generate Google Meet Link'}
              </button>

              {/* Meet Link Display */}
              {meetLink && (
                <div className="p-3 bg-emerald/10 border border-emerald/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Meet Link Generated</span>
                    <CheckCircle size={14} className="text-emerald" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={meetLink}
                      readOnly
                      className="flex-1 bg-glass-white5 border border-glass-border rounded px-2 py-1 text-xs text-gray-300"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(meetLink);
                        toast.success('Copied!');
                      }}
                      className="p-1.5 hover:bg-glass-white10 rounded transition-colors"
                    >
                      <Copy size={14} className="text-emerald" />
                    </button>
                  </div>
                </div>
              )}

              {/* AI Email Template */}
              {emailTemplate.subject && (
                <div className="space-y-3 pt-3 border-t border-glass-border">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-400" />
                    <span className="text-xs text-gray-400">AI-Generated Email Template</span>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Subject</label>
                    <input
                      type="text"
                      value={emailTemplate.subject}
                      onChange={(e) => setEmailTemplate({ ...emailTemplate, subject: e.target.value })}
                      className="w-full bg-glass-white5 border border-glass-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald/50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Email Body</label>
                    <textarea
                      value={emailTemplate.body}
                      onChange={(e) => setEmailTemplate({ ...emailTemplate, body: e.target.value })}
                      rows={10}
                      className="w-full bg-glass-white5 border border-glass-border rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-emerald/50"
                    />
                  </div>
                  
                  {/* Send Meeting Button */}
                  <button
                    onClick={sendMeetingInvite}
                    disabled={sendingInvite}
                    className="w-full bg-emerald hover:bg-emerald/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    {sendingInvite ? 'Sending...' : 'Send Meeting Invitation'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setScheduleModal({ show: false, candidate: null });
                  setMeetLink('');
                  setEmailTemplate({ subject: '', body: '' });
                }}
                className="btn-outline flex-1 text-sm"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* CV Viewer Modal */}
      {cvModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-surface p-6 rounded-xl shadow-2xl border border-glass-border max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="text-blue-400" size={20} />
                <h3 className="text-lg font-semibold text-gray-100">
                  {cvContent?.name || 'CV Viewer'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setCvModal({ show: false, candidateId: null });
                  setCvContent(null);
                }}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loadingCV ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="animate-spin text-emerald" size={32} />
                </div>
              ) : cvContent ? (
                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono bg-glass-white5 p-4 rounded-lg">
                  {cvContent.text}
                </pre>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">No CV content available</p>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Assessment Email Modal */}
      {assessmentModal.show && assessmentModal.candidate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-surface p-6 rounded-xl shadow-2xl border border-glass-border max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center gap-2 mb-4">
              <Mail className="text-amber-400" size={20} />
              <h3 className="text-lg font-semibold text-gray-100">Send Assessment Email</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Review and edit the AI-generated email for <span className="text-emerald font-medium">{assessmentModal.candidate.name}</span>
            </p>
            
            {generatingEmail ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-emerald" size={32} />
                <span className="ml-3 text-sm text-gray-400">Generating email...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Subject</label>
                  <input
                    type="text"
                    value={assessmentEmail.subject}
                    onChange={(e) => setAssessmentEmail({ ...assessmentEmail, subject: e.target.value })}
                    className="w-full bg-glass-white5 border border-glass-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald/50"
                    placeholder="Email subject..."
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Email Body</label>
                  <textarea
                    value={assessmentEmail.body}
                    onChange={(e) => setAssessmentEmail({ ...assessmentEmail, body: e.target.value })}
                    rows={12}
                    className="w-full bg-glass-white5 border border-glass-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald/50 font-mono"
                    placeholder="Email body..."
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Attach Assessment File (PDF/ZIP)</label>
                  <input
                    type="file"
                    accept=".pdf,.zip"
                    onChange={(e) => setAssessmentFile(e.target.files?.[0] || null)}
                    className="w-full bg-glass-white5 border border-glass-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald/50"
                  />
                  {assessmentFile && (
                    <p className="text-xs text-emerald mt-1">✓ {assessmentFile.name}</p>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setAssessmentModal({ show: false, candidate: null });
                      setAssessmentEmail({ subject: '', body: '' });
                      setAssessmentFile(null);
                    }}
                    className="btn-outline flex-1 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitAssessment}
                    disabled={sendingAssessment || !assessmentEmail.subject || !assessmentEmail.body}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Mail size={14} />
                    {sendingAssessment ? 'Sending...' : 'Send Email'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Loading Overlay for AI Summary */}
      {generatingSummary && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-surface p-6 rounded-xl shadow-2xl border border-glass-border flex items-center gap-3">
            <Loader2 className="animate-spin text-emerald" size={24} />
            <span className="text-sm text-gray-200">Generating AI Summary...</span>
          </div>
        </div>
      )}
    </>
  );
}
