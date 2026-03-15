import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date) {
  if (!date) return 'N/A';
  
  // Handle SQLite datetime format: 'YYYY-MM-DD HH:MM:SS'
  let dateStr = typeof date === 'string' ? date : date.toISOString();
  if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
    // Convert SQLite format to ISO format by replacing space with 'T'
    dateStr = date.replace(' ', 'T') + 'Z';
  }
  
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'INBOX': return 'badge-inbox';
    case 'ASSESSMENT': return 'badge-screening';
    case 'SCHEDULED': return 'badge-technical';
    case 'INTERVIEW': return 'badge-final';
    case 'SHORTLISTED': return 'badge-hired';
    case 'HIRED': return 'badge-hired';
    case 'REJECTED': return 'badge-rejected';
    default: return 'badge bg-glass-white5 text-gray-400 border border-glass-border';
  }
}

export function getRatingStars(rating: number | null) {
  if (!rating) return '—';
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}
