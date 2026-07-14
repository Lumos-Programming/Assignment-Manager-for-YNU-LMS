// 課題種別とアイコンの判定。コンテンツスクリプト間で共有する。

import { AssignmentType } from './types';

/** LMS の教材 ID プレフィックスから課題の種別を判定する。 */
export function checkAssignmentType(id: string): AssignmentType {
  if (id.includes('REP')) {
    return AssignmentType.Report;
  }
  if (id.includes('ANK')) {
    return AssignmentType.Questionnaire;
  }
  if (id.includes('TES')) {
    return AssignmentType.Test;
  }
  return AssignmentType.Other;
}

/** 課題 ID に対応する LMS の教材アイコン URL を返す。 */
export function getIconURLFromID(id: string): string {
  switch (checkAssignmentType(id)) {
    case AssignmentType.Report:
      return '/lms/img/pc/material_report_S.png';
    case AssignmentType.Questionnaire:
      return '/lms/img/pc/material_questionnaire_S.png';
    case AssignmentType.Test:
      return '/lms/img/pc/material_exam_S.png';
    default:
      return '/lms/img/pc/material_study-materials_S.png';
  }
}
