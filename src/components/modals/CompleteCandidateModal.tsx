'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { candidateService } from '@/services/candidate.service';
import { KNOWN_CANONICAL_POSITIONS } from '@/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CompleteCandidateModalProps {
  open: boolean;
  fileName: string;
  /** Lowercased field keys e.g. name, email, position */
  missingFields: string[];
  partial: {
    name?: string;
    email?: string;
    phone?: string;
    position?: string;
  };
  file: File;
  onClose: () => void;
  onSkip: () => void;
  /** Called after candidate is created successfully */
  onCreated: (summary: { name: string; id: string }) => void;
}

export default function CompleteCandidateModal({
  open,
  fileName,
  missingFields,
  partial,
  file,
  onClose,
  onSkip,
  onCreated,
}: CompleteCandidateModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(partial.name ?? '');
    setEmail(partial.email ?? '');
    setPhone(partial.phone ?? '');
    setPosition(partial.position && KNOWN_CANONICAL_POSITIONS.includes(partial.position as (typeof KNOWN_CANONICAL_POSITIONS)[number]) ? partial.position : '');
    setPositionFilter('');
    setTouched(false);
    setSubmitting(false);
  }, [open, partial.name, partial.email, partial.phone, partial.position]);

  const filteredRoles = useMemo(() => {
    const q = positionFilter.trim().toLowerCase();
    if (!q) return [...KNOWN_CANONICAL_POSITIONS];
    return KNOWN_CANONICAL_POSITIONS.filter((r) => r.toLowerCase().includes(q));
  }, [positionFilter]);

  const requireEmail = missingFields.includes('email');

  const validate = (): string | null => {
    if (!name.trim()) return 'Name is required.';
    if (requireEmail) {
      if (!email.trim()) return 'Email is required.';
      if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
    } else if (email.trim() && !EMAIL_RE.test(email.trim())) {
      return 'Enter a valid email address.';
    }
    if (!position.trim()) return 'Select a job role (position).';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      if (email.trim()) fd.append('email', email.trim());
      if (phone.trim()) fd.append('phone', phone.trim());
      fd.append('position', position.trim());
      fd.append('status', 'INBOX');
      fd.append('roundStage', 'INBOX');
      fd.append('cv', file);

      const res = await candidateService.create(fd);
      if (!res.success || !res.data) {
        toast.error(res.message || 'Failed to create candidate');
        return;
      }
      toast.success('Candidate created');
      onCreated({ name: res.data.name, id: res.data.id });
      onClose();
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' && e !== null && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || 'Failed to create candidate');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.debug('[CompleteCandidateModal]', { fileName, missingFields, partial });
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="glass-surface p-6 rounded-xl shadow-2xl border border-glass-border max-w-lg w-full mx-auto my-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-100">Complete candidate details</h3>
            <p className="text-xs text-gray-500 mt-1 truncate" title={fileName}>
              {fileName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-glass-white10 text-gray-400 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          We could not detect a valid job role from this CV (or some required details are missing). Add the
          fields below and we will create the candidate with the same PDF attached.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Name <span className="text-amber-400">*</span>
            </label>
            <input
              className="input-field w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
            {touched && !name.trim() && <p className="text-xs text-red-400 mt-1">Name is required</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Email
              {requireEmail ? <span className="text-amber-400"> *</span> : <span className="text-gray-600"> (optional)</span>}
            </label>
            <input
              className="input-field w-full"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Phone</label>
            <input
              className="input-field w-full"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Position <span className="text-amber-400">*</span>
            </label>
            <input
              className="input-field w-full mb-2"
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              placeholder="Filter roles…"
              list="canonical-positions-list"
            />
            <datalist id="canonical-positions-list">
              {KNOWN_CANONICAL_POSITIONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            <select
              className="input-field w-full"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              required
            >
              <option value="">Select role…</option>
              {filteredRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {touched && !position && <p className="text-xs text-red-400 mt-1">Choose a position</p>}
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button type="button" onClick={onSkip} className="btn-outline flex-1 text-sm" disabled={submitting}>
              Skip
            </button>
            <button type="submit" className="btn-primary flex-1 text-sm flex items-center justify-center gap-2" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating…
                </>
              ) : (
                'Create candidate'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
