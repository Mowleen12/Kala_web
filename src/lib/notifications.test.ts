import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveSelectionNotices, markNoticesSeen, markStatusSeen } from './notifications';
import { Application } from '../types';

// Minimal localStorage so the module's persistence path is exercised in Node.
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as unknown as Storage;

const app = (over: Partial<Application>): Application => ({
  id: 'app-1',
  opportunityId: 'opp-1',
  artistId: 'artist-1',
  opportunityTitle: 'Kathak Residency',
  category: 'Music & Dance',
  location: 'Mumbai',
  appliedDate: 'today',
  createdAt: new Date('2026-10-01T10:00:00Z').toISOString(),
  status: 'under_review',
  compensation: '₹30,000',
  artistName: 'Ananya',
  skills: [],
  pitch: '',
  ...over,
});

test('no notice while an application is still under review', () => {
  store.clear();
  const notices = deriveSelectionNotices([app({})], 'artist-1');
  assert.equal(notices.length, 0);
});

test('selection produces a congratulations notice', () => {
  store.clear();
  const notices = deriveSelectionNotices([app({ status: 'selected' })], 'artist-1');
  assert.equal(notices.length, 1);
  assert.equal(notices[0].kind, 'selected');
  assert.equal(notices[0].applicationId, 'app-1');
  assert.match(notices[0].title, /selected/i);
});

test('audition invitation is its own notice kind', () => {
  store.clear();
  const notices = deriveSelectionNotices([app({ status: 'interview' })], 'artist-1');
  assert.equal(notices.length, 1);
  assert.equal(notices[0].kind, 'interview');
});

test('acknowledging a selection removes it', () => {
  store.clear();
  markStatusSeen('artist-1', 'app-1', 'selected');
  assert.equal(deriveSelectionNotices([app({ status: 'selected' })], 'artist-1').length, 0);
});

test('moving interview -> selected raises a fresh notice', () => {
  store.clear();
  markStatusSeen('artist-1', 'app-1', 'interview');
  const notices = deriveSelectionNotices([app({ status: 'selected' })], 'artist-1');
  assert.equal(notices.length, 1);
  assert.equal(notices[0].kind, 'selected');
});

test('marking all seen clears every notice', () => {
  store.clear();
  const applications = [app({ status: 'selected' }), app({ id: 'app-2', status: 'interview' })];
  const notices = deriveSelectionNotices(applications, 'artist-1');
  assert.equal(notices.length, 2);
  markNoticesSeen('artist-1', notices);
  assert.equal(deriveSelectionNotices(applications, 'artist-1').length, 0);
});

test('review state is remembered per user', () => {
  store.clear();
  markStatusSeen('artist-1', 'app-1', 'selected');
  assert.equal(deriveSelectionNotices([app({ status: 'selected' })], 'artist-2').length, 1);
});

test('rejected applications stay quiet', () => {
  store.clear();
  assert.equal(deriveSelectionNotices([app({ status: 'rejected' })], 'artist-1').length, 0);
});
