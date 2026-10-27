import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePostForm, PostFormFields } from './postForm';

const VALID: PostFormFields = {
  title: 'Monsoon Fusion Showcase 2026',
  category: 'Music & Dance',
  venue: 'NCPA Tata Theatre',
  city: 'Mumbai, Maharashtra',
  college: '',
  startDate: '2026-12-05',
  endDate: '2026-12-06',
  description: 'Looking for fusion ensembles for a two-evening showcase.',
  imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819',
  priceChoice: 'custom',
  customMin: '15000',
  customMax: '30000',
};

test('valid form returns no errors', () => {
  assert.deepEqual(validatePostForm(VALID), {});
});

test('every required field is reported when empty', () => {
  const errors = validatePostForm({ ...VALID, title: '', venue: '', city: '', startDate: '', description: '', imageUrl: '' });
  for (const key of ['title', 'venue', 'city', 'startDate', 'description', 'imageUrl']) {
    assert.ok(errors[key as keyof typeof errors], `expected an error for ${key}`);
  }
  assert.equal(errors.endDate, undefined, 'empty end date is allowed');
});

test('title must be at least 3 characters to match the DB check', () => {
  assert.ok(validatePostForm({ ...VALID, title: 'ab' }).title);
  assert.ok(validatePostForm({ ...VALID, title: '   ' }).title);
});

test('end date cannot precede start date', () => {
  assert.ok(validatePostForm({ ...VALID, startDate: '2026-12-10', endDate: '2026-12-01' }).endDate);
});

test('custom honorarium requires both bounds, max >= min', () => {
  assert.ok(validatePostForm({ ...VALID, customMin: '' }).customMin);
  assert.ok(validatePostForm({ ...VALID, customMax: '' }).customMax);
  assert.ok(validatePostForm({ ...VALID, customMin: '50000', customMax: '10000' }).customMax);
});

test('preset honorarium needs no numbers', () => {
  const errors = validatePostForm({ ...VALID, priceChoice: 'Under ₹10k', customMin: '', customMax: '' });
  assert.equal(errors.customMin, undefined);
  assert.equal(errors.customMax, undefined);
});

test('society requires a college; venue posts do not', () => {
  assert.ok(validatePostForm({ ...VALID, college: '' }, true).college);
  assert.equal(validatePostForm({ ...VALID, college: '' }).college, undefined);
  assert.equal(validatePostForm({ ...VALID, college: 'IIT Delhi' }, true).college, undefined);
});
