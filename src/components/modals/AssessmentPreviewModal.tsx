'use client';

import { useState } from 'react';
import { X, Send, Loader2, FileText, Mail, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';

interface AssessmentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  onSuccess?: () => void;
}

interface PreviewData {
  assessmentData: {
    title: string;
    content: string;
    difficulty: string;
    techStack: string[];
    uniqueStrength: string;
  };
  emailData: {
    subject: string;
    body: string;
  };
  pdfFileName: string;
}

export default function AssessmentPreviewModal({
  isOpen,
  onClose,
  candidateId,
  candidateName,
  candidateEmail,
  onSuccess,
}: AssessmentPreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [activeTab, setActiveTab] = useState<'assessment' | 'email'>('assessment');

  const handleGeneratePreview = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/automation/process-preview/${candidateId}`);
      // Extract data from API response wrapper
      const data = response.data?.data || response.data;
      setPreviewData(data);
      toast.success('Assessment preview generated!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleSendAssessment = async () => {
    if (!previewData) return;

    setSending(true);
    try {
      await api.post(`/automation/send-email/${candidateId}`, {
        emailData: previewData.emailData,
        pdfFileName: previewData.pdfFileName,
      });
      
      toast.success(`Assessment sent to ${candidateName}!`);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send assessment');
    } finally {
      setSending(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!previewData) return;
    
    // Open PDF in new tab
    const pdfUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/uploads/assessments/${previewData.pdfFileName}`;
    window.open(pdfUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-surface rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-glass-border">
          <div>
            <h2 className="text-xl font-semibold text-gray-200">Assessment Preview</h2>
            <p className="text-sm text-gray-500 mt-1">
              {candidateName} ({candidateEmail})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-glass-white5 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!previewData ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText size={48} className="text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">
                Generate Assessment Preview
              </h3>
              <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
                Click the button below to generate a tailored assessment for this candidate.
                You'll be able to review the assessment and email before sending.
              </p>
              <button
                onClick={handleGeneratePreview}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-emerald hover:bg-emerald/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Generating Preview...
                  </>
                ) : (
                  <>
                    <FileText size={20} />
                    Generate Preview
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b border-glass-border">
                <button
                  onClick={() => setActiveTab('assessment')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === 'assessment'
                      ? 'border-emerald text-emerald'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText size={16} />
                    Assessment Content
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('email')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === 'email'
                      ? 'border-emerald text-emerald'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Mail size={16} />
                    Email Template
                  </div>
                </button>
              </div>

              {/* Assessment Tab */}
              {activeTab === 'assessment' && (
                <div className="space-y-4">
                  {previewData.assessmentData?.title && (
                    <div className="bg-glass-white5 border border-glass-border rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-200 mb-2">
                        {previewData.assessmentData.title}
                      </h3>
                      {(previewData.assessmentData.difficulty || previewData.assessmentData.techStack) && (
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {previewData.assessmentData.difficulty && (
                            <span className="px-2 py-1 bg-emerald/20 text-emerald rounded">
                              {previewData.assessmentData.difficulty}
                            </span>
                          )}
                          {previewData.assessmentData.techStack && Array.isArray(previewData.assessmentData.techStack) && (
                            <span>Tech: {previewData.assessmentData.techStack.join(', ')}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-glass-white5 border border-glass-border rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Assessment Content:</h4>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-xs text-gray-400 font-mono">
                        {previewData.assessmentData?.content || 'No content available'}
                      </pre>
                    </div>
                  </div>

                  {previewData.assessmentData?.uniqueStrength && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-blue-400 mb-2">Unique Strength Identified:</h4>
                      <p className="text-sm text-gray-300">{previewData.assessmentData.uniqueStrength}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Email Tab */}
              {activeTab === 'email' && (
                <div className="space-y-4">
                  <div className="bg-glass-white5 border border-glass-border rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Subject:</h4>
                    <p className="text-sm text-gray-400">{previewData.emailData?.subject || 'No subject'}</p>
                  </div>

                  <div className="bg-glass-white5 border border-glass-border rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Email Body:</h4>
                    <pre className="whitespace-pre-wrap text-sm text-gray-400 font-sans">
                      {previewData.emailData?.body || 'No email body'}
                    </pre>
                  </div>

                  <div className="bg-glass-white5 border border-glass-border rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Attachment:</h4>
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-emerald" />
                      <span className="text-sm text-gray-400">{previewData.pdfFileName}</span>
                      <button
                        onClick={handleDownloadPDF}
                        className="ml-auto flex items-center gap-1 px-3 py-1 text-xs bg-glass-white5 hover:bg-glass-white10 border border-glass-border rounded-lg transition-colors text-gray-300"
                      >
                        <Download size={14} />
                        View PDF
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {previewData && (
          <div className="flex items-center justify-between p-6 border-t border-glass-border">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleGeneratePreview}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-glass-white5 hover:bg-glass-white10 border border-glass-border text-gray-300 rounded-lg transition-colors text-sm"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FileText size={16} />
                )}
                Regenerate
              </button>
              <button
                onClick={handleSendAssessment}
                disabled={sending}
                className="flex items-center gap-2 px-6 py-2 bg-emerald hover:bg-emerald/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
              >
                {sending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Assessment
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
