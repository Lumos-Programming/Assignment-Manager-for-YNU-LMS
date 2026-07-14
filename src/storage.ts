// chrome.storage を Promise 化した型付きラッパー。
//
// 課題は id をキーに `chrome.storage.sync` に、設定は `PREFERENCES` キーで
// `chrome.storage.local` に保存される。過去には sync 側に紛れ込んだ
// `PREFERENCES` レコードが存在しうるため、読み取り時に防御的に除外している。

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

/** 管理中の全課題を返す（順序は不定）。 */
export function loadAssignments(): Promise<Assignment[]> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, (data) => {
      resolve(Object.values(data).filter(isAssignment));
    });
  });
}

/** 管理中の全課題の id を返す。 */
export async function loadAssignmentIDs(): Promise<string[]> {
  const assignments = await loadAssignments();
  return assignments.map((assignment) => assignment.id);
}

/** 課題 1 件を id をキーに保存する。 */
export function saveAssignment(assignment: Assignment): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [assignment.id]: assignment }, () => resolve());
  });
}

/** 複数の課題をまとめて保存する。 */
export function saveAssignments(assignments: Assignment[]): Promise<void> {
  const updates: Record<string, Assignment> = {};
  for (const assignment of assignments) {
    updates[assignment.id] = assignment;
  }
  return new Promise((resolve) => {
    chrome.storage.sync.set(updates, () => resolve());
  });
}

/** id を指定して課題 1 件を削除する。 */
export function removeAssignment(id: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.remove(id, () => resolve());
  });
}

/** 保存済みの課題をすべて削除する。 */
export function clearAssignments(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.clear(() => resolve());
  });
}

/** 設定を読み込む。未設定の場合はデフォルト値を返す。 */
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

/** 設定を保存する。 */
export function savePreferences(prefs: Preferences): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [PREFERENCES_ID]: prefs }, () => resolve());
  });
}
