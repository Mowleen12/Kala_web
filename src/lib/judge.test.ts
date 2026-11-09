import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findJudgeAccess, generateJudgeCode } from './judge';

test('QR event code validates without organizer-local storage', () => {
  const eventId = 'event-from-another-device';
  const access = findJudgeAccess(generateJudgeCode(eventId), eventId);

  assert.ok(access);
  assert.equal(access.opportunityId, eventId);
});

test('event code cannot be used for a different event', () => {
  const access = findJudgeAccess(
    generateJudgeCode('event-one'),
    'event-two',
  );

  assert.equal(access, null);
});
