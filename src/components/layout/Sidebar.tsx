'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Kanban,
  Archive,
  Shield,
  Activity,
  LogOut,
  Zap,
  Clock,
  MessageSquare,
  FileText,
  Calendar,
  Upload,
  Settings,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/auth.service';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/board', label: 'Pipeline', icon: Kanban },
  { href: '/dashboard/candidates', label: 'Candidates', icon: Zap },
  { href: '/dashboard/bulk-upload', label: 'Bulk Upload', icon: Upload, roles: ['SUPER_ADMIN', 'HR_ADMIN'] },
  { href: '/dashboard/scheduled', label: 'Scheduled', icon: Calendar },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  { href: '/dashboard/automation', label: 'Automation', icon: Settings, roles: ['SUPER_ADMIN', 'HR_ADMIN'] },
  { href: '/dashboard/archive', label: 'Archive', icon: Archive },
  { href: '/dashboard/logs', label: 'Logs', icon: FileText, roles: ['SUPER_ADMIN', 'HR_ADMIN'] },
  { href: '/dashboard/cron-logs', label: 'Cron Jobs', icon: Clock, roles: ['SUPER_ADMIN', 'HR_ADMIN'] },
  { href: '/dashboard/admins', label: 'Team', icon: Shield, roles: ['SUPER_ADMIN', 'HR_ADMIN'] },
  { href: '/dashboard/activity', label: 'Activity', icon: Activity, roles: ['SUPER_ADMIN', 'HR_ADMIN'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, clearAuth } = useAuthStore();

  // Fetch unread message count
  const { data: unreadData } = useQuery({
    queryKey: ['unread-messages'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { count: number } }>('/messages/unread-count');
      return data.data;
    },
    refetchInterval: 120000, // 2 minutes // Refresh every 10 seconds
  });

  const unreadCount = unreadData?.count || 0;

  const handleLogout = async () => {
    try { await authService.logout(); } catch {}
    clearAuth();
    toast.success('Signed out');
    router.push('/auth/login');
  };

  const filteredNav = navItems.filter((item) => {
    if (!item.roles) return true;
    return admin?.role && item.roles.includes(admin.role);
  });

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-stealth-400/80 backdrop-blur-xl border-r border-glass-border flex flex-col z-50">
      <div className="px-5 py-5 border-b border-glass-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald/20 flex items-center justify-center">
            <Zap size={16} className="text-emerald" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-gray-100">Limi Stealth</h1>
            <p className="text-[10px] text-gray-500 font-medium tracking-widest uppercase">IMS</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 relative',
                isActive
                  ? 'bg-emerald/10 text-emerald border border-emerald/15 shadow-glow-sm'
                  : 'text-gray-400 hover:bg-glass-white5 hover:text-gray-200 border border-transparent'
              )}
            >
              <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
              {item.label}
              {item.href === '/dashboard/messages' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-2.5 border-t border-glass-border">
        <div className="glass-surface px-3 py-2.5 mb-2">
          <p className="text-xs font-medium text-gray-200 truncate">{admin?.name || 'Admin'}</p>
          <p className="text-[10px] text-gray-500 truncate mt-0.5">{admin?.email}</p>
          <span className="inline-block mt-1.5 text-[9px] px-1.5 py-0.5 rounded bg-emerald/10 text-emerald font-semibold tracking-wider uppercase">
            {admin?.role?.replace('_', ' ')}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 w-full"
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
