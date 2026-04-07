'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/layout/Header';
import { formatDateTime } from '@/lib/utils';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Mail, User, Clock, ExternalLink, CheckCircle, AlertCircle, Sparkles, Loader2, Search, UserCircle } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  candidateId: string;
  gmailMessageId: string;
  direction: 'SENT' | 'RECEIVED';
  subject: string;
  body: string;
  isRead: number;
  createdAt: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  position: string;
  status: string;
  round_stage: string;
  unreadCount?: number;
  lastMessageDate?: string;
}

interface ConversationData {
  candidate: Candidate;
  messages: Message[];
}

// Helper function to detect link types in messages
const detectLinkTypes = (messages: Message[]) => {
  const links = {
    github: false,
    loom: false,
    vercel: false,
    netlify: false,
    drive: false
  };
  
  messages.forEach(msg => {
    const body = msg.body.toLowerCase();
    if (body.includes('github.com')) links.github = true;
    if (body.includes('loom.com')) links.loom = true;
    if (body.includes('vercel.app') || body.includes('vercel.com')) links.vercel = true;
    if (body.includes('netlify.app') || body.includes('netlify.com')) links.netlify = true;
    if (body.includes('drive.google.com') || body.includes('docs.google.com')) links.drive = true;
  });
  
  return links;
};

