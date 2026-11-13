import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isOpportunityOpen } from './opportunityStatus';

const HOUR = 3_600_000;

test('listing with no deadline and active status is open', () => {
  assert.equal(isOpportunityOpen({ status: 'active', deadline: null }), true);
});

test('future deadline is open', () => {
  assert.equal(isOpportunityOpen({ deadline: new Date(Date.now() + HOUR).toISOString() }), true);
});

test('passed deadline is closed', () => {
  assert.equal(isOpportunityOpen({ deadline: new Date(Date.now() - HOUR).toISOString() }), false);
});

test('organiser-closed status beats a future deadline', () => {
  assert.equal(
    isOpportunityOpen({ status: 'closed', deadline: new Date(Date.now() + HOUR).toISOString() }),
    false
  );
});

test('deadline exactly now counts as closed', () => {
  const now = new Date().toISOString();
  assert.equal(isOpportunityOpen({ deadline: now }), false);
});
