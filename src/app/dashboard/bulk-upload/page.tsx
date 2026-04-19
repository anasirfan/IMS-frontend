'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import CompleteCandidateModal from '@/components/modals/CompleteCandidateModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Trash2,
  ClipboardPen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { candidateService } from '@/services/candidate.service';
import { parseBulkFailurePayload, parseBulkUploadFailure } from '@/lib/bulkUploadErrors';
import type { BulkUploadRowStatus } from '@/types';

interface UploadedFile {
  id: string;
  file: File;
  status: BulkUploadRowStatus;
  message?: string;
  candidateId?: string;
  missingFields?: string[];
  partial?: { name?: string; email?: string; phone?: string; position?: string };
}

function makeRowId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function newUploadedFile(file: File): UploadedFile {
  return { id: makeRowId(), file, status: 'pending' };
}

export default function BulkUploadPage() {
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  const activeRow = useMemo(() => files.find((f) => f.id === activeRowId) ?? null, [files, activeRowId]);

  const invalidateCandidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['candidates'] });
    queryClient.invalidateQueries({ queryKey: ['board-candidates'] });
    queryClient.invalidateQueries({ queryKey: ['metrics'] });
  }, [queryClient]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) => file.type === 'application/pdf');

    if (droppedFiles.length === 0) {
      toast.error('Please upload only PDF files');
      return;
    }

    const newFiles: UploadedFile[] = droppedFiles.map((file) => newUploadedFile(file));

    setFiles((prev) => [...prev, ...newFiles]);
    toast.success(`${droppedFiles.length} PDF(s) added`);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files).filter((file) => file.type === 'application/pdf');

    if (selectedFiles.length === 0) {
      toast.error('Please upload only PDF files');
      return;
    }

    const newFiles: UploadedFile[] = selectedFiles.map((file) => newUploadedFile(file));

    setFiles((prev) => [...prev, ...newFiles]);
    toast.success(`${selectedFiles.length} PDF(s) added`);
    e.target.value = '';
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setActiveRowId((cur) => (cur === id ? null : cur));
  }, []);

  const processFiles = useCallback(async () => {
    if (files.length === 0) {
      toast.error('Please add PDF files first');
      return;
    }

    const pendingSnapshot = files.filter((f) => f.status === 'pending');
    if (pendingSnapshot.length === 0) {
      toast.error('No pending files to process');
      return;
    }

    setUploading(true);
    let successCount = 0;
    let needsInputCount = 0;
    let failedCount = 0;

    for (const row of pendingSnapshot) {
      setFiles((prev) =>
        prev.map((f) => (f.id === row.id ? { ...f, status: 'processing' as const, message: undefined } : f))
      );

      try {
        const formData = new FormData();
        formData.append('cv', row.file);

        const envelope = await candidateService.bulkUploadCv(formData);

        if (!envelope.success) {
          const parsed = parseBulkFailurePayload(envelope);
          if (parsed.needsInput) {
            needsInputCount++;
            setFiles((prev) =>
              prev.map((f) =>
                f.id === row.id
                  ? {
                      ...f,
                      status: 'needs_input',
                      message: 'Needs input: add missing details',
                      missingFields: parsed.missing,
                      partial: parsed.partial,
                    }
                  : f
              )
            );
            setActiveRowId((cur) => cur ?? row.id);
          } else {
            failedCount++;
            setFiles((prev) =>
              prev.map((f) =>
                f.id === row.id
                  ? { ...f, status: 'failed', message: parsed.message || 'Failed to process' }
                  : f
              )
            );
          }
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.debug('[bulk-upload] envelope failure', { file: row.file.name, parsed });
          }
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }

        const candidate = envelope.data;
        if (!candidate?.id) {
          failedCount++;
          setFiles((prev) =>
            prev.map((f) =>
              f.id === row.id ? { ...f, status: 'failed', message: 'Unexpected response from server' } : f
            )
          );
        } else {
          successCount++;
          setFiles((prev) =>
            prev.map((f) =>
              f.id === row.id
                ? {
                    ...f,
                    status: 'success',
                    message: `Added: ${candidate.name}`,
                    candidateId: candidate.id,
                  }
                : f
            )
          );
        }
      } catch (error) {
        const parsed = parseBulkUploadFailure(error);
        if (parsed.needsInput) {
          needsInputCount++;
          setFiles((prev) =>
            prev.map((f) =>
              f.id === row.id
                ? {
                    ...f,
                    status: 'needs_input',
                    message: 'Needs input: add missing details',
                    missingFields: parsed.missing,
                    partial: parsed.partial,
                  }
                : f
            )
          );
          setActiveRowId((cur) => cur ?? row.id);
        } else {
          failedCount++;
          setFiles((prev) =>
            prev.map((f) =>
              f.id === row.id ? { ...f, status: 'failed', message: parsed.message || 'Failed to process' } : f
            )
          );
        }
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.debug('[bulk-upload] request error', { file: row.file.name, parsed, error });
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} candidate(s) added successfully!`);
      invalidateCandidateQueries();
    }
    if (needsInputCount > 0) {
      toast(`${needsInputCount} file(s) need more information`, { icon: 'ℹ️' });
    }
    if (failedCount > 0) {
      toast.error(`${failedCount} file(s) failed to process`);
    }
  }, [files, invalidateCandidateQueries]);

  const clearAll = useCallback(() => {
    setFiles([]);
    setActiveRowId(null);
  }, []);

  const openCompleteModal = useCallback((id: string) => {
    setActiveRowId(id);
  }, []);

  const handleModalClose = useCallback(() => {
    setActiveRowId(null);
  }, []);

  const handleModalSkip = useCallback(() => {
    setActiveRowId(null);
  }, []);

  const handleCreated = useCallback(
    (rowId: string, summary: { name: string; id: string }) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === rowId
            ? { ...f, status: 'success', message: `Added: ${summary.name}`, candidateId: summary.id }
            : f
        )
      );
      invalidateCandidateQueries();
    },
    [invalidateCandidateQueries]
  );

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const processingCount = files.filter((f) => f.status === 'processing').length;
  const successCount = files.filter((f) => f.status === 'success').length;
  const needsInputCount = files.filter((f) => f.status === 'needs_input').length;
  const failedCount = files.filter((f) => f.status === 'failed').length;

  return (
    <>
      <Header title="Bulk CV Upload" subtitle="Upload multiple CVs at once">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <FileText size={14} />
          <span>{files.length} file(s)</span>
        </div>
      </Header>

      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
            dragActive ? 'border-emerald bg-emerald/5' : 'border-glass-border bg-glass-white5 hover:border-emerald/50'
          }`}
        >
          <input
            type="file"
            id="file-upload"
            multiple
            accept=".pdf"
            onChange={handleFileInput}
            className="hidden"
          />

          <Upload size={48} className={`mx-auto mb-4 ${dragActive ? 'text-emerald' : 'text-gray-500'}`} />

          <h3 className="text-lg font-semibold text-gray-200 mb-2">
            {dragActive ? 'Drop PDF files here' : 'Upload CV PDFs'}
          </h3>

          <p className="text-sm text-gray-400 mb-4">Drag and drop PDF files or click to browse</p>

          <label
            htmlFor="file-upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald hover:bg-emerald/80 text-white rounded-lg cursor-pointer transition-colors text-sm font-medium"
          >
            <Upload size={16} />
            Select PDF Files
          </label>

          <p className="text-xs text-gray-500 mt-4">Supports multiple PDF files • Max 50 files at once</p>
        </div>

        {files.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-6">
            <div className="glass-surface p-4 rounded-lg border border-glass-border">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={14} className="text-gray-400" />
                <span className="text-xs text-gray-500">Pending</span>
              </div>
              <p className="text-2xl font-bold text-gray-200">{pendingCount}</p>
            </div>

            <div className="glass-surface p-4 rounded-lg border border-blue-500/30">
              <div className="flex items-center gap-2 mb-1">
                <Loader2 size={14} className="text-blue-400 animate-spin" />
                <span className="text-xs text-blue-400">Processing</span>
              </div>
              <p className="text-2xl font-bold text-blue-400">{processingCount}</p>
            </div>

            <div className="glass-surface p-4 rounded-lg border border-emerald/30">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={14} className="text-emerald" />
                <span className="text-xs text-emerald">Success</span>
              </div>
              <p className="text-2xl font-bold text-emerald">{successCount}</p>
            </div>

            <div className="glass-surface p-4 rounded-lg border border-amber-500/30">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={14} className="text-amber-400" />
                <span className="text-xs text-amber-400">Needs input</span>
              </div>
              <p className="text-2xl font-bold text-amber-400">{needsInputCount}</p>
            </div>

            <div className="glass-surface p-4 rounded-lg border border-red-500/30 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-1">
                <XCircle size={14} className="text-red-400" />
                <span className="text-xs text-red-400">Failed</span>
              </div>
              <p className="text-2xl font-bold text-red-400">{failedCount}</p>
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">Uploaded Files ({files.length})</h3>
              <div className="flex gap-2">
                <button
                  onClick={clearAll}
                  disabled={uploading}
                  className="px-3 py-1.5 text-xs bg-glass-white5 hover:bg-glass-white10 border border-glass-border rounded-lg transition-colors text-gray-400 disabled:opacity-50"
                >
                  Clear All
                </button>
                <button
                  onClick={processFiles}
                  disabled={uploading || pendingCount === 0}
                  className="px-4 py-1.5 text-xs bg-emerald hover:bg-emerald/80 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      Process {pendingCount} File(s)
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              <AnimatePresence>
                {files.map((fileData) => (
                  <motion.div
                    key={fileData.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="glass-surface p-4 rounded-lg border border-glass-border flex items-center gap-4"
                  >
                    <div className="flex-shrink-0">
                      {fileData.status === 'pending' && <FileText size={20} className="text-gray-400" />}
                      {fileData.status === 'processing' && (
                        <Loader2 size={20} className="text-blue-400 animate-spin" />
                      )}
                      {fileData.status === 'success' && <CheckCircle size={20} className="text-emerald" />}
                      {fileData.status === 'needs_input' && (
                        <AlertCircle size={20} className="text-amber-400" />
                      )}
                      {fileData.status === 'failed' && <XCircle size={20} className="text-red-400" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{fileData.file.name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <p className="text-xs text-gray-500">{(fileData.file.size / 1024).toFixed(1)} KB</p>
                        {fileData.message && (
                          <>
                            <span className="text-gray-600 hidden sm:inline">•</span>
                            <p
                              className={`text-xs ${
                                fileData.status === 'success'
                                  ? 'text-emerald'
                                  : fileData.status === 'failed'
                                    ? 'text-red-400'
                                    : fileData.status === 'needs_input'
                                      ? 'text-amber-400'
                                      : 'text-gray-400'
                              }`}
                            >
                              {fileData.message}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {fileData.status === 'needs_input' && (
                        <button
                          type="button"
                          onClick={() => openCompleteModal(fileData.id)}
                          className="px-2 py-1.5 text-xs rounded-lg border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 flex items-center gap-1"
                        >
                          <ClipboardPen size={14} />
                          Complete
                        </button>
                      )}
                      {fileData.status === 'pending' && !uploading && (
                        <button
                          type="button"
                          onClick={() => removeFile(fileData.id)}
                          className="p-2 hover:bg-glass-white10 rounded-lg transition-colors"
                          aria-label="Remove file"
                        >
                          <Trash2 size={16} className="text-gray-500" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-400 mb-1">How it works</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Upload multiple PDF CVs at once (up to 50 files)</li>
                <li>• Each file is processed independently; one failure does not block the rest</li>
                <li>• If the role cannot be inferred, you will see Needs input — open Complete to pick a position</li>
                <li>• New candidates start in INBOX; you can move them through the pipeline afterward</li>
                <li>• Processing takes roughly a few seconds per CV</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {activeRow && activeRow.status === 'needs_input' && (
        <CompleteCandidateModal
          open={!!activeRowId}
          fileName={activeRow.file.name}
          missingFields={activeRow.missingFields ?? ['position']}
          partial={activeRow.partial ?? {}}
          file={activeRow.file}
          onClose={handleModalClose}
          onSkip={handleModalSkip}
          onCreated={(summary) => handleCreated(activeRow.id, summary)}
        />
      )}
    </>
  );
}
