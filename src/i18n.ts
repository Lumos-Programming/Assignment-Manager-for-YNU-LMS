// Localized UI strings. One typed table per language; callers pick the table
// with getMessages(language). Strings are preserved verbatim from the original
// per-file *_TXT constants so behavior is unchanged.

import { Language } from './types';

export interface Messages {
  /** Heading for the assignment list. */
  assignmentsHeading: string;
  /** Column header: assignment name. */
  assignmentColumn: string;
  /** Column header: deadline. */
  deadlineColumn: string;
  /** Column header: lecture/subject. */
  lectureColumn: string;
  /** Column header: show/select toggle. */
  showColumn: string;
  /** Column header: select action. */
  actionColumn: string;

  // fetch_homework_storage: submission-status labels used to detect open work.
  notExecuted: string;
  notViewed: string;
  notSubmitted: string;
  notResponded: string;
  resubmission: string;
  /** Label marking an assignment as no longer available. */
  unavailable: string;

  // popup controls.
  clearAll: string;
  clearOverdue: string;
  recordsPerPageLabel: string;
  recordsPerPageError: string;

  // show_homework_storage selection controls.
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
