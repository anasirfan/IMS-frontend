import { isAxiosError } from 'axios';
import { keysToCamelCase } from './caseTransform';
import type { CandidateIncompletePayload } from '@/types';

export interface ParsedBulkUploadFailure {
  needsInput: boolean;
  missing: string[];
  partial: Record<string, string | undefined>;
  message: string;
}

function str(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

function normalizeMissing(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x).toLowerCase());
}

/** Normalize partial object keys to simple field names */
function normalizePartial(raw: unknown): Record<string, string | undefined> {
  if (!raw || typeof raw !== 'object') return {};
  const c = keysToCamelCase(raw) as Record<string, unknown>;
  return {
    name: str(c.name),
    email: str(c.email),
    phone: str(c.phone),
    position: str(c.position),
  };
}

function messageImpliesPositionDbError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('candidates.position') ||
    m.includes('sqlite_constraint') ||
    (m.includes('not null') && m.includes('position'))
  );
}

function classifyIncompleteEnvelope(
  message: string,
  code: string | undefined,
  dataObj: CandidateIncompletePayload | undefined
): ParsedBulkUploadFailure | null {
  if (code === 'CANDIDATE_INCOMPLETE' || (dataObj && Array.isArray(dataObj.missing))) {
    return {
      needsInput: true,
      missing: normalizeMissing(dataObj?.missing ?? []),
      partial: normalizePartial(dataObj?.partial),
      message,
    };
  }

  if (messageImpliesPositionDbError(message)) {
    return {
      needsInput: true,
      missing: ['position'],
      partial: normalizePartial(dataObj),
      message,
    };
  }

  const extractFail =
    /could not extract candidate information/i.test(message) ||
    /could not extract.*from cv/i.test(message);

  if (extractFail) {
    return {
      needsInput: true,
      missing: ['name', 'email', 'position'],
      partial: normalizePartial(dataObj),
      message,
    };
  }

  return null;
}

/**
 * Parse `{ success: false, message, code?, data? }` from bulk upload (HTTP 200 edge case or envelope).
 */
export function parseBulkFailurePayload(payload: unknown): ParsedBulkUploadFailure {
  const generic = (message: string): ParsedBulkUploadFailure => ({
    needsInput: false,
    missing: [],
    partial: {},
    message,
  });

  if (!payload || typeof payload !== 'object') {
    return generic('Something went wrong');
  }

  const envelope = keysToCamelCase(payload) as {
    success?: boolean;
    message?: string;
    code?: string;
    data?: unknown;
  };

  if (envelope.success !== false) {
    return generic(str(envelope.message) || 'Something went wrong');
  }

  const message = str(envelope.message) || 'Request failed';
  const dataRaw = envelope.data;
  const dataObj =
    dataRaw && typeof dataRaw === 'object'
      ? (keysToCamelCase(dataRaw) as CandidateIncompletePayload)
      : undefined;

  const classified = classifyIncompleteEnvelope(message, str(envelope.code), dataObj);
  if (classified) return classified;

  return generic(message);
}

/**
 * Decide if a bulk-upload error should send the user to "Complete candidate details"
 * and which fields to collect.
 */
export function parseBulkUploadFailure(error: unknown): ParsedBulkUploadFailure {
  if (!isAxiosError(error)) {
    return {
      needsInput: false,
      missing: [],
      partial: {},
      message: error instanceof Error ? error.message : 'Something went wrong',
    };
  }

  const rawBody = error.response?.data;
  if (rawBody && typeof rawBody === 'object') {
    return parseBulkFailurePayload(rawBody);
  }

  return {
    needsInput: false,
    missing: [],
    partial: {},
    message: error.message || 'Something went wrong',
  };
}
