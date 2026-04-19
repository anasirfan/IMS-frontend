'use client';

import NotificationDropdown from './NotificationDropdown';

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function Header({ title, subtitle, children }: HeaderProps) {
  return (
    <header className="bg-stealth-card/50 backdrop-blur-md border-b border-glass-border px-4 md:px-8 py-3 md:py-4 sticky top-0 z-30 lg:z-40">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-semibold text-gray-100 truncate">{title}</h1>
          {subtitle && <p className="text-[11px] md:text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <NotificationDropdown />
          {children}
        </div>
      </div>
    </header>
  );
}
