import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSameCollege } from './colleges';

test('matches colleges case- and whitespace-insensitively', () => {
  assert.equal(isSameCollege('Hindu College', '  hindu college '), true);
});

test('different colleges do not match', () => {
  assert.equal(isSameCollege('Hindu College', 'Miranda House'), false);
});

test('missing values never match', () => {
  assert.equal(isSameCollege(undefined, 'Hindu College'), false);
  assert.equal(isSameCollege('Hindu College', null), false);
  assert.equal(isSameCollege('', ''), false);
});
