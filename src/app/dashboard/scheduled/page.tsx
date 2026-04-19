'use client';

import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import { formatDateTime } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Calendar, Video, User, Briefcase, FileText, ExternalLink, Copy, Mail } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface ScheduledInterview {
  id: string;
  name: string;
  email: string;
  position: string;
  interview_date: string;
  interviewDate?: string; // camelCase version from axios interceptor
  meetLink: string;
  round_stage: string;
  cvPath: string | null;
  phone: string | null;
  interviewer?: string;
}

export default function ScheduledInterviewsPage() {
  const { data, isLoading } = useQuery<ScheduledInterview[]>({
    queryKey: ['scheduled-interviews'],
    queryFn: async () => {
      const response = await api.get('/candidates/scheduled');
      console.log('Raw API response:', response.data);
      // Axios interceptor converts snake_case to camelCase
      // So response.data.data will have camelCase keys
      return response.data?.data || response.data || [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const interviews = data || [];
  
  console.log("Interviews after query:", interviews);
  
  // Sort by interview date (upcoming first)
  // Handle both snake_case and camelCase
  const sortedInterviews = [...interviews].sort((a, b) => {
    const dateA = a.interviewDate || a.interview_date;
    const dateB = b.interviewDate || b.interview_date;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  // Separate upcoming and past interviews
  const now = new Date();
  const upcomingInterviews = sortedInterviews.filter(i => {
    const date = i.interviewDate || i.interview_date;
    return new Date(date) >= now;
  });
  const pastInterviews = sortedInterviews.filter(i => {
    const date = i.interviewDate || i.interview_date;
    return new Date(date) < now;
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const InterviewCard = ({ interview, isPast }: { interview: ScheduledInterview; isPast: boolean }) => {
    console.log("interview scheduled: ", interview)
    const dateStr = (interview as any).interviewDate || interview.interview_date;
    const interviewDate = new Date(dateStr);
    const isToday = interviewDate.toDateString() === now.toDateString();
    const isTomorrow = interviewDate.toDateString() === new Date(now.getTime() + 86400000).toDateString();

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass-surface p-5 rounded-xl border ${
          isPast 
            ? 'border-glass-border opacity-60' 
            : isToday 
              ? 'border-amber-500/50 shadow-glow-sm' 
              : 'border-emerald/20'
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`w-12 h-12 rounded-xl ${
              isPast ? 'bg-gray-500/20' : 'bg-emerald/20'
            } flex items-center justify-center flex-shrink-0`}>
              <User size={20} className={isPast ? 'text-gray-400' : 'text-emerald'} />
            </div>
            <div className="flex-1 min-w-0">
              <Link href={`/dashboard/candidates/${interview.id}`}>
                <h3 className="text-base font-semibold text-gray-100 hover:text-emerald transition-colors">
                  {interview.name}
                </h3>
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <Briefcase size={12} className="text-gray-500" />
                <p className="text-xs text-gray-400">{interview.position}</p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Mail size={12} className="text-gray-500" />
                <p className="text-xs text-gray-400">{interview.email}</p>
                <button
                  onClick={() => copyToClipboard(interview.email, 'Email')}
                  className="p-0.5 hover:bg-glass-white10 rounded"
                >
                  <Copy size={10} className="text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {isToday && !isPast && (
            <span className="px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg text-[10px] font-bold text-amber-400 uppercase">
              Today
            </span>
          )}
          {isTomorrow && !isPast && (
            <span className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded-lg text-[10px] font-bold text-blue-400 uppercase">
              Tomorrow
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {/* Date & Time */}
          <div className="flex items-center gap-2 p-3 bg-glass-white5 rounded-lg border border-glass-border">
            <Calendar size={16} className="text-purple-400" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Date & Time</p>
              <p className="text-xs text-gray-200 font-medium mt-0.5">
                {formatDateTime(dateStr)}
              </p>
            </div>
          </div>

          {/* Round */}
          <div className="flex items-center gap-2 p-3 bg-glass-white5 rounded-lg border border-glass-border">
            <Briefcase size={16} className="text-cyan-400" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Round</p>
              <p className="text-xs text-gray-200 font-medium mt-0.5">
                {interview.round_stage}
              </p>
            </div>
          </div>
        </div>

        {/* Interviewer */}
        {interview.interviewer && (
          <div className="mb-3 p-3 bg-glass-white5 rounded-lg border border-glass-border">
            <div className="flex items-center gap-2">
              <User size={14} className="text-blue-400" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Interviewer</p>
                <p className="text-xs text-gray-200 font-medium mt-0.5">
                  {interview.interviewer}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Meet Link */}
        {interview.meetLink && (
          <div className="mb-3 p-3 bg-emerald/10 border border-emerald/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Video size={14} className="text-emerald" />
                <span className="text-xs font-semibold text-gray-300">Google Meet Link</span>
              </div>
              <button
                onClick={() => copyToClipboard(interview.meetLink, 'Meet link')}
                className="p-1 hover:bg-emerald/20 rounded transition-colors"
              >
                <Copy size={12} className="text-emerald" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={interview.meetLink}
                readOnly
                className="flex-1 bg-glass-white5 border border-glass-border rounded px-2 py-1.5 text-xs text-gray-300 font-mono"
              />
              <a
                href={interview.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-emerald hover:bg-emerald/80 rounded transition-colors"
              >
                <ExternalLink size={12} className="text-white" />
              </a>
            </div>
          </div>
        )}

        {/* CV Link */}
        {interview.cvPath && (
          <div className="flex items-center gap-2">
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'https://suzair.duckdns.org'}/uploads/${interview.cvPath}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors text-xs font-medium text-blue-400"
            >
              <FileText size={14} />
              View CV
            </a>
            <Link
              href={`/dashboard/candidates/${interview.id}`}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-glass-white5 hover:bg-glass-white10 border border-glass-border rounded-lg transition-colors text-xs font-medium text-gray-300"
            >
              View Profile
            </Link>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <>
      <Header title="Scheduled Interviews" subtitle="Upcoming and past interview schedule">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar size={14} />
          <span>{upcomingInterviews.length} upcoming</span>
        </div>
      </Header>

      <div className="p-4 md:p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-48 w-full rounded-xl" />
            ))}
          </div>
        ) : interviews.length === 0 ? (
          <div className="text-center py-16">
            <Calendar size={48} className="mx-auto mb-4 text-gray-600 opacity-50" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">No Scheduled Interviews</h3>
            <p className="text-sm text-gray-500">Schedule interviews from the Pipeline board</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Upcoming Interviews */}
            {upcomingInterviews.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald" />
                  Upcoming Interviews ({upcomingInterviews.length})
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {upcomingInterviews.map((interview) => (
                    <InterviewCard key={interview.id} interview={interview} isPast={false} />
                  ))}
                </div>
              </div>
            )}

            {/* Past Interviews */}
            {pastInterviews.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-500" />
                  Past Interviews ({pastInterviews.length})
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {pastInterviews.map((interview) => (
                    <InterviewCard key={interview.id} interview={interview} isPast={true} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
