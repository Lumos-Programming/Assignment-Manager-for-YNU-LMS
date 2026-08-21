import assert from 'node:assert/strict';
import test from 'node:test';

import { dueTime } from '../src/date.ts';

test('期限文字列をタイムスタンプへ変換する', () => {
  assert.equal(
    dueTime('2026-08-10T12:34:56.000Z'),
    Date.parse('2026-08-10T12:34:56.000Z')
  );
});

test('期限がない場合は0を返す', () => {
  assert.equal(dueTime(null), 0);
});

test('不正な期限文字列ではNaNを返す', () => {
  assert.ok(Number.isNaN(dueTime('not-a-date')));
});
