import { getDraft } from './drafts';
import { ProfileMedia } from '../components/ProfileView';
import { isLocalMediaUrl, resolveMediaUrl, toPersistableUrl } from './localMedia';
import { uploadToCloudinary } from './cloudinary';
import { supabase } from './supabase';

export interface ProfileFields {
  name?: string;
  location?: string;
  bio?: string;
  skills?: string[];
  avatar?: string;
  reel?: string;
  gallery?: string[];
}

/**
 * Profile completion is derived from what actually exists — never a stored
 * magic number. Every field below is one the user can genuinely fill in.
 */
export function computeProfileCompletion(fields: ProfileFields): number {
  const checks = [
    Boolean(fields.name?.trim()),
    Boolean(fields.location?.trim()),
    Boolean(fields.bio?.trim()),
    (fields.skills?.length ?? 0) > 0,
    Boolean(fields.avatar),
    Boolean(fields.reel),
    (fields.gallery?.length ?? 0) > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function loadProfileText(profileKey: string): { name?: string; location?: string; bio?: string } {
  return getDraft<{ name?: string; location?: string; bio?: string }>(`kala_profile_text_${profileKey}`) || {};
}

export function loadProfileSkills(profileKey: string): string[] {
  return getDraft<string[]>(`kala_skills_${profileKey}`) || [];
}

/** Boot-time completion for the signed-in user (text drafts + media). */
export function initialProfileCompletion(profileKey: string, media: ProfileMedia, name?: string): number {
  const text = loadProfileText(profileKey);
  return computeProfileCompletion({
    name: name || text.name,
    location: text.location,
    bio: text.bio,
    skills: loadProfileSkills(profileKey),
    avatar: media.avatar,
    reel: media.reel,
    gallery: media.gallery,
  });
}

/* -------------------------------------------------------------------------- */
/* Account-associated avatar persistence                                       */
/* -------------------------------------------------------------------------- */

/** True when a URL can only ever resolve in the browser that created it. */
export function isDeviceLocalAvatarUrl(url: string | null | undefined): boolean {
  return !!url && (isLocalMediaUrl(url) || url.startsWith('blob:'));
}

/**
 * Write the avatar URL onto the user's Supabase account (auth metadata +
 * profiles row) so it survives logout/login on every device, not just the
 * browser's localStorage. Failures are swallowed — the local copy still works.
 *
 * Only shared (hosted) URLs are ever written: a `blob:`/`kala-idb:` ref can
 * only resolve inside the browser that produced it, so binding one to the
 * account would guarantee a broken avatar on the next sign-in.
 */
export async function persistAvatarToAccount(url: string | null | undefined): Promise<void> {
  if (!supabase) return;
  if (url && isDeviceLocalAvatarUrl(url)) return; // call upgradeLocalAvatarToHosted first
  const value = url || null;
  try {
    // `kala_avatar_url` is provider-safe; `avatar_url` is kept in sync for
    // email/password accounts and for anything already reading it.
    await supabase.auth.updateUser({
      data: { kala_avatar_url: value, avatar_url: value },
    });
  } catch {}
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ avatar_url: value, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }
  } catch {}
}

/**
 * The avatar bound to the account (profiles row) — the cross-device copy that
 * survives a cleared localStorage or a fresh browser. Null when unavailable.
 */
export async function fetchAccountAvatar(userId: string): Promise<string | null> {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .maybeSingle();
    if (error) return null;
    const url = (data as { avatar_url?: string | null } | null)?.avatar_url;
    return url && !isDeviceLocalAvatarUrl(url) ? url : null;
  } catch {
    return null;
  }
}

/**
 * Device-local refs (IndexedDB blobs from the pre-session signup flow) are
 * re-hosted into the shared media bucket once a session exists, and the
 * account metadata is updated to the hosted URL. Returns the hosted URL, or
 * null when nothing needed upgrading (or the upgrade failed).
 */
export async function upgradeLocalAvatarToHosted(url: string | null | undefined): Promise<string | null> {
  if (!url || !isDeviceLocalAvatarUrl(url)) return null;
  try {
    const resolved = (await resolveMediaUrl(url)) as string | undefined;
    if (!resolved?.startsWith('blob:')) return null;
    const blob = await (await fetch(resolved)).blob();
    const ext =
      (blob.type.split('/').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '') ||
      (isLocalMediaUrl(url) ? (url.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '') : '') ||
      'jpg';
    const file = new File([blob], `avatar.${ext}`, { type: blob.type || 'image/jpeg' });
    const result = await uploadToCloudinary(file, { folder: 'kala-avatars', resourceType: 'image' });
    await persistAvatarToAccount(result.secureUrl);
    return result.secureUrl;
  } catch {
    return null;
  }
}
