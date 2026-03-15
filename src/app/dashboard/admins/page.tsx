'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import Header from '@/components/layout/Header';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Plus, Shield } from 'lucide-react';

export default function AdminsPage() {
  const queryClient = useQueryClient();
  const { admin } = useAuthStore();
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'HR_ADMIN' });

  const { data, isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: () => adminService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => adminService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast.success('Admin created');
      setShowCreate(false);
      setForm({ name: '', email: '', password: '', role: 'HR_ADMIN' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create admin'),
  });

  const admins = data?.data || [];
  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'bg-red-500/10 text-red-400 border-red-500/20',
    HR_ADMIN: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    INTERVIEWER: 'bg-glass-white5 text-gray-400 border-glass-border',
  };

  return (
    <>
      <Header title="Team" subtitle="Manage system administrators">
        {isSuperAdmin && (
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Admin
          </button>
        )}
      </Header>

      <div className="p-8">
        {showCreate && isSuperAdmin && (
          <div className="glass-card p-6 mb-6 border-emerald/20 border">
            <h3 className="text-lg font-semibold mb-4">New Admin</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <input placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" />
              <input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" />
              <input type="password" placeholder="Password (min 6)" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input-field" />
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="input-field">
                <option value="HR_ADMIN">HR Admin</option>
                <option value="INTERVIEWER">Interviewer</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="btn-primary">
                {createMutation.isPending ? 'Creating...' : 'Create Admin'}
              </button>
              <button onClick={() => setShowCreate(false)} className="btn-outline">Cancel</button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="glass-card p-6"><TableSkeleton rows={5} /></div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-glass-white5 border-b border-glass-border">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Created</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a: any) => (
                  <tr key={a.id} className="border-b border-glass-border hover:bg-glass-white5 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-200 flex items-center gap-2">
                      <Shield size={14} className="text-gray-500" /> {a.name}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{a.email}</td>
                    <td className="px-4 py-3">
                      <span className={`badge border ${roleColors[a.role] || ''}`}>
                        {a.role?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(a.createdAt)}</td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
