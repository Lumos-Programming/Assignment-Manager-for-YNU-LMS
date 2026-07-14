// Shared domain types for the extension.

/** UI language, derived per-context (see language.ts). */
export type Language = 'English' | '日本語';

/** Assignment category, inferred from the LMS material id prefix. */
export enum AssignmentType {
  Other = 1,
  Report = 2,
  Test = 3,
  Questionnaire = 4,
}

/**
 * A single homework/assignment tracked by the extension.
 *
 * Stored in `chrome.storage.sync` keyed by {@link Assignment.id}. `due` is an
 * ISO-8601 string (or `null` when the assignment has no deadline).
 */
export interface Assignment {
  id: string;
  subject_id: string;
  subject_ja: string;
  subject_en: string;
  name: string;
  due: string | null;
  isVisible: boolean;
  /** Set when the assignment is marked done/hidden; ISO-8601 timestamp. */
  hiddenAt?: string;
  hiddenReason?: 'done';
}

/** The special preferences record. */
export const PREFERENCES_ID = 'PREFERENCES';

export interface Preferences {
  id: typeof PREFERENCES_ID;
  recordPerPage: number;
}

export const DEFAULT_RECORD_PER_PAGE = 6;
