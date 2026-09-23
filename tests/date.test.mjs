import assert from 'node:assert/strict';
import test from 'node:test';

import { dueTime } from '../src/date.ts';

test('期限文字列をタイムスタンプへ変換する', () => {
  assert.equal(
    dueTime('2026-08-10T12:34:56.000Z'),
    Date.parse('2026-08-10T12:34:56.000Z')
  );
});
