import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateEventJudgeQr } from './judge';

test('judge QR includes the exact event and access code in its share URL', async () => {
  const eventId = 'event-from-another-device';
  const accessCode = `JDG-${'A1B2'.repeat(8)}`;
  const { qrDataUrl, shareUrl } = await generateEventJudgeQr(
    eventId,
    accessCode,
    'https://kala.example'
  );
  const url = new URL(shareUrl);

  assert.equal(url.searchParams.get('portal'), 'judge');
  assert.equal(url.searchParams.get('event'), eventId);
  assert.equal(url.searchParams.get('code'), accessCode);
  assert.match(qrDataUrl, /^data:image\/png;base64,/);
});
