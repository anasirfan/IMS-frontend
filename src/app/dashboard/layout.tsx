'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/layout/Sidebar';
import NotificationBar from '@/components/layout/NotificationBar';
import { Menu, Zap } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <NotificationBar />

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-stealth-card/80 backdrop-blur-md border-b border-glass-border">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-glass-white5 text-gray-300 transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald/20 flex items-center justify-center">
            <Zap size={12} className="text-emerald" />
          </div>
          <span className="text-sm font-bold text-gray-100">Limi Stealth</span>
        </div>
      </div>

      <main className="lg:ml-56 min-h-screen">{children}</main>
    </div>
  );
}
