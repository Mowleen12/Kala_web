import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Star, 
  MapPin, 
  CheckCircle2, 
  Send, 
  Sparkles, 
  SlidersHorizontal, 
  Check,
  X,
  ShieldCheck,
  Play
} from 'lucide-react';
import { TALENT_POOL } from '../data/mockData';
import { Opportunity } from '../types';
import { KalaStar } from './KalaLogo';

interface OrganiserTalentScoutViewProps {
  opportunities: Opportunity[];
  onInviteArtist: (artistName: string, oppTitle: string) => void;
}

export const OrganiserTalentScoutView: React.FC<OrganiserTalentScoutViewProps> = ({
  opportunities,
  onInviteArtist,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [minRating, setMinRating] = useState<string>('All');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'rating' | 'followers' | 'name'>('rating');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [inviteModalArtist, setInviteModalArtist] = useState<any | null>(null);
  const [selectedOppId, setSelectedOppId] = useState<string>(opportunities[0]?.id || '');
  const [invitedList, setInvitedList] = useState<string[]>([]);

  const allTags = ['All', 'Violin', 'Sound Design', 'Weaving', 'Cinematography', 'Fusion Composition'];
  const cities = ['All', 'Bengaluru', 'Mumbai', 'Pune', 'Leh'];

  const activeFilterCount = [
    selectedTag !== 'All',
    selectedCity !== 'All',
    minRating !== 'All',
    verifiedOnly,
    searchQuery.trim().length > 0,
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setSelectedTag('All');
    setSelectedCity('All');
    setMinRating('All');
    setVerifiedOnly(false);
    setSearchQuery('');
    setSortBy('rating');
  };

  const filteredArtists = useMemo(() => {
    let list = TALENT_POOL.filter((artist) => {
      const matchesSearch =
        !searchQuery.trim() ||
        artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag =
        selectedTag === 'All' ||
        artist.tags.some(t => t.toLowerCase().includes(selectedTag.toLowerCase()));

      const matchesCity =
        selectedCity === 'All' ||
        artist.location.toLowerCase().includes(selectedCity.toLowerCase());

      let matchesRating = true;
      if (minRating === '4.8') matchesRating = artist.rating >= 4.8;
      if (minRating === '4.9') matchesRating = artist.rating >= 4.9;

      const matchesVerified = !verifiedOnly || artist.verified;

      return matchesSearch && matchesTag && matchesCity && matchesRating && matchesVerified;
    });

    if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'followers') {
      const parseFollowers = (str: string) => {
        if (str.includes('k')) return parseFloat(str) * 1000;
        return parseFloat(str) || 0;
      };
      list.sort((a, b) => parseFollowers(b.followers) - parseFollowers(a.followers));
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [searchQuery, selectedTag, selectedCity, minRating, verifiedOnly, sortBy]);

  const handleSendInvite = () => {
    if (!inviteModalArtist) return;
    const opp = opportunities.find(o => o.id === selectedOppId) || opportunities[0];
    onInviteArtist(inviteModalArtist.name, opp.title);
    setInvitedList(prev => [...prev, inviteModalArtist.id]);
    setInviteModalArtist(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EDE8E0] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#E45826] uppercase tracking-wider mb-1">
              <KalaStar size={14} className="text-[#E45826]" />
              Verified Creator Network
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
              Direct Talent Scout
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Browse pre-screened creators, listen to high-fidelity audio reels, and directly invite them to your audition calls.
            </p>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-[#FFF8F5] border border-[#FCDFD1] text-xs font-bold text-[#E45826] flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>12,400+ Verified Artists</span>
          </div>
        </div>
      </div>

      {/* Main Filter & Tag Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Discipline / Tag Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                selectedTag === tag
                  ? 'bg-[#E45826] text-white shadow-2xs'
                  : 'bg-white text-zinc-600 hover:text-zinc-900 border border-[#E0D9CD]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Search, Filter Drawer Toggle & Sort */}
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
              isFilterOpen || activeFilterCount > 0
                ? 'bg-[#FDEEE7] text-[#E45826] border-[#FAD7C8]'
                : 'bg-white text-zinc-700 hover:text-zinc-900 border-[#E0D9CD]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4.5 h-4.5 rounded-full bg-[#E45826] text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-white border border-[#E0D9CD] rounded-2xl text-xs font-semibold text-zinc-800 outline-none cursor-pointer focus:border-[#E45826]"
          >
            <option value="rating">Highest Rated</option>
            <option value="followers">Most Followed</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Advanced Filter Drawer */}
      {isFilterOpen && (
        <div className="bg-white rounded-3xl p-6 border border-[#EDE8E0] shadow-md space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#E45826]" />
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Artist Discovery Filters
              </span>
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={resetAllFilters}
                className="text-xs text-[#E45826] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Reset all filters</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* City */}
            <div>
              <label className="text-xs font-bold text-zinc-600 block mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#E45826]" />
                Location
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-[#E45826]"
              >
                {cities.map((c) => (
                  <option key={c} value={c}>{c === 'All' ? 'All Locations' : c}</option>
                ))}
              </select>
            </div>

            {/* Minimum Rating */}
            <div>
              <label className="text-xs font-bold text-zinc-600 block mb-1.5 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                Minimum Rating
              </label>
              <select
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-[#E45826]"
              >
                <option value="All">All Ratings</option>
                <option value="4.8">4.8+ Stars</option>
                <option value="4.9">4.9+ Stars (Top 5%)</option>
              </select>
            </div>

            {/* Verified Badge */}
            <div className="flex flex-col justify-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-800">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-[#E45826] focus:ring-[#E45826] border-zinc-300"
                />
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-[#E45826]" />
                  Verified Portfolios Only
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-zinc-400 font-medium">Active:</span>

          {selectedTag !== 'All' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>Tag: {selectedTag}</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setSelectedTag('All')} />
            </span>
          )}

          {selectedCity !== 'All' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>City: {selectedCity}</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setSelectedCity('All')} />
            </span>
          )}

          {minRating !== 'All' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>Rating: {minRating}+ Stars</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setMinRating('All')} />
            </span>
          )}

          {verifiedOnly && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>Verified Portfolios</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setVerifiedOnly(false)} />
            </span>
          )}

          {searchQuery.trim() && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>"{searchQuery}"</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setSearchQuery('')} />
            </span>
          )}

          <button
            onClick={resetAllFilters}
            className="text-xs text-zinc-500 hover:text-[#E45826] font-medium underline ml-1 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Talent Cards Grid */}
      {filteredArtists.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#EDE8E0]">
          <KalaStar size={32} className="text-zinc-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-800 mb-1">No artists match your criteria</h3>
          <p className="text-xs text-zinc-500 mb-4">Try clearing filters or search for another instrument or discipline.</p>
          <button
            onClick={resetAllFilters}
            className="px-5 py-2 rounded-full bg-[#E45826] text-white text-xs font-semibold cursor-pointer shadow-xs hover:bg-[#D44716]"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredArtists.map((artist) => {
            const hasBeenInvited = invitedList.includes(artist.id);

            return (
              <div
                key={artist.id}
                className="bg-white rounded-3xl border border-[#EDE8E0] p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3.5">
                      <img
                        src={artist.avatar}
                        alt={artist.name}
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-[#FCEEE3] shrink-0"
                      />
                      <div>
                        <h3 className="text-base font-bold text-zinc-900 flex items-center gap-1.5">
                          {artist.name}
                          {artist.verified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#E45826] fill-[#E45826]/10" />
                          )}
                        </h3>
                        <p className="text-xs font-medium text-zinc-600 mt-0.5">
                          {artist.role}
                        </p>
                        <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {artist.location}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{artist.rating}</span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2 mb-4">
                    "{artist.bio}"
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {artist.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FAF8F5] border border-[#EDE8E0] text-zinc-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                  <div className="text-xs text-zinc-500 font-medium">
                    <strong className="text-zinc-900 font-bold">{artist.followers}</strong> followers
                  </div>

                  {hasBeenInvited ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <Check className="w-3.5 h-3.5" />
                      Audition Sent
                    </span>
                  ) : (
                    <button
                      onClick={() => setInviteModalArtist(artist)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#E45826] hover:bg-[#D44716] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>Invite to Call</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      {inviteModalArtist && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#EDE8E0] animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#E45826]">
                  Direct Audition Invitation
                </span>
                <h3 className="text-lg font-bold text-zinc-950 mt-0.5">
                  Invite {inviteModalArtist.name}
                </h3>
              </div>
              <button
                onClick={() => setInviteModalArtist(null)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-600 mb-4">
              Choose which open production call you want to invite <strong>{inviteModalArtist.name}</strong> to audition for.
            </p>

            <div className="space-y-3 mb-6">
              <label className="text-xs font-bold text-zinc-700 block">
                Select Active Opportunity
              </label>
              <select
                value={selectedOppId}
                onChange={(e) => setSelectedOppId(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-zinc-800 outline-none focus:border-[#E45826]"
              >
                {opportunities.map((opp) => (
                  <option key={opp.id} value={opp.id}>
                    {opp.title} ({opp.compensation})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setInviteModalArtist(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvite}
                className="px-5 py-2 rounded-xl bg-[#E45826] hover:bg-[#D44716] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Formal Invitation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
