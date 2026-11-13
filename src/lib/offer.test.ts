import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildDateRange,
  buildCompensation,
  fmtTime12,
  formatTimeRange,
  PRICE_PRESETS,
  CALL_TYPES,
  callTypeLabel,
  isCallType,
} from './offer';

test('buildDateRange composes start/end/time', () => {
  assert.equal(buildDateRange('2026-11-18', '2026-11-22', '18:30'), '18 Nov – 22 Nov 2026 • 6:30 PM');
});

test('buildDateRange renders an explicit time window', () => {
  assert.equal(
    buildDateRange('2026-11-18', '2026-11-18', '18:30', '21:00'),
    '18 Nov 2026 • 6:30 PM – 9:00 PM'
  );
});

test('formatTimeRange handles one-sided and empty windows', () => {
  assert.equal(formatTimeRange('', ''), '');
  assert.equal(formatTimeRange('09:00', ''), '9:00 AM');
  assert.equal(formatTimeRange('', '21:15'), '9:15 PM');
  assert.equal(formatTimeRange('10:00', '10:00'), '10:00 AM');
});

test('call type helpers stay in sync with the options list', () => {
  for (const type of CALL_TYPES) {
    assert.ok(isCallType(type.value), `${type.value} should be a valid call type`);
    assert.equal(callTypeLabel(type.value), type.label);
  }
  assert.equal(isCallType('screening'), false);
  assert.equal(callTypeLabel(undefined), 'Open call');
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

test('schema.sql call_type constraint allows every frontend call type', () => {
  const sql = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');
  const match = sql.match(/call_type in\s*\(([^)]*)\)/);
  assert.ok(match, 'call_type check constraint not found in schema.sql');
  const allowed = (match[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
  for (const type of CALL_TYPES) {
    assert.ok(
      allowed.includes(type.value),
      `schema.sql opportunities_call_type_chk is missing '${type.value}' — posting this call type fails at the DB`
    );
  }
});
