'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Header from '@/components/layout/Header';
import { formatDateTime } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Activity, CheckCircle, XCircle, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import api from '@/lib/axios';

interface CronLog {
  id: string;
  job_name: string;
  status: string;
  duration: number | null;
  message: string | null;
  error: string | null;
  created_at: string;
}

interface CronStatus {
  gmail: { running: boolean };
  replies: { running: boolean };
  health: { running: boolean };
}

export default function CronLogsPage() {
  const [limit, setLimit] = useState(50);

  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['cron-status'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: CronStatus }>('/health/cron');
      return data.data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: logsData, isLoading: logsLoading, refetch } = useQuery({
    queryKey: ['cron-logs', limit],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: CronLog[] }>(`/cron/logs?limit=${limit}`);
      return data.data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const logs = logsData || [];
  const status = statusData || { gmail: { running: false }, replies: { running: false }, health: { running: false } };

  const successCount = logs.filter(l => l.status === 'SUCCESS').length;
  const errorCount = logs.filter(l => l.status === 'ERROR').length;
  const avgDuration = logs.length > 0 
    ? Math.round(logs.filter(l => l.duration).reduce((sum, l) => sum + (l.duration || 0), 0) / logs.filter(l => l.duration).length)
    : 0;

  const startCronJobs = async () => {
    try {
      await api.post('/cron/start');
      refetchStatus();
      refetch();
    } catch (error) {
      console.error('Failed to start cron jobs');
    }
  };

  const stopCronJobs = async () => {
    try {
      await api.post('/cron/stop');
      refetchStatus();
      refetch();
    } catch (error) {
      console.error('Failed to stop cron jobs');
    }
  };

  const triggerGmail = async () => {
    try {
      await api.post('/cron/trigger/gmail');
      refetch();
    } catch (error) {
      console.error('Failed to trigger Gmail processing');
    }
  };

  const triggerReplies = async () => {
    try {
      await api.post('/cron/trigger/replies');
      refetch();
    } catch (error) {
      console.error('Failed to trigger reply check');
    }
  };

  const triggerInterviewProcessing = async () => {
    try {
      await api.post('/cron/trigger/status-transition');
      refetch();
    } catch (error) {
      console.error('Failed to trigger interview processing');
    }
  };

  const isAnyCronRunning = status.gmail.running || status.replies.running || status.health.running;

  return (
    <>
      <Header title="Cron Job Monitor" subtitle="System automation status and logs">
        <div className="flex items-center gap-2">
          {isAnyCronRunning ? (
            <button onClick={stopCronJobs} className="btn-ghost flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300">
              <XCircle size={14} /> Stop All Crons
            </button>
          ) : (
            <button onClick={startCronJobs} className="btn-ghost flex items-center gap-1.5 text-xs text-emerald hover:text-emerald/80">
              <CheckCircle size={14} /> Start All Crons
            </button>
          )}
          <button onClick={() => refetch()} className="btn-ghost flex items-center gap-1.5 text-xs">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </Header>

      <div className="p-6 space-y-6">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Gmail Processing</span>
              {status.gmail.running ? (
                <CheckCircle size={16} className="text-emerald" />
              ) : (
                <XCircle size={16} className="text-red-400" />
              )}
            </div>
            <p className="text-sm font-semibold text-gray-200">
              {status.gmail.running ? 'Running' : 'Stopped'}
            </p>
            <button onClick={triggerGmail} className="mt-2 text-xs text-emerald hover:text-emerald/80">
              Trigger Now
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Reply Check</span>
              {status.replies.running ? (
                <CheckCircle size={16} className="text-emerald" />
              ) : (
                <XCircle size={16} className="text-red-400" />
              )}
            </div>
            <p className="text-sm font-semibold text-gray-200">
              {status.replies.running ? 'Running' : 'Stopped'}
            </p>
            <button onClick={triggerReplies} className="mt-2 text-xs text-emerald hover:text-emerald/80">
              Trigger Now
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4 border border-amber-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-amber-400 uppercase tracking-wider font-semibold">Interview Processing</span>
              <AlertCircle size={16} className="text-amber-400" />
            </div>
            <p className="text-sm font-semibold text-gray-200">
              Auto Process
            </p>
            <button onClick={triggerInterviewProcessing} className="mt-2 text-xs text-amber-400 hover:text-amber-300 font-medium">
              Process Now →
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Success Rate</span>
              <Activity size={16} className="text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-emerald">
              {logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">{successCount} / {logs.length} runs</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Avg Duration</span>
              <Clock size={16} className="text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-gray-200">{avgDuration}ms</p>
            <p className="text-xs text-gray-500 mt-1">Average execution time</p>
          </motion.div>
        </div>

        {/* Logs Table */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-200">Execution Logs</h3>
            <select 
              value={limit} 
              onChange={(e) => setLimit(Number(e.target.value))}
              className="input-field text-xs w-32"
            >
              <option value={25}>Last 25</option>
              <option value={50}>Last 50</option>
              <option value={100}>Last 100</option>
            </select>
          </div>

          {logsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No cron logs found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded-lg border ${
                    log.status === 'SUCCESS' 
                      ? 'bg-emerald/5 border-emerald/20' 
                      : 'bg-red-500/5 border-red-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {log.status === 'SUCCESS' ? (
                          <CheckCircle size={14} className="text-emerald" />
                        ) : (
                          <XCircle size={14} className="text-red-400" />
                        )}
                        <span className="text-sm font-medium text-gray-200">{log.job_name}</span>
                        {log.duration && (
                          <span className="text-xs text-gray-500">
                            <Clock size={10} className="inline mr-1" />
                            {log.duration}ms
                          </span>
                        )}
                      </div>
                      {log.message && (
                        <p className="text-xs text-gray-400 ml-5">{log.message}</p>
                      )}
                      {log.error && (
                        <details className="ml-5 mt-1">
                          <summary className="text-xs text-red-400 cursor-pointer hover:text-red-300">
                            View error details
                          </summary>
                          <pre className="text-[10px] text-red-300 mt-1 p-2 bg-black/20 rounded overflow-x-auto">
                            {log.error}
                          </pre>
                        </details>
                      )}
                    </div>
                    <span className="text-xs text-gray-600 whitespace-nowrap ml-4">
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
