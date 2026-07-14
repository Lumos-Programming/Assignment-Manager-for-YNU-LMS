// 教材 ID から課題種別とアイコンを判定する。

import { AssignmentType } from './types';

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
