'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateService } from '@/services/candidate.service';
import Header from '@/components/layout/Header';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { formatDateTime, getStatusBadgeClass, getRatingStars } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Candidate } from '@/types';
import api from '@/lib/axios';
import {
  ArrowLeft, Star, Archive, Trash2, FileText, Video,
  Link2, Clock, User, Mail, Phone, Briefcase, Brain, Sparkles, Zap,
  Calendar, Loader2, ChevronDown, ChevronUp, Eye, Pencil,
} from 'lucide-react';
import InterviewQuestionsModal from '@/components/modals/InterviewQuestionsModal';
import AssessmentPreviewModal from '@/components/modals/AssessmentPreviewModal';

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { admin } = useAuthStore();
  const canEdit = admin?.role === 'SUPER_ADMIN' || admin?.role === 'HR_ADMIN';
  const canDelete = admin?.role === 'SUPER_ADMIN';
  const id = params.id as string;

  const [editMode, setEditMode] = useState(false);
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessmentEmail, setAssessmentEmail] = useState({ subject: '', body: '' });
  const [assessmentFile, setAssessmentFile] = useState<File | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyMessage, setReplyMessage] = useState({ subject: '', body: '' });
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState({ date: '', time: '', round: 'Technical Interview', duration: 30, interviewer: 'anas.i@limiai.uk' });
  const [meetLink, setMeetLink] = useState('');
  const [generatingMeet, setGeneratingMeet] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState({ subject: '', body: '' });
  const [generatingEmailTemplate, setGeneratingEmailTemplate] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [cvModal, setCvModal] = useState(false);
  const [cvContent, setCvContent] = useState<{ text: string; name: string } | null>(null);
  const [loadingCV, setLoadingCV] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [showAISummary, setShowAISummary] = useState(false);
  const [showInterviewQuestionsModal, setShowInterviewQuestionsModal] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState<any>(null);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' });
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleEmailTemplate, setRescheduleEmailTemplate] = useState({ subject: '', body: '' });
  const [generatingRescheduleEmail, setGeneratingRescheduleEmail] = useState(false);
  const [showAssessmentPreview, setShowAssessmentPreview] = useState(false);
  const [editInfoMode, setEditInfoMode] = useState(false);
  const [editInfoData, setEditInfoData] = useState({ name: '', email: '', phone: '', position: '', remarks: '' });
  const [savingInfo, setSavingInfo] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['candidate', id],
    queryFn: () => candidateService.getById(id),
    enabled: !!id,
  });

  const candidate = data?.data as (Candidate & { activityLogs?: any[] }) | undefined;

  const updateMutation = useMutation({
    mutationFn: (formData: FormData) => candidateService.update(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
      toast.success('Candidate updated');
      setEditMode(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => candidateService.delete(id),
    onSuccess: () => { toast.success('Candidate deleted'); router.push('/dashboard/candidates'); },
  });

  const archiveMutation = useMutation({
    mutationFn: () => candidateService.toggleArchive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
      toast.success('Archive status toggled');
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: () => candidateService.aiAnalyze(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
      toast.success('AI analysis complete');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'AI analysis failed'),
  });

  const scoreMutation = useMutation({
    mutationFn: () => candidateService.aiScore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
      toast.success('AI scoring complete');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'AI scoring failed'),
  });

  const generateAssessmentMutation = useMutation({
    mutationFn: () => candidateService.generateAssessmentEmail(id),
    onSuccess: (res: any) => {
      setAssessmentEmail({ subject: res.data.subject, body: res.data.body });
      setShowAssessmentModal(true);
      toast.success('Email generated - review and edit before sending');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to generate email'),
  });

  const sendAssessmentMutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append('subject', assessmentEmail.subject);
      formData.append('body', assessmentEmail.body);
      if (assessmentFile) formData.append('attachment', assessmentFile);
      return candidateService.sendAssessment(id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
      setShowAssessmentModal(false);
      setAssessmentEmail({ subject: '', body: '' });
      setAssessmentFile(null);
      toast.success('Assessment email sent successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to send email'),
  });

  const sendReplyMutation = useMutation({
    mutationFn: () => candidateService.sendReply(id, replyMessage.subject, replyMessage.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
      setShowReplyModal(false);
      setReplyMessage({ subject: '', body: '' });
      setSelectedMessageId(null);
      toast.success('Reply sent successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to send reply'),
  });

  const handleSaveNotes = () => {
    const fd = new FormData();
    if (notes) fd.append('meetingNotes', notes);
    if (rating) fd.append('rating', String(rating));
    updateMutation.mutate(fd);
  };

  const aiSummary: any = candidate?.aiSummary ? (() => { try { return JSON.parse(candidate.aiSummary as string); } catch { return null; } })() : null;
  const keyHighlights: any = candidate?.keyHighlights ? (() => { try { return JSON.parse(candidate.keyHighlights as string); } catch { return null; } })() : null;

  const handleSchedule = () => {
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
    setScheduleModal(true);
  };

  const generateMeetLink = async () => {
    if (!candidate || !scheduleData.date || !scheduleData.time) {
      toast.error('Please select date and time first');
      return;
    }
    setGeneratingMeet(true);
    try {
      const { data: result } = await api.post('/google/create-meet', {
        candidateId: candidate.id,
        candidateName: candidate.name,
        position: candidate.position,
        dateTime: `${scheduleData.date}T${scheduleData.time}:00`,
        duration: scheduleData.duration,
        round: scheduleData.round,
        interviewer: scheduleData.interviewer
      });
      if (result.success) {
        const link = result.data.meetLink;
        setMeetLink(link);
        navigator.clipboard.writeText(link);
        toast.success('Meet link copied to clipboard!');
        await generateEmailTemplate(link);
      } else {
        toast.error(result.message || 'Failed to generate Meet link');
      }
    } catch {
      toast.error('Failed to generate Meet link');
    } finally {
      setGeneratingMeet(false);
    }
  };

  const generateEmailTemplate = async (meetLinkParam: string) => {
    if (!candidate) return;
    setGeneratingEmailTemplate(true);
    try {
      const { data: result } = await api.post('/ai/generate-meeting-email', {
        candidateName: candidate.name,
        position: candidate.position,
        round: scheduleData.round,
        dateTime: `${scheduleData.date}T${scheduleData.time}:00`,
        meetLink: meetLinkParam,
        duration: scheduleData.duration
      });
      if (result.success) {
        setEmailTemplate(result.data);
      } else {
        toast.error('Failed to generate email template');
      }
    } catch {
      toast.error('Failed to generate email template');
    } finally {
      setGeneratingEmailTemplate(false);
    }
  };

  const sendMeetingInvite = async () => {
    if (!candidate || !meetLink || !emailTemplate.subject) {
      toast.error('Please generate Meet link first');
      return;
    }
    setSendingInvite(true);
    try {
      const { data: result } = await api.post(`/candidates/${candidate.id}/send-meeting-invite`, {
        subject: emailTemplate.subject,
        body: emailTemplate.body,
        meetLink,
        dateTime: `${scheduleData.date}T${scheduleData.time}:00`
      });
      if (result.success) {
        toast.success('Meeting invitation sent!');
        queryClient.invalidateQueries({ queryKey: ['candidate', id] });
        setScheduleModal(false);
        setMeetLink('');
        setEmailTemplate({ subject: '', body: '' });
      } else {
        toast.error(result.message || 'Failed to send invitation');
      }
    } catch {
      toast.error('Failed to send invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const generateRescheduleEmail = async () => {
    if (!candidate || !rescheduleData.date || !rescheduleData.time) {
      toast.error('Please select date and time first');
      return;
    }
    setGeneratingRescheduleEmail(true);
    try {
      const { data: result } = await api.post('/ai/generate-email', {
        candidateName: candidate.name,
        position: candidate.position,
        round: 'Rescheduled Interview',
        dateTime: `${rescheduleData.date}T${rescheduleData.time}:00`
      });
      if (result.success) {
        const oldDate = candidate.interviewDate ? new Date(candidate.interviewDate).toLocaleString() : 'N/A';
        const newDate = new Date(`${rescheduleData.date}T${rescheduleData.time}:00`).toLocaleString();
        setRescheduleEmailTemplate({
          subject: `Interview Rescheduled - ${candidate.position}`,
          body: `Dear ${candidate.name},\n\nWe apologize for the inconvenience, but we need to reschedule your interview.\n\nPrevious Date & Time: ${oldDate}\nNew Date & Time: ${newDate}\n\nMeeting Link: ${candidate.meetLink}\n\n${result.data.emailBody}\n\nPlease confirm your availability for the new time.\n\nBest regards,\nLimi Recruitment Team`
        });
        toast.success('Email template generated!');
      } else {
        toast.error('Failed to generate email template');
      }
    } catch {
      toast.error('Failed to generate email template');
    } finally {
      setGeneratingRescheduleEmail(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleEmailTemplate.subject || !rescheduleEmailTemplate.body) {
      toast.error('Please generate email template first');
      return;
    }
    setRescheduling(true);
    try {
      const { data: result } = await api.post(`/candidates/${id}/reschedule`, {
        subject: rescheduleEmailTemplate.subject,
        body: rescheduleEmailTemplate.body,
        dateTime: `${rescheduleData.date}T${rescheduleData.time}:00`
      });
      if (result.success) {
        toast.success('Interview rescheduled successfully!');
        queryClient.invalidateQueries({ queryKey: ['candidate', id] });
        setShowRescheduleModal(false);
        setRescheduleData({ date: '', time: '' });
        setRescheduleEmailTemplate({ subject: '', body: '' });
      } else {
        toast.error(result.message || 'Failed to reschedule');
      }
    } catch {
      toast.error('Failed to reschedule interview');
    } finally {
      setRescheduling(false);
    }
  };

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const { data: result } = await api.post(`/ai/${id}/generate-summary`);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['candidate', id] });
        toast.success('AI Summary generated!');
      } else {
        toast.error(result.message || 'Failed to generate summary');
      }
    } catch {
      toast.error('Failed to generate summary');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleViewCV = async () => {
    setCvModal(true);
    setLoadingCV(true);
    try {
      const { data: result } = await api.get(`/ai/${id}/view-cv`);
      if (result.success) {
        setCvContent({ text: result.data.cvText, name: result.data.candidateName });
      } else {
        toast.error('Failed to load CV');
        setCvModal(false);
      }
    } catch {
      toast.error('Failed to load CV');
      setCvModal(false);
    } finally {
      setLoadingCV(false);
    }
  };

  const handleInterviewQuestions = async () => {
    if (candidate?.interviewQuestions) {
      try {
        const existingQuestions = JSON.parse(candidate.interviewQuestions);
        setInterviewQuestions(existingQuestions);
        setShowInterviewQuestionsModal(true);
      } catch {
        toast.error('Failed to load existing questions');
      }
      return;
    }
    setGeneratingQuestions(true);
    try {
      const response = await candidateService.generateInterviewQuestions(id);
      if (response.success) {
        setInterviewQuestions(response.data);
        setShowInterviewQuestionsModal(true);
        toast.success('Interview questions generated!');
        queryClient.invalidateQueries({ queryKey: ['candidate', id] });
      } else {
        toast.error(response.message || 'Failed to generate questions');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate interview questions');
    } finally {
      setGeneratingQuestions(false);
    }
  };

  if (isLoading) return <div className="p-4 md:p-8"><CardSkeleton /></div>;
  if (!candidate) return <div className="p-4 md:p-8 text-gray-500">Candidate not found</div>;

  const isInbox = candidate.roundStage === 'INBOX' || candidate.status === 'INBOX';

  return (
    <>
      <Header title={candidate.name} subtitle={candidate.position}>
        <span className={getStatusBadgeClass(candidate.status)}>{candidate.status}</span>
        <button onClick={() => router.back()} className="btn-ghost flex items-center gap-1.5 text-xs">
          <ArrowLeft size={14} /> Back
        </button>
      </Header>

      <div className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Basic Info */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} className="glass-card p-4 md:p-5">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-4">Candidate Info</h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-sm">
                <User size={14} className="text-gray-500 flex-shrink-0" />
                <span className="font-medium text-gray-200 truncate">{candidate.name}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <Mail size={14} className="text-gray-500 flex-shrink-0" />
                <span className="text-gray-400 truncate">{candidate.email}</span>
              </div>
              {candidate.phone && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Phone size={14} className="text-gray-500 flex-shrink-0" />
                  <span className="text-gray-400">{candidate.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-sm">
                <Briefcase size={14} className="text-gray-500 flex-shrink-0" />
                <span className="text-gray-400 truncate">{candidate.position}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <Clock size={14} className="text-gray-500 flex-shrink-0" />
                <span className="text-gray-400">{candidate.interviewDate ? formatDateTime(candidate.interviewDate) : 'Not scheduled'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <Mail size={14} className={candidate.assessmentGiven ? "text-amber-400 flex-shrink-0" : "text-gray-500 flex-shrink-0"} />
                <span className={candidate.assessmentGiven ? "text-amber-400" : "text-gray-400"}>
                  {candidate.assessmentGiven ? 'Assessment Sent' : 'No Assessment'}
                </span>
              </div>
              {candidate.assessmentGiven && candidate.assessmentLink && (
                <div className="pt-2">
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'https://suzair.duckdns.org'}/uploads/assessments/${candidate.assessmentLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline w-full flex items-center justify-center gap-2 text-xs py-1.5"
                  >
                    <Mail size={12} /> View Assessment
                  </a>
                </div>
              )}
              {candidate.interviewer && (
                <div className="flex items-center gap-2.5 text-sm pt-1 border-t border-glass-border">
                  <User size={14} className="text-emerald/60 flex-shrink-0" />
                  <span className="text-eton text-xs">Interviewer: {String(candidate?.interviewer) || 'Anas'}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* AI Intelligence */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={14} className="text-emerald" />
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">AI Intelligence</h3>
            </div>
            {candidate.aiScore ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">AI Score</span>
                  <span className="text-lg font-bold text-emerald">{candidate.aiScore.toFixed(1)}<span className="text-xs text-gray-500">/5</span></span>
                </div>
                {candidate.aiFeedback && (() => {
                  try {
                    const feedback = typeof candidate.aiFeedback === 'string'
                      ? JSON.parse(candidate.aiFeedback)
                      : candidate.aiFeedback;
                    return (
                      <div className="space-y-3">
                        {feedback.final_recommendation && (
                          <div className="p-2 bg-emerald/10 border border-emerald/20 rounded">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Recommendation</span>
                            <p className="text-xs font-semibold text-emerald mt-0.5">{feedback.final_recommendation}</p>
                          </div>
                        )}
                        {feedback.reasoning && (
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Analysis</span>
                            <p className="text-xs text-gray-400 leading-relaxed mt-1">{feedback.reasoning}</p>
                          </div>
                        )}
                        {feedback.strengths?.length > 0 && (
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Strengths</span>
                            <ul className="text-xs text-gray-400 space-y-1 mt-1">
                              {feedback.strengths.map((s: string, i: number) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-emerald mt-0.5">✓</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {feedback.concerns?.length > 0 && (
                          <div>
                            <span className="text-[10px] text-amber-400 uppercase tracking-wider">Concerns</span>
                            <ul className="text-xs text-gray-400 space-y-1 mt-1">
                              {feedback.concerns.map((c: string, i: number) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-amber-400 mt-0.5">⚠</span>
                                  <span>{c}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  } catch {
                    return <p className="text-xs text-gray-400 leading-relaxed">{candidate.aiFeedback}</p>;
                  }
                })()}
                <div className="text-yellow-400 text-sm">
                  {getRatingStars(candidate.rating)} <span className="text-gray-500 text-xs ml-1">Manual</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Sparkles size={20} className="text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500">AI scoring not yet available</p>
                <p className="text-[10px] text-gray-600 mt-1">Complete the interview to enable</p>
              </div>
            )}
            {(keyHighlights?.top_skills || aiSummary?.top_skills) && (
              <div className="mt-3 pt-3 border-t border-glass-border">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Key Skills</p>
                <div className="flex flex-wrap gap-1">
                  {(keyHighlights?.top_skills || aiSummary?.top_skills || []).map((s: string) => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-glass-white5 text-gray-400 border border-glass-border">{s}</span>
                  ))}
                </div>
                <div className="flex gap-3 mt-2 text-[10px] text-gray-500">
                  <span>{(keyHighlights?.years_of_experience ?? aiSummary?.years_of_experience) || 0}y exp</span>
                  <span>{keyHighlights?.seniority_level || aiSummary?.seniority_level || 'N/A'}</span>
                  <span>{keyHighlights?.last_company || aiSummary?.last_company || 'N/A'}</span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Actions - reorganized into logical groups */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4 md:p-5 md:col-span-2 lg:col-span-1">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-4">Actions</h3>
            <div className="space-y-2">
              {/* Workflow actions */}
              {isInbox && !candidate.assessmentGiven && (
                <button onClick={() => generateAssessmentMutation.mutate()} disabled={generateAssessmentMutation.isPending}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-xs bg-amber-500 hover:bg-amber-600">
                  <Mail size={14} /> {generateAssessmentMutation.isPending ? 'Generating...' : 'Send Assessment'}
                </button>
              )}
              {candidate.cvPath && (
                <button onClick={handleInterviewQuestions} disabled={generatingQuestions}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-xs bg-blue-500 hover:bg-blue-600">
                  <Sparkles size={14} /> {generatingQuestions ? 'Generating...' : candidate.interviewQuestions ? 'View Interview Questions' : 'Generate Interview Questions'}
                </button>
              )}
              {candidate.status === 'SCHEDULED' && (
                <button onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setRescheduleData({ date: tomorrow.toISOString().split('T')[0], time: '14:00' });
                  setRescheduleEmailTemplate({ subject: '', body: '' });
                  setShowRescheduleModal(true);
                }}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-xs bg-orange-500 hover:bg-orange-600">
                  <Calendar size={14} /> Reschedule Interview
                </button>
              )}
              {candidate.status !== 'SCHEDULED' && candidate.status !== 'INTERVIEW' && candidate.status !== 'SHORTLISTED' && candidate.status !== 'HIRED' && (
                <button onClick={handleSchedule}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-xs bg-purple-500 hover:bg-purple-600">
                  <Calendar size={14} /> Schedule Interview
                </button>
              )}

              {/* AI tools */}
              <div className="pt-2 border-t border-glass-border">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">AI Tools</p>
                {aiSummary ? (
                  <button onClick={() => setShowAISummary(!showAISummary)}
                    className="btn-primary w-full flex items-center justify-center gap-2 text-xs bg-emerald hover:bg-emerald/80">
                    <Sparkles size={14} /> {showAISummary ? 'Hide' : 'View'} AI Summary
                  </button>
                ) : (
                  <button onClick={handleGenerateSummary} disabled={generatingSummary}
                    className="btn-primary w-full flex items-center justify-center gap-2 text-xs">
                    <Sparkles size={14} /> {generatingSummary ? 'Generating...' : 'Generate AI Summary'}
                  </button>
                )}
                {canEdit && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => analyzeMutation.mutate()} disabled={analyzeMutation.isPending}
                      className="btn-outline flex-1 flex items-center justify-center gap-1.5 text-xs py-2">
                      <Brain size={13} /> {analyzeMutation.isPending ? '...' : 'Analyze'}
                    </button>
                    <button onClick={() => scoreMutation.mutate()} disabled={scoreMutation.isPending || !candidate.meetingNotes}
                      className="btn-outline flex-1 flex items-center justify-center gap-1.5 text-xs py-2">
                      <Sparkles size={13} /> {scoreMutation.isPending ? '...' : 'Score'}
                    </button>
                  </div>
                )}
              </div>

              {/* Document actions */}
              {candidate.cvPath && (
                <div className="pt-2 border-t border-glass-border">
                  <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'https://suzair.duckdns.org'}/uploads/${candidate.cvPath}`} target="_blank" rel="noreferrer"
                     className="btn-outline w-full flex items-center justify-center gap-2 text-xs">
                    <FileText size={14} /> Open CV (PDF)
                  </a>
                </div>
              )}

              {/* Admin actions */}
              {canEdit && (
                <div className="pt-2 border-t border-glass-border">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Manage</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => {
                      setEditInfoData({
                        name: candidate.name || '',
                        email: candidate.email || '',
                        phone: candidate.phone || '',
                        position: candidate.position || '',
                        remarks: candidate.remarks || '',
                      });
                      setEditInfoMode(true);
                    }}
                      className="btn-outline flex items-center justify-center gap-1.5 text-xs py-2">
                      <Pencil size={13} /> Edit Info
                    </button>
                    <button onClick={() => { setNotes(candidate.meetingNotes || ''); setRating(candidate.rating); setEditMode(true); }}
                      className="btn-outline flex items-center justify-center gap-1.5 text-xs py-2">
                      <Star size={13} /> Notes
                    </button>
                    <button onClick={() => archiveMutation.mutate()}
                      className="btn-outline flex items-center justify-center gap-1.5 text-xs py-2">
                      <Archive size={13} /> {candidate.isArchived ? 'Restore' : 'Archive'}
                    </button>
                    {isInbox && (
                      <button onClick={() => setShowAssessmentPreview(true)}
                        className="btn-outline flex items-center justify-center gap-1.5 text-xs py-2">
                        <Eye size={13} /> Preview
                      </button>
                    )}
                  </div>
                </div>
              )}
              {canDelete && (
                <button onClick={() => { if (confirm('Delete this candidate?')) deleteMutation.mutate(); }}
                  className="btn-danger w-full flex items-center justify-center gap-2 text-xs mt-2">
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>
          </motion.div>
        </div>

        {/* AI Summary */}
        {aiSummary && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 md:p-5">
            <button
              onClick={() => setShowAISummary(!showAISummary)}
              className="w-full flex items-center justify-between mb-3"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-emerald" />
                <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">AI Comprehensive Summary</h3>
              </div>
              {showAISummary ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {showAISummary && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-300 leading-relaxed">{aiSummary.overview}</p>
                </div>
                {aiSummary.suggested_roles?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-emerald mb-2">Suggested Roles:</h4>
                    <div className="space-y-2">
                      {aiSummary.suggested_roles.map((role: any, i: number) => (
                        <div key={i} className="p-3 bg-glass-white5 rounded-lg border border-glass-border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-200">{role.role}</span>
                            <span className="text-emerald font-bold">{role.fit_score}% Match</span>
                          </div>
                          <p className="text-xs text-gray-400">{role.reasoning}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiSummary.strengths?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-blue-400 mb-2">Strengths:</h4>
                      <ul className="text-xs text-gray-400 space-y-1">
                        {aiSummary.strengths.map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-2"><span className="text-emerald">✓</span><span>{s}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiSummary.weaknesses?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-amber-400 mb-2">Areas to Explore:</h4>
                      <ul className="text-xs text-gray-400 space-y-1">
                        {aiSummary.weaknesses.map((w: string, i: number) => (
                          <li key={i} className="flex items-start gap-2"><span className="text-amber-400">→</span><span>{w}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {aiSummary.interview_focus_areas?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-purple-400 mb-2">Interview Focus Areas:</h4>
                    <div className="flex flex-wrap gap-2">
                      {aiSummary.interview_focus_areas.map((area: string, i: number) => (
                        <span key={i} className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 rounded border border-purple-500/20">{area}</span>
                      ))}
                    </div>
                  </div>
                )}
                {aiSummary.overall_assessment && (
                  <div className="pt-3 border-t border-glass-border">
                    <h4 className="text-xs font-semibold text-gray-400 mb-1">Overall Assessment:</h4>
                    <p className="text-sm text-gray-300 leading-relaxed">{aiSummary.overall_assessment}</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Meeting Recording & Notes */}
        {(candidate.meetingRecording || candidate.meetingNotes) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Video className="text-purple-400" size={16} />
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Interview Recording & Notes</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {candidate.meetingRecording && (
                <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Video size={14} className="text-purple-400" />
                    <span className="text-xs font-medium text-gray-300">Meeting Recording</span>
                  </div>
                  <a href={candidate.meetingRecording} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                    <Link2 size={12} /> Open Recording
                  </a>
                </div>
              )}
              {candidate.meetingNotes && (
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={14} className="text-blue-400" />
                    <span className="text-xs font-medium text-gray-300">Meeting Notes</span>
                  </div>
                  <a href={candidate.meetingNotes} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    <Link2 size={12} /> Open Notes
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Remarks */}
        {candidate.remarks && (
          <div className="glass-card p-4 md:p-5">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Remarks</h3>
            <p className="text-sm text-gray-300">{candidate.remarks}</p>
          </div>
        )}

        {/* Edit Candidate Info */}
        {editInfoMode && (
          <div className="glass-card p-4 md:p-5 border border-blue-500/20">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-4">Edit Candidate Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Name</label>
                <input type="text" value={editInfoData.name} onChange={(e) => setEditInfoData(prev => ({ ...prev, name: e.target.value }))} className="input-field text-sm" placeholder="Candidate name" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Email</label>
                <input type="email" value={editInfoData.email} onChange={(e) => setEditInfoData(prev => ({ ...prev, email: e.target.value }))} className="input-field text-sm" placeholder="email@example.com" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Phone</label>
                <input type="text" value={editInfoData.phone} onChange={(e) => setEditInfoData(prev => ({ ...prev, phone: e.target.value }))} className="input-field text-sm" placeholder="+92 300 1234567" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Position</label>
                <input type="text" value={editInfoData.position} onChange={(e) => setEditInfoData(prev => ({ ...prev, position: e.target.value }))} className="input-field text-sm" placeholder="AI Engineer" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-400 mb-1 block">Remarks</label>
                <textarea value={editInfoData.remarks} onChange={(e) => setEditInfoData(prev => ({ ...prev, remarks: e.target.value }))} rows={3} className="input-field text-sm" placeholder="Any remarks..." />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={async () => {
                  setSavingInfo(true);
                  try {
                    await api.put(`/candidates/${id}`, editInfoData);
                    queryClient.invalidateQueries({ queryKey: ['candidate', id] });
                    toast.success('Candidate info updated');
                    setEditInfoMode(false);
                  } catch (err: any) {
                    toast.error(err.response?.data?.message || 'Failed to update info');
                  } finally {
                    setSavingInfo(false);
                  }
                }}
                disabled={savingInfo}
                className="btn-primary text-xs"
              >
                {savingInfo ? 'Saving...' : 'Save Info'}
              </button>
              <button onClick={() => setEditInfoMode(false)} className="btn-ghost text-xs">Cancel</button>
            </div>
          </div>
        )}

        {/* Edit Notes */}
        {editMode && (
          <div className="glass-card p-4 md:p-5 border border-emerald/20">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-4">Edit Notes & Rating</h3>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className="input-field mb-3" placeholder="Meeting notes..." />
            <div className="flex items-center gap-4 mb-4">
              <label className="text-xs font-medium text-gray-400">Rating:</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)}
                    className={`text-xl transition-colors ${n <= (rating || 0) ? 'text-yellow-400' : 'text-gray-600'}`}>★</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveNotes} disabled={updateMutation.isPending} className="btn-primary text-xs">
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditMode(false)} className="btn-ghost text-xs">Cancel</button>
            </div>
          </div>
        )}

        {/* Messages */}
        {candidate.messages && candidate.messages.length > 0 && (
          <div className="glass-card p-4 md:p-5">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Messages</span>
              <span className="text-xs text-emerald">
                {candidate.messages.filter((m) => !m.isRead && m.direction === 'INCOMING').length} unread
              </span>
            </h3>
            <div className="space-y-3">
              {candidate.messages.map((msg) => (
                <div key={msg.id} className={`p-3 rounded-lg border ${msg.direction === 'INCOMING' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-emerald/5 border-emerald/20'}`}>
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail size={14} className={msg.direction === 'INCOMING' ? 'text-blue-400 flex-shrink-0' : 'text-emerald flex-shrink-0'} />
                      <span className="text-xs font-medium text-gray-300 truncate">
                        {msg.direction === 'INCOMING' ? candidate.name : 'You'}
                      </span>
                      {!msg.isRead && msg.direction === 'INCOMING' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded flex-shrink-0">NEW</span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-600 flex-shrink-0">{formatDateTime(msg.createdAt)}</span>
                  </div>
                  {msg.subject && <div className="text-xs font-medium text-gray-400 mb-1">Re: {msg.subject}</div>}
                  <div className="text-xs text-gray-400 whitespace-pre-wrap line-clamp-3">{msg.body}</div>
                  {msg.direction === 'INCOMING' && canEdit && (
                    <button
                      onClick={() => {
                        setSelectedMessageId(msg.id);
                        setReplyMessage({ subject: msg.subject || '', body: '' });
                        setShowReplyModal(true);
                      }}
                      className="mt-2 text-xs text-emerald hover:text-emerald/80 flex items-center gap-1"
                    >
                      <Mail size={12} /> Reply
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Log */}
        {candidate.activityLogs && candidate.activityLogs.length > 0 && (
          <div className="glass-card p-4 md:p-5">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Activity Log</h3>
            <div className="space-y-1">
              {candidate.activityLogs.map((log: any) => (
                <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-glass-border last:border-0 text-xs gap-1">
                  <div>
                    <span className="font-medium text-gray-300">{log.admin?.name}</span>
                    <span className="text-gray-500 ml-2">{log.details || log.action}</span>
                  </div>
                  <span className="text-gray-600 flex-shrink-0">{formatDateTime(log.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Assessment Email Modal */}
      {showAssessmentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-4 md:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Send Assessment Email</h3>
            <p className="text-xs text-gray-400 mb-4">Review and edit the AI-generated email before sending</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Subject</label>
                <input type="text" value={assessmentEmail.subject} onChange={(e) => setAssessmentEmail({ ...assessmentEmail, subject: e.target.value })} className="input-field w-full" placeholder="Email subject..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Email Body</label>
                <textarea value={assessmentEmail.body} onChange={(e) => setAssessmentEmail({ ...assessmentEmail, body: e.target.value })} rows={10} className="input-field w-full font-mono text-xs" placeholder="Email body..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Attach Assessment File (PDF/ZIP)</label>
                <input type="file" accept=".pdf,.zip" onChange={(e) => setAssessmentFile(e.target.files?.[0] || null)} className="input-field w-full text-xs" />
                {assessmentFile && <p className="text-xs text-emerald mt-1">✓ {assessmentFile.name}</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => sendAssessmentMutation.mutate()} disabled={sendAssessmentMutation.isPending || !assessmentEmail.subject || !assessmentEmail.body}
                className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-3">
                <Mail size={16} /> {sendAssessmentMutation.isPending ? 'Sending...' : 'Send Email'}
              </button>
              <button onClick={() => { setShowAssessmentModal(false); setAssessmentEmail({ subject: '', body: '' }); setAssessmentFile(null); }}
                className="btn-outline text-sm py-3">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {scheduleModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-surface p-4 md:p-6 rounded-xl shadow-2xl border border-glass-border max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="text-purple-400" size={20} />
              <h3 className="text-lg font-semibold text-gray-100">Schedule Interview</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Scheduling interview for <span className="text-emerald font-medium">{candidate.name}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Interview Round</label>
                <select value={scheduleData.round} onChange={(e) => setScheduleData({ ...scheduleData, round: e.target.value })}
                  className="w-full bg-glass-white5 border border-glass-border rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-emerald/50">
                  <option value="Technical Interview">Technical Interview</option>
                  <option value="HR Interview">HR Interview</option>
                  <option value="Final Interview">Final Interview</option>
                  <option value="Screening Call">Screening Call</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Date</label>
                  <input type="date" value={scheduleData.date} onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                    className="w-full bg-glass-white5 border border-glass-border rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-emerald/50" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Time</label>
                  <input type="time" value={scheduleData.time} onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                    className="w-full bg-glass-white5 border border-glass-border rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-emerald/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Duration</label>
                <select value={scheduleData.duration} onChange={(e) => setScheduleData({ ...scheduleData, duration: parseInt(e.target.value) })}
                  className="w-full bg-glass-white5 border border-glass-border rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-emerald/50">
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Interviewer</label>
                <select value={scheduleData.interviewer} onChange={(e) => setScheduleData({ ...scheduleData, interviewer: e.target.value })}
                  className="w-full bg-glass-white5 border border-glass-border rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-emerald/50">
                  <option value="anas.i@limiai.uk">Anas Irfan</option>
                  <option value="arqam.malik@limiai.uk">Arqam Malik</option>
                  <option value="shahryar.alam@limiai.uk">Shahryar Alam</option>
                  <option value="suzair.khan@limiai.uk">Suzair Khan</option>
                </select>
              </div>
              <button onClick={generateMeetLink} disabled={!scheduleData.date || !scheduleData.time || generatingMeet}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2">
                <Video size={16} /> {generatingMeet ? 'Generating...' : 'Generate Google Meet Link'}
              </button>
              {meetLink && (
                <div className="p-3 bg-emerald/10 border border-emerald/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Meet Link Generated</span>
                    <Zap size={14} className="text-emerald" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="text" value={meetLink} readOnly className="flex-1 bg-glass-white5 border border-glass-border rounded px-2 py-1 text-xs text-gray-300 min-w-0" />
                    <button onClick={() => { navigator.clipboard.writeText(meetLink); toast.success('Copied!'); }}
                      className="p-1.5 hover:bg-glass-white10 rounded transition-colors flex-shrink-0">
                      <Link2 size={14} className="text-emerald" />
                    </button>
                  </div>
                </div>
              )}
              {emailTemplate.subject && (
                <div className="space-y-3 pt-3 border-t border-glass-border">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-400" />
                    <span className="text-xs text-gray-400">AI-Generated Email Template</span>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Subject</label>
                    <input type="text" value={emailTemplate.subject} onChange={(e) => setEmailTemplate({ ...emailTemplate, subject: e.target.value })}
                      className="w-full bg-glass-white5 border border-glass-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald/50" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Email Body</label>
                    <textarea value={emailTemplate.body} onChange={(e) => setEmailTemplate({ ...emailTemplate, body: e.target.value })} rows={8}
                      className="w-full bg-glass-white5 border border-glass-border rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-emerald/50" />
                  </div>
                  <button onClick={sendMeetingInvite} disabled={sendingInvite}
                    className="w-full bg-emerald hover:bg-emerald/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2">
                    <Mail size={16} /> {sendingInvite ? 'Sending...' : 'Send Meeting Invitation'}
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setScheduleModal(false); setMeetLink(''); setEmailTemplate({ subject: '', body: '' }); }}
                className="btn-outline flex-1 text-sm py-3">Cancel</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* CV Viewer Modal */}
      {cvModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-surface p-4 md:p-6 rounded-xl shadow-2xl border border-glass-border max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="text-blue-400 flex-shrink-0" size={20} />
                <h3 className="text-lg font-semibold text-gray-100 truncate">{cvContent?.name || 'CV Viewer'}</h3>
              </div>
              <button onClick={() => { setCvModal(false); setCvContent(null); }} className="text-gray-400 hover:text-gray-200 transition-colors flex-shrink-0">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingCV ? (
                <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-emerald" size={32} /></div>
              ) : cvContent ? (
                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono bg-glass-white5 p-4 rounded-lg">{cvContent.text}</pre>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">No CV content available</p>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-4 md:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Reply to Message</h3>
            <p className="text-xs text-gray-400 mb-4">Send a reply to {candidate?.name}</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Subject</label>
                <input type="text" value={replyMessage.subject} onChange={(e) => setReplyMessage({ ...replyMessage, subject: e.target.value })} className="input-field w-full" placeholder="Re: ..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Message</label>
                <textarea value={replyMessage.body} onChange={(e) => setReplyMessage({ ...replyMessage, body: e.target.value })} rows={8} className="input-field w-full" placeholder="Type your reply..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => sendReplyMutation.mutate()} disabled={sendReplyMutation.isPending || !replyMessage.body}
                className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-3">
                <Mail size={16} /> {sendReplyMutation.isPending ? 'Sending...' : 'Send Reply'}
              </button>
              <button onClick={() => { setShowReplyModal(false); setReplyMessage({ subject: '', body: '' }); setSelectedMessageId(null); }}
                className="btn-outline text-sm py-3">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-4 md:p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Reschedule Interview</h3>
            <p className="text-xs text-gray-400 mb-4">Update interview date and time for {candidate?.name}</p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1 block">New Date</label>
                  <input type="date" value={rescheduleData.date} onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                    className="input-field w-full" min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1 block">New Time</label>
                  <input type="time" value={rescheduleData.time} onChange={(e) => setRescheduleData({ ...rescheduleData, time: e.target.value })} className="input-field w-full" />
                </div>
              </div>
              <button onClick={generateRescheduleEmail} disabled={generatingRescheduleEmail || !rescheduleData.date || !rescheduleData.time}
                className="btn-primary flex items-center gap-2 text-xs">
                <Sparkles size={14} /> {generatingRescheduleEmail ? 'Generating...' : 'Generate Email Template'}
              </button>
              {rescheduleEmailTemplate.subject && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1 block">Email Subject</label>
                    <input type="text" value={rescheduleEmailTemplate.subject} onChange={(e) => setRescheduleEmailTemplate({ ...rescheduleEmailTemplate, subject: e.target.value })} className="input-field w-full" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1 block">Email Body</label>
                    <textarea value={rescheduleEmailTemplate.body} onChange={(e) => setRescheduleEmailTemplate({ ...rescheduleEmailTemplate, body: e.target.value })} rows={10} className="input-field w-full font-mono text-xs" />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleReschedule} disabled={rescheduling || !rescheduleEmailTemplate.subject}
                className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-3">
                <Mail size={16} /> {rescheduling ? 'Sending...' : 'Send Reschedule Email'}
              </button>
              <button onClick={() => { setShowRescheduleModal(false); setRescheduleData({ date: '', time: '' }); setRescheduleEmailTemplate({ subject: '', body: '' }); }}
                className="btn-outline text-sm py-3">Cancel</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Interview Questions Modal */}
      <InterviewQuestionsModal
        show={showInterviewQuestionsModal}
        onClose={() => setShowInterviewQuestionsModal(false)}
        questions={interviewQuestions}
        candidateName={candidate?.name || ''}
      />

      {/* Assessment Preview Modal */}
      <AssessmentPreviewModal
        isOpen={showAssessmentPreview}
        onClose={() => setShowAssessmentPreview(false)}
        candidateId={id}
        candidateName={candidate?.name || ''}
        candidateEmail={candidate?.email || ''}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['candidate', id] });
          queryClient.invalidateQueries({ queryKey: ['board-candidates'] });
        }}
      />
    </>
  );
}
