'use client';

import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/layout/Sidebar';
import NotificationBar from '@/components/layout/NotificationBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth(true);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stealth-300 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald/20 border-t-emerald rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-stealth-300">
      <Sidebar />
      <NotificationBar />
      <main className="ml-56 min-h-screen">{children}</main>
    </div>
  );
}
