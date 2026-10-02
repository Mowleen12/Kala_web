import { getDraft } from './drafts';
import { ProfileMedia } from '../components/ProfileView';

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
