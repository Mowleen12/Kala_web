// Curated skill taxonomy for artist profiles — edit freely, order is the
// default suggestion order (grouped by creative department).
export const SKILL_SUGGESTIONS: string[] = [
  // Music & Dance
  'Hindustani Vocals',
  'Carnatic Vocals',
  'Light Music Vocals',
  'Indie Vocals',
  'Folk Singing',
  'Choral Conducting',
  'Sitar',
  'Sarod',
  'Tabla',
  'Pakhawaj',
  'Harmonium',
  'Violin',
  'Flute',
  'Santoor',
  'Keyboard',
  'Guitar',
  'Bass Guitar',
  'Drums',
  'Percussion',
  'Bharatanatyam',
  'Kathak',
  'Odissi',
  'Kuchipudi',
  'Mohiniyattam',
  'Kathakali',
  'Contemporary Dance',
  'Folk Dance',
  'Hip-Hop Dance',
  'Ballet',
  'Bollywood Choreography',
  // Film & Photography
  'Videography',
  'Cinematography',
  'Documentary Film',
  'Short Films',
  'Video Editing',
  'Colour Grading',
  'Photography',
  'Portrait Photography',
  'Street Photography',
  'Event Photography',
  'Drone Videography',
  // Visual Arts
  'Painting',
  'Illustration',
  'Sketching',
  'Murals',
  'Sculpture',
  'Printmaking',
  'Mixed Media',
  'Calligraphy',
  'Pottery',
  'Textile Art',
  'Digital Art',
  // Theatre & Performance
  'Stage Acting',
  'Voice Over',
  'Storytelling',
  'Puppetry',
  'Street Theatre',
  'Directing',
  'Stage Management',
  'Live Sound',
  'Lighting Design',
  // Writing & Content
  'Songwriting',
  'Lyric Writing',
  'Screenwriting',
  'Playwriting',
  'Poetry',
  'Copywriting',
  'Content Writing',
  'Music Composition',
  'Arranging',
  // Design & Fashion
  'Graphic Design',
  'UI/UX Design',
  'Costume Design',
  'Set Design',
  'Fashion Design',
  'Typography',
  'Branding',
  'Motion Graphics',
  '3D Modelling',
  'Cinema 4D',
];

/**
 * Skills that match `query`, for the profile typeahead.
 * Prefix matches rank before substring matches; skills already on the
 * profile are excluded. Empty query returns the top of the list.
 */
export function suggestSkills(query: string, existing: string[] = [], cap = 8): string[] {
  const q = query.trim().toLowerCase();
  const have = new Set(existing.map((s) => s.toLowerCase()));
  const pool = SKILL_SUGGESTIONS.filter((s) => !have.has(s.toLowerCase()));
  if (!q) return pool.slice(0, cap);
  const starts: string[] = [];
  const contains: string[] = [];
  for (const s of pool) {
    const lower = s.toLowerCase();
    if (lower.startsWith(q)) starts.push(s);
    else if (lower.includes(q)) contains.push(s);
  }
  return [...starts, ...contains].slice(0, cap);
}
