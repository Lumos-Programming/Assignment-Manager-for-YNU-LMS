import assert from 'node:assert/strict';
import test from 'node:test';

import {
  completeSelectedAssignments,
  partitionAssignments,
  restoreSelectedAssignments,
} from '../src/assignment-lifecycle.ts';

const FIRST_HIDDEN_AT = '2026-08-11T00:00:00.000Z';
const SECOND_HIDDEN_AT = '2026-08-11T00:00:01.000Z';

function assignment(overrides = {}) {
  return {
    id: 'assignment-1',
    subject_id: 'subject-1',
    subject_ja: '講義',
    subject_en: 'Lecture',
    name: 'Report',
    due: '2026-08-20T00:00:00.000Z',
    isVisible: true,
    fixtureMetadata: { source: 'lifecycle-test' },
    ...overrides,
  };
}

function cloneFixture(value) {
  return JSON.parse(JSON.stringify(value));
}

test('partitions missing isVisible as active', () => {
  const missingVisibility = assignment({ id: 'missing-visibility' });
  delete missingVisibility.isVisible;
  const visible = assignment({ id: 'visible' });

  const partition = partitionAssignments([missingVisibility, visible]);

  assert.deepEqual(partition.active, [missingVisibility, visible]);
  assert.deepEqual(partition.completed, []);
  assert.strictEqual(partition.active[0], missingVisibility);
  assert.strictEqual(partition.active[1], visible);
});

test('partitions false isVisible as completed', () => {
  const active = assignment({ id: 'active' });
  const completed = assignment({ id: 'completed', isVisible: false });

  const partition = partitionAssignments([active, completed]);

  assert.deepEqual(partition.active, [active]);
  assert.deepEqual(partition.completed, [completed]);
  assert.strictEqual(partition.completed[0], completed);
});

test('completes only selected active assignments without mutating inputs', () => {
  const selectedActive = assignment({ id: 'selected-active' });
  const unselectedActive = assignment({ id: 'unselected-active' });
  const selectedCompleted = assignment({
    id: 'selected-completed',
    isVisible: false,
    hiddenAt: FIRST_HIDDEN_AT,
    hiddenReason: 'done',
  });
  const assignments = [selectedActive, unselectedActive, selectedCompleted];
  const before = cloneFixture(assignments);

  const updated = completeSelectedAssignments(
    assignments,
    new Set(['selected-active', 'selected-completed']),
    () => SECOND_HIDDEN_AT
  );

  assert.deepEqual(assignments, before);
  assert.deepEqual(updated[0], {
    ...selectedActive,
    isVisible: false,
    hiddenAt: SECOND_HIDDEN_AT,
    hiddenReason: 'done',
  });
  assert.notStrictEqual(updated[0], selectedActive);
  assert.strictEqual(updated[1], unselectedActive);
  assert.strictEqual(updated[2], selectedCompleted);
});

test('calls the hiddenAt factory once per transitioned record', () => {
  const first = assignment({ id: 'first' });
  const second = assignment({ id: 'second' });
  const unselected = assignment({ id: 'unselected' });
  const hiddenTimes = [FIRST_HIDDEN_AT, SECOND_HIDDEN_AT];
  let calls = 0;

  const updated = completeSelectedAssignments(
    [first, second, unselected],
    new Set(['first', 'second']),
    () => {
      const hiddenAt = hiddenTimes[calls];
      calls += 1;
      return hiddenAt;
    }
  );

  assert.equal(calls, 2);
  assert.equal(updated[0].hiddenAt, FIRST_HIDDEN_AT);
  assert.equal(updated[1].hiddenAt, SECOND_HIDDEN_AT);
  assert.strictEqual(updated[2], unselected);
});

test('repeated completion does not rewrite an already-completed record', () => {
  const completed = assignment({
    isVisible: false,
    hiddenAt: FIRST_HIDDEN_AT,
    hiddenReason: 'done',
  });

  const updated = completeSelectedAssignments(
    [completed],
    new Set([completed.id]),
    () => {
      throw new Error('the clock must not be read');
    }
  );

  assert.strictEqual(updated[0], completed);
});

test('restores only selected completed assignments and clears completion metadata', () => {
  const selectedCompleted = assignment({
    id: 'selected-completed',
    isVisible: false,
    hiddenAt: FIRST_HIDDEN_AT,
    hiddenReason: 'done',
  });
  const unselectedCompleted = assignment({
    id: 'unselected-completed',
    isVisible: false,
    hiddenAt: SECOND_HIDDEN_AT,
    hiddenReason: 'done',
  });
  const selectedActive = assignment({ id: 'selected-active' });
  const assignments = [selectedCompleted, unselectedCompleted, selectedActive];
  const before = cloneFixture(assignments);

  const restored = restoreSelectedAssignments(
    assignments,
    new Set(['selected-completed', 'selected-active'])
  );

  assert.deepEqual(assignments, before);
  assert.deepEqual(restored[0], {
    id: selectedCompleted.id,
    subject_id: selectedCompleted.subject_id,
    subject_ja: selectedCompleted.subject_ja,
    subject_en: selectedCompleted.subject_en,
    name: selectedCompleted.name,
    due: selectedCompleted.due,
    isVisible: true,
    fixtureMetadata: selectedCompleted.fixtureMetadata,
  });
  assert.notStrictEqual(restored[0], selectedCompleted);
  assert.strictEqual(restored[1], unselectedCompleted);
  assert.strictEqual(restored[2], selectedActive);
});
