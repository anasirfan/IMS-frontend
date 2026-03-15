'use client';

import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import Header from '@/components/layout/Header';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { formatDateTime } from '@/lib/utils';
import { Activity } from 'lucide-react';

export default function ActivityPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: () => adminService.getActivityLogs(1, 100),
  });

  const logs = data?.data || [];

  const actionColors: Record<string, string> = {
    CREATE: 'text-emerald bg-emerald/10',
    UPDATE: 'text-blue-400 bg-blue-500/10',
    DELETE: 'text-red-400 bg-red-500/10',
    STATUS_CHANGE: 'text-purple-400 bg-purple-500/10',
    SHORTLIST_TOGGLE: 'text-yellow-400 bg-yellow-500/10',
    ARCHIVE: 'text-orange-400 bg-orange-500/10',
    RESTORE: 'text-teal-400 bg-teal-500/10',
  };

  return (
    <>
      <Header title="Activity Log" subtitle="Audit trail of all system actions" />
      <div className="p-8">
        {isLoading ? (
          <div className="glass-card p-6"><TableSkeleton rows={15} /></div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-glass-white5 border-b border-glass-border">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Details</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Admin</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Entity</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <tr key={log.id} className="border-b border-glass-border hover:bg-glass-white5 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`badge ${actionColors[log.action] || 'text-gray-400 bg-glass-white5'}`}>
                        {log.action?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{log.details || '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{log.admin?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{log.entity}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDateTime(log.createdAt)}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No activity logs yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
