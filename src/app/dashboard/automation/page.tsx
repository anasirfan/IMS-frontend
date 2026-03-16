'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import { Settings, Zap, Play, Eye, Loader2, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface AutomationSettings {
  id: string;
  mode: 'off' | 'automated' | 'manual';
  createdAt: string;
  updatedAt: string;
}

export default function AutomationPage() {
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState(false);

  // Fetch automation settings
  const { data: settings, isLoading } = useQuery<AutomationSettings>({
    queryKey: ['automation-settings'],
    queryFn: async () => {
      const response = await api.get('/automation/settings');
      return response.data;
    },
  });

  // Update automation mode
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

  // Manual trigger - process all INBOX candidates
  const handleManualTrigger = async () => {
    setProcessing(true);
    try {
      const response = await api.post('/automation/process-all');
      const results = response.data;
      
      toast.success(
        `Processed: ${results.processed}, Skipped: ${results.skipped}, Failed: ${results.failed}`,
        { duration: 5000 }
      );
      
      queryClient.invalidateQueries({ queryKey: ['board-candidates'] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process candidates');
    } finally {
      setProcessing(false);
    }
  };

  const currentMode = settings?.mode || 'off';

  return (
    <>
      <Header title="Assessment Automation" subtitle="Configure automated assessment generation and sending">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Settings size={14} />
          <span>AI-Powered Automation</span>
        </div>
      </Header>

      <div className="p-6 space-y-6">
        {/* Automation Mode Settings */}
        <div className="glass-surface p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-emerald/20 flex items-center justify-center">
              <Zap size={20} className="text-emerald" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-200">Automation Mode</h2>
              <p className="text-sm text-gray-500">Control how assessments are generated and sent</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-emerald" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Off Mode */}
              <button
                onClick={() => updateModeMutation.mutate('off')}
                disabled={updateModeMutation.isPending}
                className={`p-6 rounded-lg border-2 transition-all ${
                  currentMode === 'off'
                    ? 'border-red-500/50 bg-red-500/10'
                    : 'border-glass-border hover:border-red-500/30 bg-glass-white5'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <XCircle size={24} className={currentMode === 'off' ? 'text-red-400' : 'text-gray-500'} />
                  {currentMode === 'off' && (
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-gray-200 mb-1">Off</h3>
                <p className="text-xs text-gray-500">
                  No automation. Assessments must be sent manually for each candidate.
                </p>
              </button>

              {/* Automated Mode */}
              <button
                onClick={() => updateModeMutation.mutate('automated')}
                disabled={updateModeMutation.isPending}
                className={`p-6 rounded-lg border-2 transition-all ${
                  currentMode === 'automated'
                    ? 'border-emerald/50 bg-emerald/10'
                    : 'border-glass-border hover:border-emerald/30 bg-glass-white5'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <Zap size={24} className={currentMode === 'automated' ? 'text-emerald' : 'text-gray-500'} />
                  {currentMode === 'automated' && (
                    <div className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-gray-200 mb-1">Automated</h3>
                <p className="text-xs text-gray-500">
                  Cron job runs every 15 minutes. Automatically generates and sends assessments to INBOX candidates.
                </p>
              </button>

              {/* Manual Mode */}
              <button
                onClick={() => updateModeMutation.mutate('manual')}
                disabled={updateModeMutation.isPending}
                className={`p-6 rounded-lg border-2 transition-all ${
                  currentMode === 'manual'
                    ? 'border-blue-500/50 bg-blue-500/10'
                    : 'border-glass-border hover:border-blue-500/30 bg-glass-white5'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <Play size={24} className={currentMode === 'manual' ? 'text-blue-400' : 'text-gray-500'} />
                  {currentMode === 'manual' && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-gray-200 mb-1">Manual Trigger</h3>
                <p className="text-xs text-gray-500">
                  Generate assessments automatically, but only when you click "Process All" button below.
                </p>
              </button>
            </div>
          )}
        </div>

        {/* Manual Trigger Section */}
        <div className="glass-surface p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-200">Manual Processing</h2>
              <p className="text-sm text-gray-500">Process all INBOX candidates immediately</p>
            </div>
            <button
              onClick={handleManualTrigger}
              disabled={processing}
              className="flex items-center gap-2 px-4 py-2 bg-emerald hover:bg-emerald/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
            >
              {processing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play size={16} />
                  Process All INBOX
                </>
              )}
            </button>
          </div>

          <div className="bg-glass-white5 border border-glass-border rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-2">
              <strong>What happens when you click "Process All":</strong>
            </p>
            <ul className="text-xs text-gray-500 space-y-1 ml-4">
              <li>• Finds all candidates with status = INBOX and round_stage = INBOX</li>
              <li>• Analyzes CV and generates tailored assessment (60% core + 40% dynamic)</li>
              <li>• Creates branded PDF with assessment content</li>
              <li>• Generates professional email template</li>
              <li>• Sends email with PDF attachment</li>
              <li>• Updates candidate status to ASSESSMENT</li>
              <li>• Processes up to 50 candidates per run</li>
            </ul>
          </div>
        </div>

        {/* How It Works */}
        <div className="glass-surface p-6 rounded-xl">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">How Assessment Automation Works</h2>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald/20 flex items-center justify-center flex-shrink-0">
                <span className="text-emerald font-bold text-sm">1</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-1">CV Analysis</h3>
                <p className="text-xs text-gray-500">
                  AI analyzes the candidate's CV to determine seniority level, tech stack, unique strengths, and skill gaps.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald/20 flex items-center justify-center flex-shrink-0">
                <span className="text-emerald font-bold text-sm">2</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-1">Tailored Assessment</h3>
                <p className="text-xs text-gray-500">
                  Generates a customized technical assessment with 60% fixed core challenges and 40% dynamic tasks based on the candidate's profile.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald/20 flex items-center justify-center flex-shrink-0">
                <span className="text-emerald font-bold text-sm">3</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-1">PDF Generation</h3>
                <p className="text-xs text-gray-500">
                  Creates a beautiful, branded PDF with the assessment content, candidate details, and submission instructions.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald/20 flex items-center justify-center flex-shrink-0">
                <span className="text-emerald font-bold text-sm">4</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-1">Email Delivery</h3>
                <p className="text-xs text-gray-500">
                  Sends a professional email with the assessment PDF attached, including deadline (48 hours) and submission instructions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Info */}
        <div className="glass-surface p-6 rounded-xl">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Current Status</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-glass-white5 border border-glass-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings size={16} className="text-emerald" />
                <span className="text-sm font-semibold text-gray-200">Automation Mode</span>
              </div>
              <p className="text-2xl font-bold text-emerald capitalize">{currentMode}</p>
            </div>

            <div className="bg-glass-white5 border border-glass-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <RotateCcw size={16} className="text-blue-400" />
                <span className="text-sm font-semibold text-gray-200">Cron Schedule</span>
              </div>
              <p className="text-2xl font-bold text-blue-400">Every 15 min</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
