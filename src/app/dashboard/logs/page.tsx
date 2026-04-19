'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Header from '@/components/layout/Header';
import { formatDateTime } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Activity, CheckCircle, XCircle, Mail, Database, AlertCircle, RefreshCw, FileText, Bug, Inbox } from 'lucide-react';
import api from '@/lib/axios';

interface LogEntry {
  timestamp: string;
  level: string;
  category: string;
  message: string;
  details: any;
  pid: number;
}

export default function LogsPage() {
  const [selectedLogType, setSelectedLogType] = useState('app');
  const [limit, setLimit] = useState(100);

  const { data: logsData, isLoading, refetch } = useQuery({
    queryKey: ['logs', selectedLogType, limit],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: LogEntry[] }>(`/logs/${selectedLogType}?limit=${limit}`);
      return data.data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const logs = logsData || [];

  const logTypes = [
    { value: 'app', label: 'All Logs', icon: FileText, color: 'text-blue-400' },
    { value: 'error', label: 'Errors', icon: Bug, color: 'text-red-400' },
    { value: 'success', label: 'Success', icon: CheckCircle, color: 'text-emerald' },
    { value: 'email', label: 'Emails', icon: Mail, color: 'text-amber-400' },
    { value: 'fetch', label: 'Fetching', icon: Database, color: 'text-purple-400' },
  ];

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
      case 'EMAIL_FAILED':
      case 'API_ERROR':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'SUCCESS':
      case 'EMAIL_SENT':
        return 'text-emerald bg-emerald/10 border-emerald/20';
      case 'INFO':
      case 'API_FETCH':
      case 'GMAIL_FETCH':
      case 'GMAIL_PROCESSED':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-gray-400 bg-glass-white5 border-glass-border';
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'ERROR':
      case 'EMAIL_FAILED':
      case 'API_ERROR':
        return <XCircle size={14} className="text-red-400" />;
      case 'SUCCESS':
      case 'EMAIL_SENT':
        return <CheckCircle size={14} className="text-emerald" />;
      case 'EMAIL_SENT':
        return <Mail size={14} className="text-amber-400" />;
      case 'API_FETCH':
      case 'GMAIL_FETCH':
        return <Database size={14} className="text-purple-400" />;
      default:
        return <Activity size={14} className="text-blue-400" />;
    }
  };

  const errorCount = logs.filter(l => l.level.includes('ERROR') || l.level.includes('FAILED')).length;
  const successCount = logs.filter(l => l.level === 'SUCCESS' || l.level === 'EMAIL_SENT').length;
  const emailCount = logs.filter(l => l.category === 'EMAIL').length;

  return (
    <>
      <Header title="System Logs" subtitle="Detailed application logs and monitoring">
        <button onClick={() => refetch()} className="btn-ghost flex items-center gap-1.5 text-xs">
          <RefreshCw size={14} /> Refresh
        </button>
      </Header>

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Total Logs</span>
              <FileText size={16} className="text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-gray-200">{logs.length}</p>
            <p className="text-xs text-gray-500 mt-1">Last {limit} entries</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Errors</span>
              <Bug size={16} className="text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-400">{errorCount}</p>
            <p className="text-xs text-gray-500 mt-1">{logs.length > 0 ? Math.round((errorCount / logs.length) * 100) : 0}% error rate</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Success</span>
              <CheckCircle size={16} className="text-emerald" />
            </div>
            <p className="text-2xl font-bold text-emerald">{successCount}</p>
            <p className="text-xs text-gray-500 mt-1">{logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 0}% success rate</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Emails</span>
              <Mail size={16} className="text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-amber-400">{emailCount}</p>
            <p className="text-xs text-gray-500 mt-1">Email operations</p>
          </motion.div>
        </div>

        {/* Log Type Tabs */}
        <div className="glass-card p-2">
          <div className="flex gap-2 flex-wrap">
            {logTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => setSelectedLogType(type.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm ${
                    selectedLogType === type.value
                      ? 'bg-glass-white10 text-gray-100 shadow-md'
                      : 'text-gray-400 hover:bg-glass-white5'
                  }`}
                >
                  <Icon size={14} className={type.color} />
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Logs Display */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-200">
              {logTypes.find(t => t.value === selectedLogType)?.label || 'Logs'}
            </h3>
            <select 
              value={limit} 
              onChange={(e) => setLimit(Number(e.target.value))}
              className="input-field text-xs w-32"
            >
              <option value={50}>Last 50</option>
              <option value={100}>Last 100</option>
              <option value={200}>Last 200</option>
              <option value={500}>Last 500</option>
            </select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No logs found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {logs.map((log, index) => (
                <motion.div
                  key={`${log.timestamp}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded-lg border ${getLogLevelColor(log.level)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {getLogIcon(log.level)}
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/20">
                          {log.level}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/20">
                          {log.category}
                        </span>
                        <span className="text-xs text-gray-500">PID: {log.pid}</span>
                      </div>
                      <p className="text-sm text-gray-200 mb-1">{log.message}</p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                            View details
                          </summary>
                          <pre className="text-[10px] text-gray-300 mt-2 p-3 bg-black/30 rounded overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
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
