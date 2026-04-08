'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateService } from '@/services/candidate.service';
import Header from '@/components/layout/Header';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { formatDateTime, getStatusBadgeClass, getRatingStars } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import type { Candidate, CandidateFilters } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  Search, Plus, ChevronLeft, ChevronRight, Star, Archive,
  FileText, ExternalLink, Filter, X, ArrowUpDown, Download, Clock,
} from 'lucide-react';

export default function CandidatesPage() {
  const queryClient = useQueryClient();
  const { admin } = useAuthStore();
  const canEdit = admin?.role === 'SUPER_ADMIN' || admin?.role === 'HR_ADMIN';

  const [filters, setFilters] = useState<CandidateFilters>({
    page: 1, limit: 15, sortBy: 'createdAt', sortOrder: 'desc',
  });
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [bulkMoveStage, setBulkMoveStage] = useState('');

  // Form state for create
  const [form, setForm] = useState({
    name: '', email: '', phone: '', position: '', interviewDate: '',
    status: 'SCHEDULED', remarks: '', meetingRecording: '', meetingNotes: '',
    assessmentGiven: false, assessmentLink: '', completedLink: '', rating: '',
  });
  const [cvFile, setCvFile] = useState<File | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['candidates', filters, search],
    queryFn: () => candidateService.getAll({ ...filters, search: search || undefined }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => candidateService.toggleArchive(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['candidates'] }); toast.success('Candidate archived'); },
  });

  const shortlistMutation = useMutation({
    mutationFn: (id: string) => candidateService.toggleShortlist(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['candidates'] }); toast.success('Shortlist toggled'); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => candidateService.updateStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['candidates'] }); toast.success('Status updated'); },
  });

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => candidateService.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success('Candidate created');
      setShowCreate(false);
      setForm({ name: '', email: '', phone: '', position: '', interviewDate: '', status: 'SCHEDULED', remarks: '', meetingRecording: '', meetingNotes: '', assessmentGiven: false, assessmentLink: '', completedLink: '', rating: '' });
      setCvFile(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => candidateService.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success(`Deleted ${selectedIds.size} candidate(s)`);
      setSelectedIds(new Set());
      setShowBulkDeleteModal(false);
    },
    onError: () => toast.error('Failed to delete candidates'),
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => candidateService.updateStatus(id, 'REJECTED')));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success(`Rejected ${selectedIds.size} candidate(s)`);
      setSelectedIds(new Set());
    },
    onError: () => toast.error('Failed to reject candidates'),
  });

  const bulkMoveMutation = useMutation({
    mutationFn: async ({ ids, stage }: { ids: string[]; stage: string }) => {
      await Promise.all(ids.map(id => candidateService.updateStatus(id, stage)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success(`Moved ${selectedIds.size} candidate(s)`);
      setSelectedIds(new Set());
      setShowBulkMoveModal(false);
      setBulkMoveStage('');
    },
    onError: () => toast.error('Failed to move candidates'),
  });

  const handleCreate = () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) fd.append(k, String(v)); });
    if (cvFile) fd.append('cv', cvFile);
    createMutation.mutate(fd);
  };

  const candidates: Candidate[] = data?.data || [];
  const pagination = data?.meta;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  return (
    <>
      <Header title="Candidates" subtitle="Manage your interview pipeline">
        <button
          onClick={() => { candidateService.exportCsv({ ...filters, search: search || undefined }); toast.success('Exporting CSV...'); }}
          className="btn-outline flex items-center gap-2"
        >
          <Download size={16} /> Export CSV
        </button>
        {canEdit && (
          <button onClick={() => setShowCreate(!showCreate)} className="btn-highlight flex items-center gap-2">
            <Plus size={16} /> Add Candidate
          </button>
        )}
      </Header>

      <div className="p-8">
        {/* Search & Filters Bar */}
        <div className="flex items-center gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="input-field pl-10 max-w-md"
            />
          </form>
          <select
            value={filters.dateFrom ? (
              filters.dateFrom === new Date().toISOString().split('T')[0] ? 'TODAY' :
              'CUSTOM'
            ) : 'ALL'}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'ALL') {
                setFilters(prev => ({ ...prev, dateFrom: undefined, dateTo: undefined, page: 1 }));
              } else {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const days = val === 'TODAY' ? 0 : val === '3DAYS' ? 3 : val === '7DAYS' ? 7 : val === '30DAYS' ? 30 : 0;
                now.setDate(now.getDate() - days);
                setFilters(prev => ({ ...prev, dateFrom: now.toISOString().split('T')[0], dateTo: undefined, page: 1 }));
              }
            }}
            className="input-field w-auto text-xs"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="3DAYS">Past 3 Days</option>
            <option value="7DAYS">Past 7 Days</option>
            <option value="30DAYS">Past 30 Days</option>
          </select>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-outline flex items-center gap-2">
            <Filter size={16} /> Filters
          </button>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedIds.size > 0 && (
          <div className="glass-surface p-4 mb-6 flex items-center justify-between rounded-lg border border-emerald/20">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-200">{selectedIds.size} selected</span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkMoveModal(true)}
                className="btn-outline text-xs py-1.5 px-3"
              >
                Move to Stage
              </button>
              <button
                onClick={() => bulkRejectMutation.mutate(Array.from(selectedIds))}
                disabled={bulkRejectMutation.isPending}
                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                {bulkRejectMutation.isPending ? 'Rejecting...' : 'Reject'}
              </button>
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="card p-4 mb-6 flex flex-wrap items-center gap-4">
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || undefined, page: 1 }))}
              className="input-field w-auto"
            >
              <option value="">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="SHORTLISTED">Shortlisted</option>
              <option value="REJECTED">Rejected</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <input
              type="text"
              placeholder="Position..."
              value={filters.position || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, position: e.target.value || undefined, page: 1 }))}
              className="input-field w-auto max-w-[200px]"
            />
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined, page: 1 }))}
              className="input-field w-auto"
            />
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value || undefined, page: 1 }))}
              className="input-field w-auto"
            />
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setFilters(prev => ({ ...prev, sortBy, sortOrder: sortOrder as 'asc' | 'desc' }));
              }}
              className="input-field w-auto"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="interviewDate-asc">Interview Date ↑</option>
              <option value="interviewDate-desc">Interview Date ↓</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="rating-desc">Rating High</option>
              <option value="rating-asc">Rating Low</option>
            </select>
            <button
              onClick={() => setFilters({ page: 1, limit: 15, sortBy: 'createdAt', sortOrder: 'desc' })}
              className="text-sm text-gray-500 hover:text-primary"
            >
              <X size={16} /> Clear
            </button>
          </div>
        )}

        {/* Create Form Modal */}
        {showCreate && canEdit && (
          <div className="card p-6 mb-6 border-highlight/30 border-2">
            <h3 className="text-lg font-semibold mb-4">New Candidate</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <input placeholder="Full Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" />
              <input placeholder="Email *" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" />
              <input placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" />
              <input placeholder="Position *" value={form.position} onChange={e => setForm({...form, position: e.target.value})} className="input-field" />
              <input type="datetime-local" value={form.interviewDate} onChange={e => setForm({...form, interviewDate: e.target.value})} className="input-field" />
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="input-field">
                <option value="SCHEDULED">Scheduled</option>
                <option value="SHORTLISTED">Shortlisted</option>
                <option value="COMPLETED">Completed</option>
              </select>
              <input placeholder="Remarks" value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} className="input-field" />
              <input type="file" accept=".pdf,.doc,.docx" onChange={e => setCvFile(e.target.files?.[0] || null)} className="input-field" />
              <input type="number" min="1" max="5" placeholder="Rating (1-5)" value={form.rating} onChange={e => setForm({...form, rating: e.target.value})} className="input-field" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleCreate} disabled={createMutation.isPending} className="btn-primary">
                {createMutation.isPending ? 'Creating...' : 'Create Candidate'}
              </button>
              <button onClick={() => setShowCreate(false)} className="btn-outline">Cancel</button>
            </div>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="card p-6"><TableSkeleton rows={10} /></div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-glass-white5 border-b border-glass-border">
                    <th className="px-4 py-3 w-12">
                      <input
                        type="checkbox"
                        checked={candidates.length > 0 && selectedIds.size === candidates.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(new Set(candidates.map(c => c.id)));
                          } else {
                            setSelectedIds(new Set());
                          }
                        }}
                        className="w-4 h-4 rounded border-glass-border bg-stealth text-emerald focus:ring-emerald focus:ring-1"
                      />
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Position</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Received</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Interview</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Stage</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">AI</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">CV</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id} className="border-b border-glass-border hover:bg-glass-white5 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedIds);
                            if (e.target.checked) {
                              newSet.add(c.id);
                            } else {
                              newSet.delete(c.id);
                            }
                            setSelectedIds(newSet);
                          }}
                          className="w-4 h-4 rounded border-glass-border bg-stealth text-emerald focus:ring-emerald focus:ring-1"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/candidates/${c.id}`} className="font-medium text-gray-200 hover:text-emerald transition-colors">
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{c.email}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{c.position}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{c.interviewDate ? formatDateTime(c.interviewDate) : '—'}</td>
                      <td className="px-4 py-3">
                        {canEdit ? (
                          <select
                            value={c.status}
                            onChange={(e) => statusMutation.mutate({ id: c.id, status: e.target.value })}
                            className="text-[11px] px-2 py-1 rounded-full bg-stealth border border-glass-border text-eton cursor-pointer"
                          >
                            <option value="INBOX">Inbox</option>
                            <option value="ASSESSMENT">Assessment</option>
                            <option value="SCHEDULED">Scheduled</option>
                            <option value="INTERVIEW">Interview</option>
                            <option value="SHORTLISTED">Shortlisted</option>
                            <option value="HIRED">Hired</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        ) : (
                          <span className={getStatusBadgeClass(c.status)}>{c.status}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.aiScore ? (
                          <span className="badge-ai text-[10px]">AI {c.aiScore.toFixed(1)}</span>
                        ) : c.rating ? (
                          <span className="text-yellow-500 text-xs">{getRatingStars(c.rating)}</span>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {c.cvPath && (
                          <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/uploads/${c.cvPath}`} target="_blank" rel="noreferrer" className="text-emerald hover:underline">
                            <FileText size={16} />
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/dashboard/candidates/${c.id}`} className="p-1.5 rounded hover:bg-glass-white5 text-gray-500 hover:text-gray-200">
                            <ExternalLink size={14} />
                          </Link>
                          {canEdit && (
                            <>
                              <button onClick={() => shortlistMutation.mutate(c.id)} className="p-1.5 rounded hover:bg-emerald/10 text-gray-500 hover:text-emerald" title="Toggle Shortlist">
                                <Star size={14} />
                              </button>
                              <button onClick={() => archiveMutation.mutate(c.id)} className="p-1.5 rounded hover:bg-amber-500/10 text-gray-500 hover:text-amber-400" title="Archive">
                                <Archive size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {candidates.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">No candidates found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-glass-border">
                <span className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}
                    className="btn-outline py-1.5 px-3 text-xs disabled:opacity-30"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs font-medium text-gray-400">{pagination.page} / {pagination.totalPages}</span>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
                    className="btn-outline py-1.5 px-3 text-xs disabled:opacity-30"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bulk Delete Confirmation Modal */}
        {showBulkDeleteModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="glass-surface p-6 rounded-xl shadow-2xl border border-glass-border max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-100 mb-2">Delete {selectedIds.size} Candidate(s)</h3>
              <p className="text-sm text-gray-400 mb-6">
                Are you sure you want to delete {selectedIds.size} selected candidate(s)? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="btn-outline flex-1 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
                  disabled={bulkDeleteMutation.isPending}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Move Modal */}
        {showBulkMoveModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="glass-surface p-6 rounded-xl shadow-2xl border border-glass-border max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-100 mb-2">Move {selectedIds.size} Candidate(s)</h3>
              <p className="text-sm text-gray-400 mb-4">
                Select the stage to move {selectedIds.size} selected candidate(s) to:
              </p>
              <select
                value={bulkMoveStage}
                onChange={(e) => setBulkMoveStage(e.target.value)}
                className="input-field w-full mb-6"
              >
                <option value="">Select stage...</option>
                <option value="INBOX">Inbox</option>
                <option value="ASSESSMENT">Assessment</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="INTERVIEW">Interview</option>
                <option value="SHORTLISTED">Shortlisted</option>
                <option value="HIRED">Hired</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowBulkMoveModal(false);
                    setBulkMoveStage('');
                  }}
                  className="btn-outline flex-1 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => bulkMoveMutation.mutate({ ids: Array.from(selectedIds), stage: bulkMoveStage })}
                  disabled={bulkMoveMutation.isPending || !bulkMoveStage}
                  className="flex-1 btn-primary text-sm"
                >
                  {bulkMoveMutation.isPending ? 'Moving...' : 'Move All'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
