'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateService } from '@/services/candidate.service';
import Header from '@/components/layout/Header';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { formatDateTime, getStatusBadgeClass } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { RotateCcw, ExternalLink, Search, Download } from 'lucide-react';

export default function ArchivePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['archived-candidates', search],
    queryFn: () => candidateService.getAll({ archived: true, search: search || undefined, limit: 50 }),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => candidateService.toggleArchive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast.success('Candidate restored');
    },
  });

  const candidates = data?.data || [];

  return (
    <>
      <Header title="Archive" subtitle="Archived candidates can be restored to the active pipeline">
        <button
          onClick={() => { candidateService.exportCsv({ archived: true, search: search || undefined }); toast.success('Exporting archived CSV...'); }}
          className="btn-outline flex items-center gap-2"
        >
          <Download size={16} /> Export CSV
        </button>
      </Header>
      <div className="p-8">
        <div className="mb-6 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search archived candidates..."
            className="input-field pl-10"
          />
        </div>

        {isLoading ? (
          <div className="card p-6"><TableSkeleton rows={8} /></div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Position</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Interview</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c: any) => (
                  <tr key={c.id} className="border-b border-glass-border hover:bg-glass-white5 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-200">{c.name}</td>
                    <td className="px-4 py-3 text-gray-400">{c.email}</td>
                    <td className="px-4 py-3 text-gray-400">{c.position}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.interviewDate ? formatDateTime(c.interviewDate) : '—'}</td>
                    <td className="px-4 py-3"><span className={getStatusBadgeClass(c.status)}>{c.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => restoreMutation.mutate(c.id)}
                          className="p-1.5 rounded hover:bg-highlight/10 text-gray-500 hover:text-highlight" title="Restore">
                          <RotateCcw size={14} />
                        </button>
                        <Link href={`/dashboard/candidates/${c.id}`}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-primary">
                          <ExternalLink size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {candidates.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No archived candidates</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
