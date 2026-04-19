'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import { Settings, Zap, Play, Loader2, XCircle, CheckSquare } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface AutomationSettings {
  id: string;
  mode: 'off' | 'automated' | 'manual';
  createdAt: string;
  updatedAt: string;
}

export default function AutomationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState(false);

  const { data: settings, isLoading } = useQuery<AutomationSettings>({
    queryKey: ['automation-settings'],
    queryFn: async () => {
      const response = await api.get('/automation/settings');
      return response.data?.data || response.data;
    },
  });

  const updateModeMutation = useMutation({
    mutationFn: async (mode: 'off' | 'automated' | 'manual') => {
      const response = await api.put('/automation/settings', { mode });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-settings'] });
      toast.success('Automation mode updated');
    },
    onError: () => {
      toast.error('Failed to update automation mode');
    },
  });

  const handleProcessAll = async () => {
    setProcessing(true);
    try {
      const response = await api.post('/automation/process-all');
      const results = response.data?.data || response.data;
      toast.success(
        `Processed: ${results.processed || 0}, Skipped: ${results.skipped || 0}, Failed: ${results.failed || 0}`,
        { duration: 5000 }
      );
      queryClient.invalidateQueries({ queryKey: ['board-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process candidates');
    } finally {
      setProcessing(false);
    }
  };

  const currentMode = settings?.mode || 'off';

  return (
    <>
      <Header title="Automation" subtitle="Assessment generation & sending">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Settings size={14} />
          <span className="capitalize">{currentMode}</span>
        </div>
      </Header>

      <div className="p-4 md:p-6 space-y-6">
        {/* Mode Selector */}
        <div className="glass-surface p-4 md:p-6 rounded-xl">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Automation Mode</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={24} className="animate-spin text-emerald" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => updateModeMutation.mutate('off')}
                disabled={updateModeMutation.isPending}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  currentMode === 'off'
                    ? 'border-red-500/50 bg-red-500/10'
                    : 'border-glass-border hover:border-red-500/30 bg-glass-white5'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <XCircle size={16} className={currentMode === 'off' ? 'text-red-400' : 'text-gray-500'} />
                  <span className="text-sm font-semibold text-gray-200">Off</span>
                  {currentMode === 'off' && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse ml-auto" />}
                </div>
                <p className="text-[11px] text-gray-500">Send assessments manually per candidate</p>
              </button>

              <button
                onClick={() => updateModeMutation.mutate('automated')}
                disabled={updateModeMutation.isPending}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  currentMode === 'automated'
                    ? 'border-emerald/50 bg-emerald/10'
                    : 'border-glass-border hover:border-emerald/30 bg-glass-white5'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Zap size={16} className={currentMode === 'automated' ? 'text-emerald' : 'text-gray-500'} />
                  <span className="text-sm font-semibold text-gray-200">Automated</span>
                  {currentMode === 'automated' && <div className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse ml-auto" />}
                </div>
                <p className="text-[11px] text-gray-500">Auto-send every 15 min to INBOX candidates</p>
              </button>

              <button
                onClick={() => updateModeMutation.mutate('manual')}
                disabled={updateModeMutation.isPending}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  currentMode === 'manual'
                    ? 'border-blue-500/50 bg-blue-500/10'
                    : 'border-glass-border hover:border-blue-500/30 bg-glass-white5'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Play size={16} className={currentMode === 'manual' ? 'text-blue-400' : 'text-gray-500'} />
                  <span className="text-sm font-semibold text-gray-200">Manual Trigger</span>
                  {currentMode === 'manual' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse ml-auto" />}
                </div>
                <p className="text-[11px] text-gray-500">Generate on demand via buttons below</p>
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="glass-surface p-4 md:p-6 rounded-xl">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => router.push('/dashboard/automation/batch')}
              className="flex items-center gap-3 p-4 bg-glass-white5 hover:bg-emerald/10 border border-glass-border hover:border-emerald/30 rounded-lg transition-all text-left"
            >
              <CheckSquare size={18} className="text-emerald flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-200">Batch Assessment</p>
                <p className="text-[11px] text-gray-500">Pick candidates and send assessments</p>
              </div>
            </button>

            <button
              onClick={handleProcessAll}
              disabled={processing}
              className="flex items-center gap-3 p-4 bg-glass-white5 hover:bg-blue-500/10 border border-glass-border hover:border-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all text-left"
            >
              {processing ? (
                <Loader2 size={18} className="text-blue-400 animate-spin flex-shrink-0" />
              ) : (
                <Play size={18} className="text-blue-400 flex-shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-200">{processing ? 'Processing...' : 'Process All Inbox'}</p>
                <p className="text-[11px] text-gray-500">Generate & send to all INBOX candidates</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
