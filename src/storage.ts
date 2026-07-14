// Promise-based, typed wrappers around chrome.storage.
//
// Assignments live in `chrome.storage.sync` keyed by their id. Preferences
// live in `chrome.storage.local` under the `PREFERENCES` key. Historically a
// stray `PREFERENCES` record could also end up in sync storage, so readers here
// filter it out defensively.

import {
  Assignment,
  DEFAULT_RECORD_PER_PAGE,
  PREFERENCES_ID,
  Preferences,
} from './types';

function isAssignment(value: unknown): value is Assignment {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    (value as { id: unknown }).id !== PREFERENCES_ID
  );
}

/** All tracked assignments, in arbitrary order. */
export function loadAssignments(): Promise<Assignment[]> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, (data) => {
      resolve(Object.values(data).filter(isAssignment));
    });
  });
}

/** The ids of all tracked assignments. */
export async function loadAssignmentIDs(): Promise<string[]> {
  const assignments = await loadAssignments();
  return assignments.map((assignment) => assignment.id);
}

/** Persist a single assignment, keyed by its id. */
export function saveAssignment(assignment: Assignment): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [assignment.id]: assignment }, () => resolve());
  });
}

/** Persist several assignments at once. */
export function saveAssignments(assignments: Assignment[]): Promise<void> {
  const updates: Record<string, Assignment> = {};
  for (const assignment of assignments) {
    updates[assignment.id] = assignment;
  }
  return new Promise((resolve) => {
    chrome.storage.sync.set(updates, () => resolve());
  });
}

/** Remove a single assignment by id. */
export function removeAssignment(id: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.remove(id, () => resolve());
  });
}

/** Remove every stored assignment. */
export function clearAssignments(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.clear(() => resolve());
  });
}

/** Load preferences, falling back to defaults when unset. */
export function loadPreferences(): Promise<Preferences> {
  return new Promise((resolve) => {
    chrome.storage.local.get(PREFERENCES_ID, (data) => {
      const prefs = data[PREFERENCES_ID] as Preferences | undefined;
      if (prefs && prefs.id === PREFERENCES_ID) {
        resolve(prefs);
      } else {
        resolve({ id: PREFERENCES_ID, recordPerPage: DEFAULT_RECORD_PER_PAGE });
      }
    });
  });
}

/** Persist preferences. */
export function savePreferences(prefs: Preferences): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [PREFERENCES_ID]: prefs }, () => resolve());
  });
}
