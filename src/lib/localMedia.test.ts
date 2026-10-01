import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isLocalMediaUrl,
  localMediaKind,
  toPersistableUrl,
  toPersistableDeep,
} from './localMedia';
import { isDirectMediaUrl, mediaKind } from './media';

test('isLocalMediaUrl only matches kala-idb refs', () => {
  assert.equal(isLocalMediaUrl('kala-idb:1-a.jpg'), true);
  assert.equal(isLocalMediaUrl('blob:http://localhost/xyz'), false);
  assert.equal(isLocalMediaUrl('https://res.cloudinary.com/x.jpg'), false);
  assert.equal(isLocalMediaUrl(undefined), false);
});

test('localMediaKind reads kind from the stable ref extension', () => {
  assert.equal(localMediaKind('kala-idb:1712-a.mp4'), 'video');
  assert.equal(localMediaKind('kala-idb:1712-b.jpeg'), 'image');
  assert.equal(localMediaKind('kala-idb:1712-c.mp3'), 'audio');
  assert.equal(localMediaKind('https://x.com/pic.jpg'), null);
  assert.equal(localMediaKind('blob:http://localhost/unregistered'), null);
});

test('toPersistableUrl passes stable/http through and drops unknown blobs', () => {
  assert.equal(toPersistableUrl('kala-idb:1-a.jpg'), 'kala-idb:1-a.jpg');
  assert.equal(toPersistableUrl('https://x.com/a.jpg'), 'https://x.com/a.jpg');
  // blob: URL with no registered stable ref (stale) is not persistable
  assert.equal(toPersistableUrl('blob:http://localhost/stale'), null);
  assert.equal(toPersistableUrl(null), null);
});

test('toPersistableDeep translates nested live refs and drops dead blobs', () => {
  const out = toPersistableDeep({
    gallery: ['kala-idb:1-a.jpg', 'blob:http://localhost/dead'],
    profile: { avatar: 'https://x.com/a.jpg', reel: null },
    count: 3,
  });
  assert.deepEqual(out, {
    gallery: ['kala-idb:1-a.jpg', undefined],
    profile: { avatar: 'https://x.com/a.jpg', reel: null },
    count: 3,
  });
});

test('media.ts recognizes kala-idb urls directly', () => {
  assert.equal(isDirectMediaUrl('kala-idb:1-a.mp4'), true);
  assert.equal(mediaKind('kala-idb:1-a.mp4'), 'video');
  assert.equal(mediaKind('kala-idb:1-a.png'), 'image');
  assert.equal(mediaKind('blob:http://localhost/xyz'), 'video'); // unregistered blob defaults
});
