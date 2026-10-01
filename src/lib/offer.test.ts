import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDateRange, buildCompensation, fmtTime12, PRICE_PRESETS } from './offer';

test('buildDateRange composes start/end/time', () => {
  assert.equal(buildDateRange('2026-11-18', '2026-11-22', '18:30'), '18 Nov – 22 Nov 2026 • 6:30 PM');
});

test('buildDateRange single day', () => {
  assert.equal(buildDateRange('2026-11-18', '', ''), '18 Nov 2026');
  assert.equal(buildDateRange('2026-11-18', '2026-11-18', '09:00'), '18 Nov 2026 • 9:00 AM');
});

test('buildDateRange empty start', () => {
  assert.equal(buildDateRange('', '2026-11-22', '18:30'), '');
});

test('fmtTime12 midnight/noon', () => {
  assert.equal(fmtTime12('00:15'), '12:15 AM');
  assert.equal(fmtTime12('12:00'), '12:00 PM');
  assert.equal(fmtTime12('23:59'), '11:59 PM');
});

test('buildCompensation presets pass through', () => {
  for (const [label, value] of Object.entries(PRICE_PRESETS)) {
    assert.equal(buildCompensation(label, '', ''), value);
  }
  assert.equal(buildCompensation('₹10k–25k', '', ''), '₹10,000 – ₹25,000');
});

test('buildCompensation custom range orders min/max', () => {
  assert.equal(buildCompensation('custom', '30000', '12000'), '₹12,000 – ₹30,000');
  assert.equal(buildCompensation('custom', '5000', '8000'), '₹5,000 – ₹8,000');
});
