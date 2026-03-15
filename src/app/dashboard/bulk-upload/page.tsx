'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, XCircle, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface UploadedFile {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  message?: string;
  candidateId?: string;
}

export default function BulkUploadPage() {
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

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

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    );

    if (droppedFiles.length === 0) {
      toast.error('Please upload only PDF files');
      return;
    }

    const newFiles: UploadedFile[] = droppedFiles.map(file => ({
      file,
      status: 'pending'
    }));

    setFiles(prev => [...prev, ...newFiles]);
    toast.success(`${droppedFiles.length} PDF(s) added`);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files).filter(
      file => file.type === 'application/pdf'
    );

    if (selectedFiles.length === 0) {
      toast.error('Please upload only PDF files');
      return;
    }

    const newFiles: UploadedFile[] = selectedFiles.map(file => ({
      file,
      status: 'pending'
    }));

    setFiles(prev => [...prev, ...newFiles]);
    toast.success(`${selectedFiles.length} PDF(s) added`);
    e.target.value = '';
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const processFiles = useCallback(async () => {
    if (files.length === 0) {
      toast.error('Please add PDF files first');
      return;
    }

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue;

      // Update status to processing
      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'processing' } : f
      ));

      try {
        const formData = new FormData();
        formData.append('cv', files[i].file);

        const response = await fetch('http://69.62.125.138:5041/api/candidates/bulk-upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: formData
        });

        const result = await response.json();

        if (result.success) {
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { 
              ...f, 
              status: 'success', 
              message: `Added: ${result.data.name}`,
              candidateId: result.data.id
            } : f
          ));
          successCount++;
        } else {
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { 
              ...f, 
              status: 'error', 
              message: result.message || 'Failed to process'
            } : f
          ));
          errorCount++;
        }
      } catch (error) {
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { 
            ...f, 
            status: 'error', 
            message: 'Network error'
          } : f
        ));
        errorCount++;
      }

      // Small delay between uploads to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setUploading(false);
    
    if (successCount > 0) {
      toast.success(`${successCount} candidate(s) added successfully!`);
      queryClient.invalidateQueries({ queryKey: ['board-candidates'] });
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} file(s) failed to process`);
    }
  }, [files, queryClient]);

  const clearAll = useCallback(() => {
    setFiles([]);
  }, []);

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const processingCount = files.filter(f => f.status === 'processing').length;
  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <>
      <Header title="Bulk CV Upload" subtitle="Upload multiple CVs at once">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <FileText size={14} />
          <span>{files.length} file(s)</span>
        </div>
      </Header>

      <div className="p-6 max-w-6xl mx-auto">
        {/* Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
            dragActive
              ? 'border-emerald bg-emerald/5'
              : 'border-glass-border bg-glass-white5 hover:border-emerald/50'
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
          
          <p className="text-sm text-gray-400 mb-4">
            Drag and drop PDF files or click to browse
          </p>
          
          <label
            htmlFor="file-upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald hover:bg-emerald/80 text-white rounded-lg cursor-pointer transition-colors text-sm font-medium"
          >
            <Upload size={16} />
            Select PDF Files
          </label>
          
          <p className="text-xs text-gray-500 mt-4">
            Supports multiple PDF files • Max 50 files at once
          </p>
        </div>

        {/* Stats */}
        {files.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mt-6">
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
            
            <div className="glass-surface p-4 rounded-lg border border-red-500/30">
              <div className="flex items-center gap-2 mb-1">
                <XCircle size={14} className="text-red-400" />
                <span className="text-xs text-red-400">Failed</span>
              </div>
              <p className="text-2xl font-bold text-red-400">{errorCount}</p>
            </div>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">
                Uploaded Files ({files.length})
              </h3>
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
                {files.map((fileData, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="glass-surface p-4 rounded-lg border border-glass-border flex items-center gap-4"
                  >
                    <div className="flex-shrink-0">
                      {fileData.status === 'pending' && (
                        <FileText size={20} className="text-gray-400" />
                      )}
                      {fileData.status === 'processing' && (
                        <Loader2 size={20} className="text-blue-400 animate-spin" />
                      )}
                      {fileData.status === 'success' && (
                        <CheckCircle size={20} className="text-emerald" />
                      )}
                      {fileData.status === 'error' && (
                        <XCircle size={20} className="text-red-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">
                        {fileData.file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-500">
                          {(fileData.file.size / 1024).toFixed(1)} KB
                        </p>
                        {fileData.message && (
                          <>
                            <span className="text-gray-600">•</span>
                            <p className={`text-xs ${
                              fileData.status === 'success' ? 'text-emerald' :
                              fileData.status === 'error' ? 'text-red-400' :
                              'text-gray-400'
                            }`}>
                              {fileData.message}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {fileData.status === 'pending' && !uploading && (
                      <button
                        onClick={() => removeFile(index)}
                        className="p-2 hover:bg-glass-white10 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} className="text-gray-500" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-400 mb-1">How it works</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Upload multiple PDF CVs at once (up to 50 files)</li>
                <li>• AI will automatically extract name, email, phone, position, and other details</li>
                <li>• All candidates will be added to the INBOX stage</li>
                <li>• You can review and move them through the pipeline</li>
                <li>• Processing takes ~5-10 seconds per CV</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
