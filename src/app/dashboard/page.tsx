'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateService } from '@/services/candidate.service';
import api from '@/lib/axios';
import Header from '@/components/layout/Header';
import { MetricsSkeleton } from '@/components/ui/LoadingSkeleton';
import { Users, UserCheck, UserX, Calendar, BarChart3, Clock, Brain, Zap, CheckCircle2, AlertCircle, Mail, RefreshCw, Video } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Metrics } from '@/types';
import Link from 'next/link';
import toast from 'react-hot-toast';

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
      <div className="p-4 md:p-6">
        {isLoading ? (
          <MetricsSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
              className="mt-6 glass-card p-4 md:p-6"
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
              className="mt-6 glass-card p-4 md:p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-purple-400" />
                <h2 className="text-sm font-semibold text-gray-200">Cron Job Manual Triggers</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
              </div>
            </motion.div>
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
