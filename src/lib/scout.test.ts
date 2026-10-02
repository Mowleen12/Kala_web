import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildScoutArtists } from './scout';
import { Application } from '../types';

const app = (over: Partial<Application>): Application => ({
  id: 'a1',
  opportunityId: 'o1',
  artistId: 'u1',
  opportunityTitle: 'Open Call',
  category: 'Music & Dance',
  location: 'Mumbai',
  appliedDate: '1 Oct 2026',
  createdAt: '2026-10-01',
  status: 'under_review',
  compensation: '₹10,000',
  artistName: 'Ananya Sharma',
  skills: ['Vocal'],
  pitch: 'Pitch',
  ...over,
});

test('groups multiple applications from the same artist into one entry', () => {
  const list = buildScoutArtists([
    app({ id: 'a1', rating: 3 }),
    app({ id: 'a2', opportunityId: 'o2', rating: 5, skills: ['Vocal', 'Harmonium'] }),
  ]);
  assert.equal(list.length, 1);
  assert.equal(list[0].applicationCount, 2);
  assert.equal(list[0].rating, 5);
  assert.deepEqual(list[0].skills, ['Vocal', 'Harmonium']);
});

test('distinct artists stay distinct and null fields get honest fallbacks', () => {
  const list = buildScoutArtists([
    app({ id: 'a1', artistId: 'u1' }),
    app({ id: 'a2', artistId: 'u2', artistName: 'Ravi Kumar', artistRole: null, artistLocation: null, experienceYears: null, rating: null }),
  ]);
  assert.equal(list.length, 2);
  assert.equal(list[0].role, 'Artist');
  assert.equal(list[1].role, 'Artist');
  assert.equal(list[1].location, 'Location not specified');
  assert.equal(list[1].experienceYears, null);
  assert.equal(list[1].rating, null);
});
