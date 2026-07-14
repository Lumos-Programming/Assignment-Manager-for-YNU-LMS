// Assignment type + icon derivation, shared by the content scripts.

import { AssignmentType } from './types';

/** Infer the assignment category from its LMS material id prefix. */
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

/** The LMS material icon URL for an assignment id. */
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
