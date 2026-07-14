// UI 表示文字列のローカライズ。言語ごとのテーブルを getMessages(language) で選ぶ。

import { Language } from './types';

export interface Messages {
  // 見出し・列見出し
  assignmentsHeading: string;
  assignmentColumn: string;
  deadlineColumn: string;
  lectureColumn: string;
  showColumn: string;
  actionColumn: string;

  // 提出ステータス（未完了の課題の判別に使う）と公開終了ラベル
  notExecuted: string;
  notViewed: string;
  notSubmitted: string;
  notResponded: string;
  resubmission: string;
  unavailable: string;

  // ポップアップの操作系
  clearAll: string;
  clearOverdue: string;
  recordsPerPageLabel: string;
  recordsPerPageError: string;

  // 課題の完了・復元の操作系
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
