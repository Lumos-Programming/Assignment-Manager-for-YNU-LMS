// UI 表示文字列のローカライズ。言語ごとに型付きのテーブルを 1 つ持ち、
// 呼び出し側は getMessages(language) でテーブルを選ぶ。文字列は元の各ファイルの
// *_TXT 定数からそのまま移植しており、挙動は変わらない。

import { Language } from './types';

export interface Messages {
  /** 課題一覧の見出し。 */
  assignmentsHeading: string;
  /** 列見出し: 課題名。 */
  assignmentColumn: string;
  /** 列見出し: 提出期限。 */
  deadlineColumn: string;
  /** 列見出し: 講義名。 */
  lectureColumn: string;
  /** 列見出し: 表示切り替え。 */
  showColumn: string;
  /** 列見出し: 選択操作。 */
  actionColumn: string;

  // fetch_homework_storage: 未完了の課題を判別するための提出ステータス表示。
  notExecuted: string;
  notViewed: string;
  notSubmitted: string;
  notResponded: string;
  resubmission: string;
  /** 課題が公開終了であることを示すラベル。 */
  unavailable: string;

  // ポップアップの操作系。
  clearAll: string;
  clearOverdue: string;
  recordsPerPageLabel: string;
  recordsPerPageError: string;

  // show_homework_storage の選択操作系。
  completeSelected: string;
  completedAssignments: string;
  restoreSelected: string;
  noneSelected: string;
}

const EN: Messages = {
  assignmentsHeading: 'Assignments',
  assignmentColumn: 'Assignment',
  deadlineColumn: 'DEADLINE',
  lectureColumn: 'Lecture',
  showColumn: '表示',
  actionColumn: 'Select',

  notExecuted: 'Not executed',
  notViewed: 'Not viewed',
  notSubmitted: 'Not submitted',
  notResponded: 'Not responded',
  resubmission: 'Resubmission',
  unavailable: 'Unavailable',

  clearAll: 'Clear all assignments',
  clearOverdue: 'Clear all overdue assignments',
  recordsPerPageLabel: ' assignemts per page',
  recordsPerPageError: 'Values must be between 1 and 100',

  completeSelected: 'Complete selected',
  completedAssignments: 'Completed assignments',
  restoreSelected: 'Restore selected',
  noneSelected: '0 selected',
};

const JA: Messages = {
  assignmentsHeading: '課題',
  assignmentColumn: '課題名',
  deadlineColumn: '提出期限',
  lectureColumn: '講義名',
  showColumn: '表示',
  actionColumn: '選択',

  notExecuted: '未実施',
  notViewed: '未参照',
  notSubmitted: '未提出',
  notResponded: '未回答',
  resubmission: '再提出',
  unavailable: '公開終了',

  clearAll: '課題全消去',
  clearOverdue: '提出期限を過ぎた課題を全消去',
  recordsPerPageLabel: '1ページに表示する課題数: ',
  recordsPerPageError: '1 - 100 までの数値を入力してください',

  completeSelected: '選択した課題を完了',
  completedAssignments: '完了した課題',
  restoreSelected: '選択した課題を一覧に戻す',
  noneSelected: '0件選択中',
};

export function getMessages(language: Language): Messages {
  return language === 'English' ? EN : JA;
}
