// 拡張機能全体で共有するドメイン型。

/** UI 言語。実行コンテキストごとに判定する（language.ts を参照）。 */
export type Language = 'English' | '日本語';

export enum AssignmentType {
  Other = 1,
  Report = 2,
  Test = 3,
  Questionnaire = 4,
}

/**
 * 拡張機能が管理する 1 件の課題。
 *
 * {@link Assignment.id} をキーに `chrome.storage.sync` に保存される。`due` は
 * ISO-8601 形式の文字列（提出期限がない課題では `null`）。
 */
export interface Assignment {
  id: string;
  subject_id: string;
  subject_ja: string;
  subject_en: string;
  name: string;
  due: string | null;
  isVisible: boolean;
  /** 完了/非表示にした際に設定される ISO-8601 形式のタイムスタンプ。 */
  hiddenAt?: string;
  hiddenReason?: 'done';
}

export const PREFERENCES_ID = 'PREFERENCES';

export interface Preferences {
  id: typeof PREFERENCES_ID;
  recordPerPage: number;
}

export const DEFAULT_RECORD_PER_PAGE = 6;
