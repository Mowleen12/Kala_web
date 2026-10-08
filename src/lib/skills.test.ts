import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_SUGGESTIONS, suggestSkills } from './skills';

test('list is unique and covers every suggestion', () => {
  const lower = SKILL_SUGGESTIONS.map((s) => s.toLowerCase());
  assert.equal(new Set(lower).size, lower.length, 'no duplicate skills');
  assert.ok(SKILL_SUGGESTIONS.length >= 60, 'curated list should be substantial');
});

test('empty query returns the top of the list up to the cap', () => {
  const got = suggestSkills('');
  assert.equal(got.length, 8);
  assert.deepEqual(got, SKILL_SUGGESTIONS.slice(0, 8));
});

test('prefix matches rank before substring matches', () => {
  const got = suggestSkills('mus');
  assert.equal(got[0], 'Music Composition', 'prefix match ranks first');
  assert.ok(got.includes('Light Music Vocals'), 'substring match still included');
  assert.ok(
    got.indexOf('Music Composition') < got.indexOf('Light Music Vocals'),
    'prefix before substring',
  );
});

test('matches are case-insensitive', () => {
  assert.deepEqual(suggestSkills('SITAR'), ['Sitar']);
});

test('skills already on the profile are excluded', () => {
  assert.ok(!suggestSkills('', ['Sitar']).includes('Sitar'));
  assert.ok(!suggestSkills('sit', ['Sitar']).includes('Sitar'));
  assert.deepEqual(suggestSkills('sitar', ['Sitar']), []);
});

test('results never exceed the cap', () => {
  assert.ok(suggestSkills('a', [], 3).length <= 3);
  assert.ok(suggestSkills('', [], 5).length <= 5);
});
