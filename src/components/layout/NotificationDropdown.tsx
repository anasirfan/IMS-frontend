'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, X, MessageSquare, Calendar, CheckCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import api from '@/lib/axios';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';

interface Notification {
  id: string;
  type: 'MESSAGE' | 'ASSESSMENT_REPLY' | 'INTERVIEW_SCHEDULED';
  title: string;
  message: string;
  candidateId: string | null;
  candidateName: string | null;
  isRead: number;
  createdAt: string;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Notification[] }>('/notifications');
      return data.data;
    },
    refetchInterval: 120000, // 2 minutes
  });
  
  const allNotifications = notificationsData || [];
  const unreadCount = allNotifications.filter(n => n.isRead === 0).length;
  
  // Sort by createdAt descending and take last 10
  const notifications = [...allNotifications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'MESSAGE': return <MessageSquare size={16} className="text-blue-400" />;
      case 'ASSESSMENT_REPLY': return <CheckCircle size={16} className="text-emerald" />;
      case 'INTERVIEW_SCHEDULED': return <Calendar size={16} className="text-purple-400" />;
      default: return <Bell size={16} className="text-gray-400" />;
    }
  };
  
  const handleMarkAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/mark-read`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };
  
  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => n.isRead === 0);
      await Promise.all(
        unreadNotifications.map(n => api.post(`/notifications/${n.id}/mark-read`))
      );
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-glass-white10 rounded-lg transition-colors"
      >
        <Bell size={20} className="text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-96 max-h-[500px] overflow-hidden bg-stealth-400 border border-glass-border rounded-xl shadow-2xl z-[9999]"
          >
            {/* Header */}
            <div className="p-4 border-b border-glass-border flex items-center justify-between sticky top-0 bg-stealth-400/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-emerald" />
                <h3 className="text-sm font-semibold text-gray-200">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/30 rounded-full text-[10px] font-bold text-red-400">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-emerald hover:text-emerald/80 font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>
            
            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={32} className="mx-auto mb-3 text-gray-600 opacity-50" />
                  <p className="text-sm text-gray-500">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-glass-border">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-glass-white5 transition-colors ${
                        notification.isRead === 0 ? 'bg-emerald/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-2 rounded-lg bg-glass-white10 border border-glass-border flex-shrink-0">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-gray-200 leading-tight">
                              {notification.title}
                            </h4>
                            {notification.isRead === 0 && (
                              <div className="w-2 h-2 rounded-full bg-emerald flex-shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-600">
                              {formatDateTime(notification.createdAt)}
                            </span>
                            <div className="flex items-center gap-1">
                              {notification.candidateId && (
                                <Link
                                  href={`/dashboard/candidates/${notification.candidateId}`}
                                  onClick={() => setIsOpen(false)}
                                  className="text-[10px] text-emerald hover:text-emerald/80 font-medium"
                                >
                                  View
                                </Link>
                              )}
                              {notification.isRead === 0 && (
                                <button
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  className="p-1 hover:bg-glass-white10 rounded transition-colors"
                                  title="Mark as read"
                                >
                                  <CheckCircle size={12} className="text-gray-500" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-glass-border bg-stealth-400/95 backdrop-blur-sm">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // Could navigate to a full notifications page if you create one
                  }}
                  className="w-full text-xs text-center text-gray-400 hover:text-emerald transition-colors font-medium"
                >
                  View all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
