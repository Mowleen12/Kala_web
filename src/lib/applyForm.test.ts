import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateApplyForm, ApplyFormFields } from './applyForm';

const VALID: ApplyFormFields = {
  experienceYears: '4',
  city: 'Mumbai',
  skills: 'Carnatic Vocals, Sitar',
};

test('valid form returns no errors', () => {
  assert.deepEqual(validateApplyForm(VALID), {});
});

test('every required field is reported when empty', () => {
  const errors = validateApplyForm({ experienceYears: '', city: '   ', skills: '' });
  assert.ok(errors.experienceYears);
  assert.ok(errors.city);
  assert.ok(errors.skills);
});

test('skills made only of commas and spaces count as empty', () => {
  assert.ok(validateApplyForm({ ...VALID, skills: ' ,  , ' }).skills);
});

test('experience must be a number between 0 and 70', () => {
  assert.ok(validateApplyForm({ ...VALID, experienceYears: 'abc' }).experienceYears);
  assert.ok(validateApplyForm({ ...VALID, experienceYears: '-1' }).experienceYears);
  assert.ok(validateApplyForm({ ...VALID, experienceYears: '71' }).experienceYears);
  assert.equal(validateApplyForm({ ...VALID, experienceYears: '0' }).experienceYears, undefined);
});
