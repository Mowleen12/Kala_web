import { Application } from '../types';

export interface ScoutArtist {
  id: string;
  name: string;
  avatar?: string | null;
  role: string;
  location: string;
  experienceYears: number | null;
  skills: string[];
  pitch: string;
  rating: number | null;
  applicationCount: number;
  latestAppliedDate: string;
  reelUrl?: string | null;
}

/** Collapse an organiser's applications into one roster entry per artist. */
export const buildScoutArtists = (applicants: Application[]): ScoutArtist[] => {
  const byArtist = new Map<string, ScoutArtist>();
  for (const app of applicants) {
    const key = app.artistId || app.artistName;
    const existing = byArtist.get(key);
    if (existing) {
      existing.applicationCount += 1;
      if (app.rating && (!existing.rating || app.rating > existing.rating)) existing.rating = app.rating;
      if (!existing.reelUrl && app.reelUrl) existing.reelUrl = app.reelUrl;
      for (const s of app.skills) if (!existing.skills.includes(s)) existing.skills.push(s);
      continue;
    }
    byArtist.set(key, {
      id: key,
      name: app.artistName,
      avatar: app.artistAvatar,
      role: app.artistRole || 'Artist',
      location: app.artistLocation || 'Location not specified',
      experienceYears: app.experienceYears ?? null,
      skills: [...app.skills],
      pitch: app.pitch,
      rating: app.rating ?? null,
      applicationCount: 1,
      latestAppliedDate: app.appliedDate,
      reelUrl: app.reelUrl,
    });
  }
  return [...byArtist.values()];
};
