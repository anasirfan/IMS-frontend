'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, X, MessageSquare, Calendar, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import api from '@/lib/axios';
import { formatDateTime } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'MESSAGE' | 'ASSESSMENT_REPLY' | 'INTERVIEW_SCHEDULED';
  title: string;
  message: string;
  candidate_id: string;
  candidate_name: string;
  is_read: number;
  created_at: string;
}

export default function NotificationBar() {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const queryClient = useQueryClient();
  
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Notification[] }>('/notifications');
      return data.data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
  
  const notifications = (notificationsData || []).filter(n => !dismissed.includes(n.id) && n.is_read === 0);
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'MESSAGE': return <MessageSquare size={16} className="text-blue-400" />;
      case 'ASSESSMENT_REPLY': return <CheckCircle size={16} className="text-emerald" />;
      case 'INTERVIEW_SCHEDULED': return <Calendar size={16} className="text-purple-400" />;
      default: return <Bell size={16} className="text-gray-400" />;
    }
  };
  
  const handleDismiss = async (id: string) => {
    setDismissed([...dismissed, id]);
    try {
      await api.post(`/notifications/${id}/mark-read`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };
  
  if (notifications.length === 0) return null;
  
  return (
    <div className="fixed top-4 left-60 right-4 z-50 pointer-events-none">
      <div className="space-y-3 pointer-events-auto">
        <AnimatePresence>
          {notifications.slice(0, 3).map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              className="bg-gradient-to-r from-stealth-400 to-stealth-300 border-2 border-emerald/30 rounded-xl p-4 shadow-2xl max-w-md ml-auto backdrop-blur-xl"
              style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(52, 211, 153, 0.1)' }}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-2 rounded-lg bg-emerald/10 border border-emerald/20">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-gray-100">{notification.title}</h4>
                  <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">{notification.message}</p>
                  <span className="text-[10px] text-gray-500 mt-2 block font-medium">
                    {formatDateTime(notification.created_at)}
                  </span>
                </div>
                <button
                  onClick={() => handleDismiss(notification.id)}
                  className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                >
                  <X size={16} className="text-gray-400 hover:text-red-400" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
