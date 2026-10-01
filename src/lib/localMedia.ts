/**
 * Local-first media persistence for when Cloudinary is not configured.
 *
 * Uploads are stored as Blobs in IndexedDB (survives reloads and re-logins on
 * this browser) and referenced by a stable `kala-idb:<key>.<ext>` URL that is
 * safe to write into localStorage, drafts, and the Supabase messages table.
 * Session code keeps rendering the live `blob:` object URL it got back;
 * `toPersistableUrl` swaps object URLs for the stable ref at write time, and
 * `resolveMediaUrl` swaps stable refs back into object URLs at load time.
 */

const PREFIX = 'kala-idb:';
const DB_NAME = 'kala-media';
const STORE = 'files';

/** blob: object URL -> stable kala-idb: URL (session-scoped) */
const stableByObjectUrl = new Map<string, string>();
/** stable kala-idb: URL -> live blob: object URL (session-scoped) */
const objectUrlByStable = new Map<string, string>();

export const isLocalMediaUrl = (url: string | null | undefined): boolean =>
  !!url && url.startsWith(PREFIX);

const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'm4v']);
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'm4a']);

/**
 * Kind of a LOCAL media reference (live blob: object URL or stable kala-idb:
 * ref) based on the extension kept in its IndexedDB key; null for everything
 * else. blob: URLs have no extension, so callers fall back to their own logic.
 */
export function localMediaKind(url: string | null | undefined): 'image' | 'video' | 'audio' | null {
  if (!url) return null;
  const ref = url.startsWith('blob:')
    ? stableByObjectUrl.get(url)
    : url.startsWith(PREFIX)
      ? url
      : null;
  if (!ref) return null;
  const ext = (ref.split('.').pop() || '').toLowerCase();
  if (VIDEO_EXTS.has(ext)) return 'video';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  if (IMAGE_EXTS.has(ext)) return 'image';
  return null;
}

/** Stable ref for a live object URL, or the input itself when already stable. */
export function toPersistableUrl(
  url: string | null | undefined
): string | null | undefined {
  if (!url) return url;
  if (url.startsWith(PREFIX)) return url;
  if (url.startsWith('blob:')) return stableByObjectUrl.get(url) ?? null;
  return url;
}

/** Deep write-time translation: live object URLs -> stable refs, dead blobs dropped. */
export function toPersistableDeep<T>(value: T): T {
  return walk(value, (s) => {
    const t = toPersistableUrl(s);
    return t === null ? undefined : t;
  }) as T;
}

/** Deep load-time translation: stable refs -> live object URLs. Non-local values untouched. */
export async function resolveMediaUrlDeep<T>(value: T): Promise<T> {
  const replacements = new Map<string, string>();
  collectLocalRefs(value, replacements);
  if (replacements.size === 0) return value;
  for (const [ref] of replacements) {
    replacements.set(ref, (await resolveMediaUrl(ref)) ?? ref);
  }
  return walk(value, (s) => replacements.get(s) ?? s) as T;
}

/** Stable ref -> live object URL (cached per session); everything else passes through. */
export async function resolveMediaUrl(url: string | null | undefined): Promise<string | null | undefined> {
  if (!url || !url.startsWith(PREFIX)) return url;
  const cached = objectUrlByStable.get(url);
  if (cached) return cached;
  try {
    const blob = await idbGet(url.slice(PREFIX.length));
    if (!blob) return undefined;
    const objectUrl = URL.createObjectURL(blob);
    objectUrlByStable.set(url, objectUrl);
    stableByObjectUrl.set(objectUrl, url);
    return objectUrl;
  } catch {
    return undefined;
  }
}

/** Persist a file in IndexedDB; returns the live object URL for immediate rendering. */
export async function storeLocalMedia(file: File): Promise<string> {
  const ext =
    (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '') ||
    (file.type.startsWith('video/') ? 'mp4' : file.type.startsWith('audio/') ? 'mp3' : 'jpg');
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const stableUrl = `${PREFIX}${key}`;
  await idbPut(key, file);
  const objectUrl = URL.createObjectURL(file);
  objectUrlByStable.set(stableUrl, objectUrl);
  stableByObjectUrl.set(objectUrl, stableUrl);
  return objectUrl;
}

/* -------------------------------------------------------------------------- */
/* helpers                                                                     */
/* -------------------------------------------------------------------------- */

function walk(value: unknown, fn: (s: string) => unknown): unknown {
  if (typeof value === 'string') return fn(value);
  if (Array.isArray(value)) return value.map((v) => walk(v, fn));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = walk(v, fn);
    return out;
  }
  return value;
}

function collectLocalRefs(value: unknown, into: Map<string, string>): void {
  if (typeof value === 'string') {
    if (value.startsWith(PREFIX)) into.set(value, value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectLocalRefs(v, into));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => collectLocalRefs(v, into));
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function idbPut(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key: string): Promise<Blob | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
}
