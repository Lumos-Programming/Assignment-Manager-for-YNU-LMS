import { Assignment } from './types';

export interface AssignmentPartition {
  readonly active: Assignment[];
  readonly completed: Assignment[];
}

export function isActiveAssignment(assignment: Assignment): boolean {
  // HOME already treated legacy records without isVisible as active.
  return assignment.isVisible !== false;
}

export function isCompletedAssignment(assignment: Assignment): boolean {
  return assignment.isVisible === false;
}

export function completeSelectedAssignments(
  assignments: readonly Assignment[],
  selectedIds: ReadonlySet<string>,
  nextHiddenAt: () => string
): Assignment[] {
  return assignments.map((assignment) => {
    if (!selectedIds.has(assignment.id) || !isActiveAssignment(assignment)) {
      return assignment;
    }
    return {
      ...assignment,
      isVisible: false,
      hiddenAt: nextHiddenAt(),
      hiddenReason: 'done',
    };
  });
}

export function restoreSelectedAssignments(
  assignments: readonly Assignment[],
  selectedIds: ReadonlySet<string>
): Assignment[] {
  return assignments.map((assignment) => {
    if (!selectedIds.has(assignment.id) || !isCompletedAssignment(assignment)) {
      return assignment;
    }
    const restored: Assignment = { ...assignment, isVisible: true };
    delete restored.hiddenAt;
    delete restored.hiddenReason;
    return restored;
  });
}

export function partitionAssignments(
  assignments: readonly Assignment[]
): AssignmentPartition {
  const active: Assignment[] = [];
  const completed: Assignment[] = [];

  for (const assignment of assignments) {
    if (isCompletedAssignment(assignment)) {
      completed.push(assignment);
    } else {
      active.push(assignment);
    }
  }

  return { active, completed };
}