export default function MessagesPage() {
  const queryClient = useQueryClient();
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryTab, setCategoryTab] = useState<string>('ALL');
  const [readFilter, setReadFilter] = useState<'all' | 'unread'>('all');
  const [messageFilter, setMessageFilter] = useState<'all' | 'links'>('all');

  // Fetch all candidates with messages
  const { data: candidatesData, isLoading: candidatesLoading } = useQuery<Candidate[]>({
    queryKey: ['candidates-with-messages'],
    queryFn: async () => {
      const response = await api.get('/messages/candidates');
      return Array.isArray(response.data) ? response.data : response.data.data;
    },
    refetchInterval: 120000, // 2 minutes
  });

  // Fetch conversation for selected candidate
  const { data: conversationData, isLoading: conversationLoading } = useQuery<ConversationData | null>({
    queryKey: ['conversation', selectedCandidateId],
    queryFn: async () => {
      if (!selectedCandidateId) return null;
      const response = await api.get(`/messages/conversation/${selectedCandidateId}`);
      return Array.isArray(response.data) ? response.data : response.data.data;
    },
    enabled: !!selectedCandidateId,
    refetchInterval: 120000, // 2 minutes
  });

  const candidates = candidatesData || [];

  const categories = [
    { key: 'ALL', label: 'All' },
    { key: 'INBOX', label: 'Inbox' },
    { key: 'ASSESSMENT', label: 'Assessment' },
    { key: 'SCHEDULED', label: 'Scheduled' },
    { key: 'INTERVIEW', label: 'Interview' },
    { key: 'SHORTLISTED', label: 'Shortlisted' },
    { key: 'HIRED', label: 'Hired' },
    { key: 'REJECTED', label: 'Rejected' },
  ];

  // Count per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { total: number; unread: number }> = {};
    categories.forEach(c => { counts[c.key] = { total: 0, unread: 0 }; });
    candidates.forEach(c => {
      const stage = (c.round_stage || 'INBOX').toUpperCase();
      counts['ALL'].total++;
      if ((c.unreadCount || 0) > 0) counts['ALL'].unread++;
      if (counts[stage]) {
        counts[stage].total++;
        if ((c.unreadCount || 0) > 0) counts[stage].unread++;
      }
    });
    return counts;
  }, [candidates]);

  // Filter candidates based on category, read filter, and search
  const filteredCandidates = useMemo(() => {
    let filtered = candidates;

    // Apply category filter
    if (categoryTab !== 'ALL') {
      filtered = filtered.filter(c => (c.round_stage || 'INBOX').toUpperCase() === categoryTab);
    }

    // Apply read filter
    if (readFilter === 'unread') {
      filtered = filtered.filter(c => (c.unreadCount || 0) > 0);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.email.toLowerCase().includes(query)
      );
    }

    // Sort by latest message date (most recent first)
    filtered.sort((a, b) => {
      const dateA = a.lastMessageDate ? new Date(a.lastMessageDate).getTime() : 0;
      const dateB = b.lastMessageDate ? new Date(b.lastMessageDate).getTime() : 0;
      return dateB - dateA;
    });

    return filtered;
  }, [candidates, searchQuery, categoryTab, readFilter]);

  
  const conversation = conversationData;
  
  // Filter messages based on message filter (links vs all)
  const filteredMessages = useMemo(() => {
    if (!conversation?.messages) return [];
    
    if (messageFilter === 'links') {
      // Messages with links (Vercel, Netlify, Drive, GitHub, Loom)
      return conversation.messages.filter(msg => {
        const body = msg.body.toLowerCase();
        return body.includes('vercel.app') || 
          body.includes('netlify.app') || 
          body.includes('drive.google.com') ||
          body.includes('docs.google.com') ||
          body.includes('github.com') ||
          body.includes('loom.com') ||
          body.match(/https?:\/\/[^\s]+/);
      });
    }
    return conversation.messages;
  }, [conversation?.messages, messageFilter]);
  
  
  // Get link tags for a candidate's conversation
  const getLinkTags = (candidateId: string) => {
    if (conversationData && conversationData.candidate.id === candidateId) {
      return detectLinkTypes(conversationData.messages);
    }
    return { github: false, loom: false, vercel: false, netlify: false, drive: false };
  };

  const getUnreadCount = (candidateId: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    return candidate?.unreadCount || 0;
  };

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (selectedCandidateId && conversation?.messages && conversation.messages.length > 0) {
      const hasUnread = conversation.messages.some(m => m.direction === 'RECEIVED' && m.isRead === 0);
      if (hasUnread) {
        console.log('[Messages] Marking messages as read for candidate:', selectedCandidateId);
        api.post(`/messages/mark-read/${selectedCandidateId}`)
          .then(() => {
            console.log('[Messages] Messages marked as read, invalidating queries');
            queryClient.invalidateQueries({ queryKey: ['conversation', selectedCandidateId] });
            queryClient.invalidateQueries({ queryKey: ['candidates-with-messages'] });
            queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
          })
          .catch(err => console.error('[Messages] Failed to mark as read:', err));
      }
    }
  }, [selectedCandidateId, conversation?.messages?.length, queryClient]);

  return (
    <>
      <Header title="Messages" subtitle="Candidate email conversations">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <MessageSquare size={14} />
          <span>{candidates.length} conversations</span>
        </div>
      </Header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Candidates List - Left Sidebar */}
        <div className="w-80 border-r border-glass-border bg-stealth-400/50 overflow-y-auto">
          <div className="p-4 border-b border-glass-border space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-200">Conversations</h3>
              <p className="text-xs text-gray-500 mt-1">{candidates.length} candidates</p>
            </div>
            
            {/* Category Tabs */}
            <div className="flex gap-1 flex-wrap">
              {categories.map(cat => {
                const count = categoryCounts[cat.key];
                const isActive = categoryTab === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setCategoryTab(cat.key)}
                    className={`px-2 py-1 text-[10px] font-medium rounded-lg transition-colors border ${
                      isActive
                        ? 'bg-emerald/20 text-emerald border-emerald/30'
                        : 'text-gray-500 hover:text-gray-300 border-transparent hover:border-glass-border'
                    }`}
                  >
                    {cat.label}
                    {count && count.total > 0 && (
                      <span className="ml-1 opacity-70">
                        {count.total}{count.unread > 0 && <span className="text-emerald"> •{count.unread}</span>}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* All / Unread Toggle */}
            <div className="flex gap-1 p-0.5 bg-glass-white5 rounded-lg">
              <button
                onClick={() => setReadFilter('all')}
                className={`flex-1 px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                  readFilter === 'all'
                    ? 'bg-emerald/20 text-emerald'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setReadFilter('unread')}
                className={`flex-1 px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                  readFilter === 'unread'
                    ? 'bg-emerald/20 text-emerald'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Unread ({categoryCounts[categoryTab]?.unread || 0})
              </button>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full bg-glass-white5 border border-glass-border rounded-lg pl-9 pr-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald/50"
              />
            </div>
          </div>

          {candidatesLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">{searchQuery ? 'No matching conversations' : 'No conversations yet'}</p>
            </div>
          ) : (
            <div className="divide-y divide-glass-border">
              {filteredCandidates.map((candidate) => (
                <motion.button
                  key={candidate.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setSelectedCandidateId(candidate.id)}
                  className={`w-full p-4 text-left transition-colors ${
                    selectedCandidateId === candidate.id
                      ? 'bg-emerald/10 border-l-2 border-emerald'
                      : 'hover:bg-glass-white5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Link
                      href={`/dashboard/candidates/${candidate.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-10 h-10 rounded-full bg-emerald/20 flex items-center justify-center flex-shrink-0 hover:bg-emerald/30 transition-colors group/avatar"
                      title="View profile"
                    >
                      <User size={18} className="text-emerald group-hover/avatar:hidden" />
                      <UserCircle size={18} className="text-emerald hidden group-hover/avatar:block" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-200 truncate">
                          {candidate.name}
                        </h4>
                        {getUnreadCount(candidate.id) > 0 && (
                          <div className="px-1.5 py-0.5 rounded-full bg-emerald/20 text-emerald text-[10px] font-bold">
                            {getUnreadCount(candidate.id)}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{candidate.position}</p>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-glass-white10 text-gray-400">
                          {candidate.round_stage}
                        </span>
                        {selectedCandidateId === candidate.id && (() => {
                          const tags = getLinkTags(candidate.id);
                          return (
                            <>
                              {tags.github && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300" title="Contains GitHub link">
                                  GitHub
                                </span>
                              )}
                              {tags.loom && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300" title="Contains Loom link">
                                  Loom
                                </span>
                              )}
                              {tags.vercel && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300" title="Contains Vercel link">
                                  Vercel
                                </span>
                              )}
                              {tags.netlify && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300" title="Contains Netlify link">
                                  Netlify
                                </span>
                              )}
                              {tags.drive && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300" title="Contains Google Drive link">
                                  Drive
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Conversation View - Right Side */}
        <div className="flex-1 flex flex-col">
          {!selectedCandidateId ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-sm">Select a conversation to view messages</p>
              </div>
            </div>
          ) : conversationLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald mx-auto mb-4" />
                <p className="text-sm text-gray-500">Loading conversation...</p>
              </div>
            </div>
          ) : !conversation ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <p className="text-sm">No messages found</p>
            </div>
          ) : (
            <>
              {/* Conversation Header */}
              <div className="border-b border-glass-border bg-stealth-400/50">
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald/20 flex items-center justify-center">
                      <User size={18} className="text-emerald" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-200">{conversation.candidate.name}</h3>
                      <p className="text-xs text-gray-500">{conversation.candidate.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded bg-glass-white10 text-gray-400">
                        {conversation.candidate.round_stage}
                      </span>
                      <Link
                        href={`/dashboard/candidates/${conversation.candidate.id}`}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-glass-white5 hover:bg-emerald/10 border border-glass-border hover:border-emerald/30 rounded-lg text-gray-400 hover:text-emerald transition-colors"
                      >
                        <UserCircle size={12} />
                        Profile
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Message Filter Toggle */}
                <div className="flex gap-2 px-4 pb-3">
                  <button
                    onClick={() => setMessageFilter('all')}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      messageFilter === 'all'
                        ? 'bg-emerald/20 text-emerald border border-emerald/30'
                        : 'bg-glass-white5 text-gray-500 hover:text-gray-300 border border-glass-border'
                    }`}
                  >
                    All Messages ({conversation.messages.length})
                  </button>
                  <button
                    onClick={() => setMessageFilter('links')}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      messageFilter === 'links'
                        ? 'bg-emerald/20 text-emerald border border-emerald/30'
                        : 'bg-glass-white5 text-gray-500 hover:text-gray-300 border border-glass-border'
                    }`}
                  >
                    With Links ({conversation.messages.filter(m => {
                      const body = m.body.toLowerCase();
                      return body.includes('vercel.app') || 
                        body.includes('netlify.app') || 
                        body.includes('drive.google.com') ||
                        body.includes('docs.google.com') ||
                        body.includes('github.com') ||
                        body.includes('loom.com') ||
                        body.match(/https?:\/\/[^\s]+/);
                    }).length})
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Mail size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {messageFilter === 'links' ? 'No messages with links' : 'No messages in this conversation'}
                    </p>
                  </div>
                ) : (
                  [...filteredMessages].reverse().map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex ${message.direction === 'SENT' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-2xl ${
                          message.direction === 'SENT'
                            ? 'bg-emerald/10 border-emerald/20'
                            : 'bg-glass-white10 border-glass-border'
                        } border rounded-lg p-4`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {message.direction === 'SENT' ? (
                            <Send size={12} className="text-emerald" />
                          ) : (
                            <Mail size={12} className="text-blue-400" />
                          )}
                          <span className="text-xs font-medium text-gray-400">
                            {message.direction === 'SENT' ? 'You sent' : 'Received'}
                          </span>
                          <span className="text-xs text-gray-600">•</span>
                          <Clock size={10} className="text-gray-600" />
                          <span className="text-xs text-gray-600">
                            {formatDateTime(message.createdAt)}
                          </span>
                        </div>

                        {message.subject && (
                          <h4 className="text-sm font-semibold text-gray-200 mb-2">
                            {message.subject}
                          </h4>
                        )}

                        <div className="text-sm text-gray-300 whitespace-pre-wrap">
                          {message.body}
                        </div>

                        {/* Detect links in message */}
                        {message.body.match(/https?:\/\/[^\s]+/g) && (
                          <div className="mt-3 pt-3 border-t border-glass-border">
                            <div className="flex items-center gap-2 text-xs text-emerald">
                              <ExternalLink size={12} />
                              <span>Contains link(s)</span>
                              {message.direction === 'RECEIVED' && (
                                <CheckCircle size={12} className="ml-2" />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Reply Input Section */}
              {conversation && (
                <div className="border-t border-glass-border bg-stealth-400/50 p-4">
                  <div className="space-y-3">
                    <div className="relative">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Reply to ${conversation.candidate.name}...`}
                        rows={4}
                        className="w-full bg-glass-white5 border border-glass-border rounded-lg px-4 py-3 pr-12 text-sm text-gray-200 resize-none focus:outline-none focus:border-emerald/50"
                      />
                      <button
                        onClick={async () => {
                          if (!conversation) return;
                          setGeneratingAI(true);
                          try {
                            const lastMessage = conversation.messages.filter(m => m.direction === 'RECEIVED').pop();
                            const response = await api.post('/ai/generate-reply', {
                              candidateName: conversation.candidate.name,
                              candidateMessage: lastMessage?.body || '',
                              context: `Position: ${conversation.candidate.position}, Stage: ${conversation.candidate.round_stage}`
                            });
                            if (response.data.success) {
                              setReplyText(response.data.data.reply);
                              toast.success('AI reply generated!');
                            }
                          } catch (error) {
                            toast.error('Failed to generate AI reply');
                          } finally {
                            setGeneratingAI(false);
                          }
                        }}
                        disabled={generatingAI}
                        className="absolute bottom-3 right-3 p-2 bg-amber-500/20 hover:bg-amber-500/30 disabled:bg-gray-600 border border-amber-500/30 rounded-lg transition-colors"
                        title="Generate AI Reply"
                      >
                        {generatingAI ? (
                          <Loader2 size={16} className="text-amber-400 animate-spin" />
                        ) : (
                          <Sparkles size={16} className="text-amber-400" />
                        )}
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {replyText.length > 0 && `${replyText.length} characters`}
                      </p>
                      <button
                        onClick={async () => {
                          if (!replyText.trim() || !conversation) {
                            toast.error('Please enter a reply message');
                            return;
                          }

                          setSendingReply(true);
                          try {
                            const response = await api.post(`/messages/${conversation.candidate.id}/send-reply`, {
                              body: replyText,
                              subject: `Re: ${conversation.messages[0]?.subject || 'Conversation'}`
                            });

                            if (response.data.success) {
                              toast.success('Reply sent!');
                              setReplyText('');
                              // Refresh conversation and candidates list
                              queryClient.invalidateQueries({ queryKey: ['conversation', selectedCandidateId] });
                              queryClient.invalidateQueries({ queryKey: ['candidates-with-messages'] });
                              queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
                            }
                          } catch (error) {
                            toast.error('Failed to send reply');
                          } finally {
                            setSendingReply(false);
                          }
                        }}
                        disabled={!replyText.trim() || sendingReply}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald hover:bg-emerald/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        {sendingReply ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send size={14} />
                            Send Reply
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
