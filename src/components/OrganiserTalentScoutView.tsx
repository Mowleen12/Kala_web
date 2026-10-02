import React, { useState, useMemo } from 'react';
import { Search, Star, MapPin, Users, SlidersHorizontal, X, ExternalLink } from 'lucide-react';
import { ApplicantReview } from '../types';
import { buildScoutArtists } from '../lib/scout';
import { KalaStar } from './KalaLogo';

interface OrganiserTalentScoutViewProps {
  applicants: ApplicantReview[];
  onReviewApplicants: () => void;
}

export const OrganiserTalentScoutView: React.FC<OrganiserTalentScoutViewProps> = ({
  applicants,
  onReviewApplicants,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'rating' | 'experience' | 'name'>('rating');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const artists = useMemo(() => buildScoutArtists(applicants), [applicants]);

  const skillOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of artists) for (const s of a.skills) counts.set(s, (counts.get(s) || 0) + 1);
    return [...counts.entries()]
      .sort((x, y) => y[1] - x[1])
      .slice(0, 8)
      .map(([s]) => s);
  }, [artists]);

  const filteredArtists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = artists.filter((artist) => {
      const matchesSearch =
        !q ||
        artist.name.toLowerCase().includes(q) ||
        artist.role.toLowerCase().includes(q) ||
        artist.location.toLowerCase().includes(q) ||
        artist.skills.some((s) => s.toLowerCase().includes(q));
      const matchesSkill =
        selectedSkill === 'All' || artist.skills.some((s) => s.toLowerCase() === selectedSkill.toLowerCase());
      return matchesSearch && matchesSkill;
    });

    if (sortBy === 'rating') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'experience') {
      list.sort((a, b) => (b.experienceYears || 0) - (a.experienceYears || 0));
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [artists, searchQuery, selectedSkill, sortBy]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EDE8E0] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#E45826] uppercase tracking-wider mb-1">
              <KalaStar size={14} className="text-[#E45826]" />
              Your Applicant Network
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
              Talent Scout
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Every artist who has applied to your calls, in one roster. Open a review to listen to reels and message them.
            </p>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-[#FFF8F5] border border-[#FCDFD1] text-xs font-bold text-[#E45826] flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{artists.length} artist{artists.length === 1 ? '' : 's'} in your pipeline</span>
          </div>
        </div>
      </div>

      {/* Search / Filter / Sort */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedSkill('All')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              selectedSkill === 'All'
                ? 'bg-[#E45826] text-white shadow-2xs'
                : 'bg-white text-zinc-600 hover:text-zinc-900 border border-[#E0D9CD]'
            }`}
          >
            All
          </button>
          {skillOptions.map((skill) => (
            <button
              key={skill}
              onClick={() => setSelectedSkill(skill)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                selectedSkill === skill
                  ? 'bg-[#E45826] text-white shadow-2xs'
                  : 'bg-white text-zinc-600 hover:text-zinc-900 border border-[#E0D9CD]'
              }`}
            >
              {skill}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by instrument, role, or city..."
              className="w-full pl-9.5 pr-4 py-2 bg-white border border-[#E0D9CD] rounded-2xl text-xs text-zinc-800 outline-none focus:border-[#E45826]"
            />
          </div>

          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
              isFilterOpen || selectedSkill !== 'All' || searchQuery.trim()
                ? 'bg-[#FDEEE7] text-[#E45826] border-[#FAD7C8]'
                : 'bg-white text-zinc-700 hover:text-zinc-900 border border-[#E0D9CD]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Sort</span>
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'rating' | 'experience' | 'name')}
            className="px-3 py-2 bg-white border border-[#E0D9CD] rounded-2xl text-xs font-semibold text-zinc-800 outline-none cursor-pointer focus:border-[#E45826]"
          >
            <option value="rating">Highest Rated</option>
            <option value="experience">Most Experienced</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>
      </div>

      {isFilterOpen && (
        <div className="bg-white rounded-3xl p-5 border border-[#EDE8E0] shadow-md flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <span className="text-xs font-bold text-zinc-600">
            Sorting by {sortBy === 'rating' ? 'highest rating' : sortBy === 'experience' ? 'most experienced' : 'name'}
          </span>
          <button
            onClick={() => {
              setSelectedSkill('All');
              setSearchQuery('');
              setSortBy('rating');
            }}
            className="text-xs text-[#E45826] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Reset</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Talent Cards Grid */}
      {filteredArtists.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#EDE8E0]">
          <KalaStar size={32} className="text-zinc-300 mx-auto mb-3" />
          {artists.length === 0 ? (
            <>
              <h3 className="text-base font-bold text-zinc-800 mb-1">No applicants yet</h3>
              <p className="text-xs text-zinc-500 mb-4">
                Artists who apply to your calls appear here as a searchable roster.
              </p>
              <button
                onClick={onReviewApplicants}
                className="px-5 py-2 rounded-full bg-[#E45826] text-white text-xs font-semibold cursor-pointer shadow-xs hover:bg-[#D44716]"
              >
                Go to Applicant Review
              </button>
            </>
          ) : (
            <>
              <h3 className="text-base font-bold text-zinc-800 mb-1">No artists match your criteria</h3>
              <p className="text-xs text-zinc-500 mb-4">Try clearing filters or search for another instrument.</p>
              <button
                onClick={() => {
                  setSelectedSkill('All');
                  setSearchQuery('');
                }}
                className="px-5 py-2 rounded-full bg-[#E45826] text-white text-xs font-semibold cursor-pointer shadow-xs hover:bg-[#D44716]"
              >
                Clear Filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredArtists.map((artist) => (
            <div
              key={artist.id}
              className="bg-white rounded-3xl border border-[#EDE8E0] p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-start gap-3.5">
                    {artist.avatar ? (
                      <img
                        src={artist.avatar}
                        alt={artist.name}
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-[#FCEEE3] shrink-0"
                      />
                    ) : (
                      <span className="w-14 h-14 rounded-2xl bg-[#FDEEE7] text-[#E45826] text-xl font-extrabold flex items-center justify-center ring-2 ring-[#FCEEE3] shrink-0">
                        {artist.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <h3 className="text-base font-bold text-zinc-900">{artist.name}</h3>
                      <p className="text-xs font-medium text-zinc-600 mt-0.5">{artist.role}</p>
                      <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {artist.location}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700 shrink-0">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{artist.rating ?? '—'}</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2 mb-4">
                  "{artist.pitch}"
                </p>

                <div className="flex flex-wrap gap-1.5 mb-5">
                  {artist.skills.length === 0 && (
                    <span className="text-[11px] text-zinc-400">No skills listed</span>
                  )}
                  {artist.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FAF8F5] border border-[#EDE8E0] text-zinc-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-2">
                <div className="text-xs text-zinc-500 font-medium">
                  <strong className="text-zinc-900 font-bold">{artist.applicationCount}</strong>{' '}
                  application{artist.applicationCount === 1 ? '' : 's'}
                  {artist.experienceYears != null && (
                    <> · <strong className="text-zinc-900 font-bold">{artist.experienceYears}</strong> yrs exp</>
                  )}
                </div>

                <button
                  onClick={onReviewApplicants}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#E45826] hover:bg-[#D44716] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Review</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
