'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { candidateService } from '@/services/candidate.service';
import { KNOWN_CANONICAL_POSITIONS } from '@/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PLACEHOLDER_EMAIL_SUFFIX = '@bulk-upload.pending';

export interface CompleteCandidateModalProps {
  open: boolean;
  fileName: string;
  /** create = new candidate + CV; update = PATCH existing candidate (e.g. replace placeholder email) */
  variant: 'create' | 'update';
  candidateId?: string;
  /** Lowercased field keys from CANDIDATE_INCOMPLETE / validation */
  missingFields: string[];
  /** Lowercased fields from bulk success meta (e.g. placeholder email) */
  pendingFields?: string[];
  partial: {
    name?: string;
    email?: string;
    phone?: string;
    position?: string;
  };
  file: File;
  onClose: () => void;
  onSkip: () => void;
  /** After successful create or update */
  onSuccess: (summary: { name: string; id: string }) => void;
}

function inKnownPositions(p: string | undefined): boolean {
  if (!p) return false;
  return (KNOWN_CANONICAL_POSITIONS as readonly string[]).includes(p);
}

export default function CompleteCandidateModal({
  open,
  fileName,
  variant,
  candidateId,
  missingFields,
  pendingFields,
  partial,
  file,
  onClose,
  onSkip,
  onSuccess,
}: CompleteCandidateModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  /** Fields we ask the user for (backend-driven + minimum to submit) */
  const collect = useMemo(() => {
    const s = new Set<string>();
    (missingFields ?? []).forEach((f) => s.add(String(f).toLowerCase()));
    (pendingFields ?? []).forEach((f) => s.add(String(f).toLowerCase()));
    if (variant === 'create' && !partial?.name?.trim()) {
      s.add('name');
    }
    if (variant === 'create' && s.size === 0) {
      s.add('position');
    }
    if (variant === 'update' && s.size === 0) {
      s.add('email');
    }
    return s;
  }, [missingFields, pendingFields, variant, partial?.name]);

  const showName = collect.has('name');
  const showEmail = collect.has('email');
  const showPhone = collect.has('phone');
  const showPosition = collect.has('position');

  useEffect(() => {
    if (!open) return;
    setName(partial.name ?? '');
    const pe = partial.email ?? '';
    setEmail(pe.endsWith(PLACEHOLDER_EMAIL_SUFFIX) ? '' : pe);
    setPhone(partial.phone ?? '');
    setPosition(inKnownPositions(partial.position) ? partial.position! : '');
    setPositionFilter('');
    setTouched(false);
    setSubmitting(false);
  }, [open, partial.name, partial.email, partial.phone, partial.position]);

  const filteredRoles = useMemo(() => {
    const q = positionFilter.trim().toLowerCase();
    if (!q) return [...KNOWN_CANONICAL_POSITIONS];
    return KNOWN_CANONICAL_POSITIONS.filter((r) => r.toLowerCase().includes(q));
  }, [positionFilter]);

  const intro =
    variant === 'update'
      ? 'This candidate was created from the CV, but some values are placeholders. Update the fields below and save.'
      : 'Some required details could not be read from this CV. Fill in the fields below and we will create the candidate with the same PDF attached.';

  const validate = (): string | null => {
    const finalName = (showName ? name : partial.name ?? '').trim();
    if (!finalName) return 'Name is required.';

    const rawEmail = (showEmail ? email : partial.email ?? '').trim();
    if (showEmail) {
      if (!rawEmail) return 'Email is required.';
      if (!EMAIL_RE.test(rawEmail)) return 'Enter a valid email address.';
    } else if (rawEmail && !EMAIL_RE.test(rawEmail)) {
      return 'Enter a valid email address.';
    }

    const finalPos = (showPosition ? position : partial.position ?? '').trim();
    if (!finalPos) return 'Select a job role (position).';

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

    const finalName = (showName ? name : partial.name ?? '').trim();
    const finalEmail = (showEmail ? email : partial.email ?? '').trim();
    const finalPhone = (showPhone ? phone : partial.phone ?? '').trim();
    const finalPos = (showPosition ? position : partial.position ?? '').trim();

    setSubmitting(true);
    try {
      if (variant === 'update') {
        if (!candidateId) {
          toast.error('Missing candidate id');
          return;
        }
        const fd = new FormData();
        if (showName) fd.append('name', finalName);
        if (showEmail) fd.append('email', finalEmail);
        if (showPhone) fd.append('phone', finalPhone);
        if (showPosition) fd.append('position', finalPos);

        const res = await candidateService.update(candidateId, fd);
        if (!res.success || !res.data) {
          toast.error(res.message || 'Failed to update candidate');
          return;
        }
        toast.success('Candidate updated');
        onSuccess({ name: res.data.name, id: res.data.id });
        onClose();
        return;
      }

      const fd = new FormData();
      fd.append('name', finalName);
      if (finalEmail) fd.append('email', finalEmail);
      if (finalPhone) fd.append('phone', finalPhone);
      fd.append('position', finalPos);
      fd.append('status', 'INBOX');
      fd.append('roundStage', 'INBOX');
      fd.append('cv', file);

      const res = await candidateService.create(fd);
      if (!res.success || !res.data) {
        toast.error(res.message || 'Failed to create candidate');
        return;
      }
      toast.success('Candidate created');
      onSuccess({ name: res.data.name, id: res.data.id });
      onClose();
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' && e !== null && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.debug('[CompleteCandidateModal]', {
      fileName,
      variant,
      candidateId,
      missingFields,
      pendingFields,
      collect: Array.from(collect),
    });
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="glass-surface p-6 rounded-xl shadow-2xl border border-glass-border max-w-lg w-full mx-auto my-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-100">
              {variant === 'update' ? 'Update candidate' : 'Complete candidate details'}
            </h3>
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

        <p className="text-sm text-gray-400 mb-4">{intro}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {showName && (
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
          )}

          {showEmail && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Email <span className="text-amber-400">*</span>
              </label>
              <input
                className="input-field w-full"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
              {touched && !email.trim() && <p className="text-xs text-red-400 mt-1">Email is required</p>}
            </div>
          )}

          {showPhone && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Phone <span className="text-gray-600">(optional)</span>
              </label>
              <input
                className="input-field w-full"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone"
              />
            </div>
          )}

          {showPosition && (
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
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            {variant === 'create' && (
              <button type="button" onClick={onSkip} className="btn-outline flex-1 text-sm" disabled={submitting}>
                Skip
              </button>
            )}
            <button
              type="submit"
              className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {variant === 'update' ? 'Saving…' : 'Creating…'}
                </>
              ) : variant === 'update' ? (
                'Save'
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
