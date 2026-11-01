import test from 'node:test';
import assert from 'node:assert/strict';
import { safeHttpUrl } from './media';

// A portfolio/reel link is typed by one user and rendered for another, so the
// only URLs allowed to reach an href are plain http(s).

test('accepts http and https links', () => {
  assert.equal(safeHttpUrl('https://portfolio.example.com/work'), 'https://portfolio.example.com/work');
  assert.equal(safeHttpUrl('http://example.com/a?b=1'), 'http://example.com/a?b=1');
});

test('rejects script-bearing schemes', () => {
  assert.equal(safeHttpUrl('javascript:alert(document.cookie)'), null);
  assert.equal(safeHttpUrl('JaVaScRiPt:alert(1)'), null);
  assert.equal(safeHttpUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(safeHttpUrl('vbscript:msgbox(1)'), null);
});

test('rejects device-local and relative refs', () => {
  assert.equal(safeHttpUrl('blob:https://kala.app/1234'), null);
  assert.equal(safeHttpUrl('kala-idb:123.jpg'), null);
  assert.equal(safeHttpUrl('/applications'), null);
  assert.equal(safeHttpUrl('example.com/work'), null);
});

test('rejects empty input', () => {
  assert.equal(safeHttpUrl(''), null);
  assert.equal(safeHttpUrl(null), null);
  assert.equal(safeHttpUrl(undefined), null);
});
