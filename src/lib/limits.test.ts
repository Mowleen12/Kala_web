import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
  USER_MONTHLY_BYTES,
  MEDIA_PER_THREAD,
  MESSAGES_PER_THREAD,
  isVideoFile,
  maxBytesFor,
  remaining,
  formatMB,
} from './limits';

const MB = 1024 * 1024;

function fakeFile(name: string, type: string): File {
  return new File(['x'], name, { type });
}

test('video ceiling is exactly 40 MB — Cloudinary Free transform limit', () => {
  assert.equal(VIDEO_MAX_BYTES, 40 * MB);
  assert.ok(VIDEO_MAX_BYTES <= 40 * MB, 'video cap must not exceed the transform ceiling');
});

test('image ceiling is exactly 5 MB and sits below Cloudinary Free 10 MB', () => {
  assert.equal(IMAGE_MAX_BYTES, 5 * MB);
  assert.ok(IMAGE_MAX_BYTES <= 10 * MB);
});

test('monthly budget is 100 MB', () => {
  assert.equal(USER_MONTHLY_BYTES, 100 * MB);
});

test('thread caps', () => {
  assert.equal(MEDIA_PER_THREAD, 20);
  assert.equal(MESSAGES_PER_THREAD, 200);
});

test('isVideoFile detects by MIME type', () => {
  assert.equal(isVideoFile(fakeFile('reel.mp4', 'video/mp4')), true);
  assert.equal(isVideoFile(fakeFile('still.jpg', 'image/jpeg')), false);
});

test('isVideoFile falls back to extension when the browser reports no MIME type', () => {
  assert.equal(isVideoFile(fakeFile('take.MOV', '')), true);
  assert.equal(isVideoFile(fakeFile('take.webm', '')), true);
  assert.equal(isVideoFile(fakeFile('portrait.png', '')), false);
});

test('maxBytesFor picks the cap from the detected media type', () => {
  assert.equal(maxBytesFor(fakeFile('reel.mp4', 'video/mp4')), VIDEO_MAX_BYTES);
  assert.equal(maxBytesFor(fakeFile('portrait.png', 'image/png')), IMAGE_MAX_BYTES);
});

test('remaining never goes negative', () => {
  assert.equal(remaining(0), USER_MONTHLY_BYTES);
  assert.equal(remaining(50 * MB), 50 * MB);
  assert.equal(remaining(USER_MONTHLY_BYTES), 0);
  assert.equal(remaining(USER_MONTHLY_BYTES + 1), 0);
});

test('formatMB renders one decimal place', () => {
  assert.equal(formatMB(0), '0.0 MB');
  assert.equal(formatMB(5 * MB), '5.0 MB');
  assert.equal(formatMB(40 * MB), '40.0 MB');
});
