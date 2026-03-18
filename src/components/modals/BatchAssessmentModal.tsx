'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Send, CheckSquare, Square, Eye, Zap } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import AssessmentPreviewModal from './AssessmentPreviewModal';

interface Candidate {
  id: string;
  name: string;
  email: string;
  position: string;
  status: string;
}

interface GeneratedAssessment {
  candidateId: string;
  name: string;
  assessmentData: any;
  emailData: any;
  pdfFileName: string;
  status: 'success' | 'failed';
  error?: string;
}

interface BatchAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BatchAssessmentModal({ isOpen, onClose, onSuccess }: BatchAssessmentModalProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [sending, setSending] = useState(false);
  const [generatedAssessments, setGeneratedAssessments] = useState<GeneratedAssessment[]>([]);
  const [previewCandidateId, setPreviewCandidateId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchInboxCandidates();
    }
  }, [isOpen]);

  const fetchInboxCandidates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/candidates?status=INBOX&roundStage=INBOX');
      const data = response.data?.data || response.data || [];
      setCandidates(data);
    } catch (error: any) {
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const toggleCandidate = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map(c => c.id)));
    }
  };

  const handleProcessAll = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one candidate');
      return;
    }

    setProcessing(true);
    try {
      const response = await api.post('/automation/process-batch-preview', {
        candidateIds: Array.from(selectedIds)
      });
      
      const result = response.data?.data || response.data;
      const generated = result.results || [];
      
      setGeneratedAssessments(generated);
      toast.success(`Generated ${result.processed || 0} assessments. Review and send.`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate assessments');
    } finally {
      setProcessing(false);
    }
  };

  const handleSendSelected = async () => {
    const selectedGenerated = generatedAssessments.filter(a => 
      a.status === 'success' && selectedIds.has(a.candidateId)
    );

    if (selectedGenerated.length === 0) {
      toast.error('Please select at least one generated assessment to send');
      return;
    }

    setSending(true);
    try {
      const response = await api.post('/automation/process-batch', {
        candidateIds: selectedGenerated.map(a => a.candidateId)
      });
      
      const result = response.data?.data || response.data;
      toast.success(`Sent ${result.sent || 0} assessments successfully`);
      
      onSuccess?.();
      onClose();
      setGeneratedAssessments([]);
      setSelectedIds(new Set());
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send assessments');
    } finally {
      setSending(false);
    }
  };

  const handlePreview = (candidateId: string) => {
    const generated = generatedAssessments.find(a => a.candidateId === candidateId);
    if (generated && generated.status === 'success') {
      setPreviewData({
        assessmentData: generated.assessmentData,
        emailData: generated.emailData,
        pdfFileName: generated.pdfFileName
      });
      setPreviewCandidateId(candidateId);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="glass-surface p-6 rounded-xl shadow-2xl border border-glass-border max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-100">Batch Assessment Processing</h2>
              <p className="text-sm text-gray-400 mt-1">
                {generatedAssessments.length === 0 
                  ? 'Select candidates and generate assessments'
                  : 'Review generated assessments and send selected ones'
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-glass-white10 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-emerald" />
            </div>
          )}

          {/* Candidates List */}
          {!loading && candidates.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No INBOX candidates found</p>
            </div>
          )}

          {!loading && candidates.length > 0 && (
            <>
              {/* Select All */}
              <div className="mb-4 p-3 bg-glass-white5 border border-glass-border rounded-lg">
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-emerald transition-colors"
                >
                  {selectedIds.size === candidates.length ? (
                    <CheckSquare size={18} className="text-emerald" />
                  ) : (
                    <Square size={18} />
                  )}
                  <span>
                    {selectedIds.size === candidates.length ? 'Deselect All' : 'Select All'} 
                    ({selectedIds.size}/{candidates.length})
                  </span>
                </button>
              </div>

              {/* Candidates */}
              <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className={`p-4 rounded-lg border transition-all ${
                      selectedIds.has(candidate.id)
                        ? 'bg-emerald/10 border-emerald/30'
                        : 'bg-glass-white5 border-glass-border hover:border-glass-border-hover'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleCandidate(candidate.id)}
                        className="flex-shrink-0"
                      >
                        {selectedIds.has(candidate.id) ? (
                          <CheckSquare size={20} className="text-emerald" />
                        ) : (
                          <Square size={20} className="text-gray-500 hover:text-gray-300" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-200">{candidate.name}</h3>
                        <p className="text-xs text-gray-400">{candidate.email}</p>
                        <p className="text-xs text-gray-500 mt-1">{candidate.position}</p>
                      </div>

                      {generatedAssessments.length > 0 ? (
                        <div className="flex items-center gap-2">
                          {generatedAssessments.find(a => a.candidateId === candidate.id)?.status === 'success' ? (
                            <>
                              <span className="text-xs text-emerald">✓ Generated</span>
                              <button
                                onClick={() => handlePreview(candidate.id)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald/10 hover:bg-emerald/20 border border-emerald/30 rounded-lg transition-colors text-emerald"
                              >
                                <Eye size={14} />
                                Preview
                              </button>
                            </>
                          ) : generatedAssessments.find(a => a.candidateId === candidate.id)?.status === 'failed' ? (
                            <span className="text-xs text-red-400">✗ Failed</span>
                          ) : null}
                        </div>
                      ) : (
                        <button
                          onClick={() => setPreviewCandidateId(candidate.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-glass-white5 hover:bg-glass-white10 border border-glass-border rounded-lg transition-colors text-gray-300"
                        >
                          <Eye size={14} />
                          Preview
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-glass-border">
                <p className="text-sm text-gray-400">
                  {selectedIds.size} candidate{selectedIds.size !== 1 ? 's' : ''} selected
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    disabled={sending || processing}
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  {generatedAssessments.length === 0 ? (
                    <button
                      onClick={handleProcessAll}
                      disabled={processing || selectedIds.size === 0}
                      className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
                    >
                      {processing ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Zap size={16} />
                          Process All
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleSendSelected}
                      disabled={sending || selectedIds.size === 0}
                      className="flex items-center gap-2 px-6 py-2 bg-emerald hover:bg-emerald/80 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
                    >
                      {sending ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          Send Selected
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewCandidateId && (
        <AssessmentPreviewModal
          isOpen={!!previewCandidateId}
          onClose={() => {
            setPreviewCandidateId(null);
            setPreviewData(null);
          }}
          candidateId={previewCandidateId}
          candidateName={candidates.find(c => c.id === previewCandidateId)?.name || ''}
          candidateEmail={candidates.find(c => c.id === previewCandidateId)?.email || ''}
          preGeneratedData={previewData}
          onSuccess={() => {
            setPreviewCandidateId(null);
            setPreviewData(null);
            if (generatedAssessments.length === 0) {
              fetchInboxCandidates();
            }
          }}
        />
      )}
    </>
  );
}
