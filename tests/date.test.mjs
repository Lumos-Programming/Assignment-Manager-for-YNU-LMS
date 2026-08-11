import assert from 'node:assert/strict';
import test from 'node:test';

import { dueTime } from '../src/date.ts';

test('returns the existing due timestamp', () => {
  assert.equal(
    dueTime('2026-08-10T12:34:56.000Z'),
    Date.parse('2026-08-10T12:34:56.000Z')
  );
});

test('keeps the existing missing-deadline zero sort key', () => {
  assert.equal(dueTime(null), 0);
});

test('keeps an invalid non-null deadline as NaN', () => {
  assert.ok(Number.isNaN(dueTime('not-a-date')));
});
