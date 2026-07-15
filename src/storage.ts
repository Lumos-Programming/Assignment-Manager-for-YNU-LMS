// chrome.storage を Promise 化した型付きラッパー。課題は sync、設定は local。

import {
  Assignment,
  DEFAULT_RECORD_PER_PAGE,
  PREFERENCES_ID,
  Preferences,
} from './types';

// 全フィールドは検証せず、「id を持ち PREFERENCES ではない」レコードを課題とみなす
// （過去に sync 側へ紛れ込んだ PREFERENCES を除外するだけ。元の JS の挙動に合わせる）。
function isAssignmentRecord(value: unknown): value is Assignment {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    (value as { id: unknown }).id !== PREFERENCES_ID
  );
}

export function loadAssignments(): Promise<Assignment[]> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, (data) => {
      resolve(Object.values(data).filter(isAssignmentRecord));
    });
  });
}

export async function loadAssignmentIDs(): Promise<string[]> {
  const assignments = await loadAssignments();
  return assignments.map((assignment) => assignment.id);
}

export function saveAssignment(assignment: Assignment): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [assignment.id]: assignment }, () => resolve());
  });
}

export function saveAssignments(assignments: Assignment[]): Promise<void> {
  const updates: Record<string, Assignment> = {};
  for (const assignment of assignments) {
    updates[assignment.id] = assignment;
  }
  return new Promise((resolve) => {
    chrome.storage.sync.set(updates, () => resolve());
  });
}

export function removeAssignment(id: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.remove(id, () => resolve());
  });
}

export function clearAssignments(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.clear(() => resolve());
  });
}

// 未設定ならデフォルト値を返す。
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

export function savePreferences(prefs: Preferences): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [PREFERENCES_ID]: prefs }, () => resolve());
  });
}
