import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Search, 
  CheckCircle2, 
  MapPin, 
  Star, 
  Play, 
  ExternalLink, 
  Mail, 
  Phone, 
  SlidersHorizontal, 
  Sparkles,
  Calendar,
  Clock,
  XCircle,
  FileText,
  X,
  Award,
  Music,
  MessageSquare
} from 'lucide-react';
import { ApplicantReview, Opportunity, Thread } from '../types';
import { KalaStar } from './KalaLogo';
import { MediaPreview } from './MediaPreview';
import { isUnread } from '../lib/threads';
import { getOptimizedCloudinaryUrl } from '../lib/cloudinary';
import { isDirectMediaUrl, mediaKind, linkHost } from '../lib/media';

interface OrganiserApplicantsViewProps {
  applicants: ApplicantReview[];
  opportunities: Opportunity[];
  onUpdateApplicantStatus: (applicantId: string, newStatus: ApplicantReview['status']) => void;
  threads: Thread[];
  onOpenThread?: (opportunityId: string, artistId: string) => void;
  selectedOpportunityId?: string;
}

export const OrganiserApplicantsView: React.FC<OrganiserApplicantsViewProps> = ({
  applicants,
  opportunities,
  onUpdateApplicantStatus,
  threads,
  onOpenThread,
  selectedOpportunityId: initialOppId,
}) => {
  // Filter states
  const [selectedOppFilter, setSelectedOppFilter] = useState<string>(initialOppId || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [experienceFilter, setExperienceFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [hasReelFilter, setHasReelFilter] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'rating' | 'experience' | 'newest'>('rating');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Modal / Play state
  const [inspectApplicant, setInspectApplicant] = useState<ApplicantReview | null>(null);

  const cityOptions = ['all', 'Mumbai', 'Bengaluru', 'Delhi', 'Pune', 'Chennai'];

  // Count active filters
  const activeFilterCount = [
    selectedOppFilter !== 'all',
    statusFilter !== 'all',
    experienceFilter !== 'all',
    cityFilter !== 'all',
    ratingFilter !== 'all',
    hasReelFilter,
    searchQuery.trim().length > 0,
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setSelectedOppFilter('all');
    setStatusFilter('all');
    setExperienceFilter('all');
    setCityFilter('all');
    setRatingFilter('all');
    setHasReelFilter(false);
    setSearchQuery('');
    setSortBy('rating');
  };

  const filteredApplicants = useMemo(() => {
    let list = applicants.filter((app) => {
      // Opportunity filter
      const matchesOpp = selectedOppFilter === 'all' || app.opportunityId === selectedOppFilter;

      // Status filter
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;

      // Search Query
      const matchesSearch = 
        !searchQuery.trim() ||
        app.artistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.artistRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
        app.pitch.toLowerCase().includes(searchQuery.toLowerCase());

      // Experience filter
      let matchesExp = true;
      if (experienceFilter === 'emerging') {
        matchesExp = app.experienceYears <= 3;
      } else if (experienceFilter === 'mid') {
        matchesExp = app.experienceYears >= 4 && app.experienceYears <= 7;
      } else if (experienceFilter === 'senior') {
        matchesExp = app.experienceYears >= 8;
      }

      // City filter
      const matchesCity = 
        cityFilter === 'all' || 
        app.artistLocation.toLowerCase().includes(cityFilter.toLowerCase());

      // Rating filter
      let matchesRating = true;
      if (ratingFilter === '4.5') {
        matchesRating = (app.rating || 0) >= 4.5;
      } else if (ratingFilter === '4.8') {
        matchesRating = (app.rating || 0) >= 4.8;
      }

      // Has reel
      const matchesReel = !hasReelFilter || Boolean(app.reelUrl);

      return matchesOpp && matchesStatus && matchesSearch && matchesExp && matchesCity && matchesRating && matchesReel;
    });

    // Sorting
    if (sortBy === 'rating') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'experience') {
      list.sort((a, b) => b.experienceYears - a.experienceYears);
    }

    return list;
  }, [applicants, selectedOppFilter, statusFilter, experienceFilter, cityFilter, ratingFilter, hasReelFilter, sortBy, searchQuery]);

  const getStatusBadge = (status: ApplicantReview['status']) => {
    switch (status) {
      case 'under_review':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8] flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#E45826]" />
            Under Review
          </span>
        );
      case 'interview':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Audition Scheduled
          </span>
        );
      case 'selected':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Artist Selected
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Declined
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EDE8E0] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#E45826] uppercase tracking-wider mb-1">
              <KalaStar size={14} className="text-[#E45826]" />
              Talent Pipeline & Casting Review
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
              Applicant Review Room
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Review audition materials, listen to acoustic & video reels, and manage shortlists.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-zinc-600 bg-[#FAF8F5] px-4 py-2 rounded-2xl border border-[#EDE8E0]">
            <Users className="w-4 h-4 text-[#E45826]" />
            <span>{applicants.length} Total Submissions</span>
          </div>
        </div>
      </div>

      {/* Main Filter & Stage Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Stage Status Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#EFE8DE] rounded-2xl overflow-x-auto scrollbar-none w-fit">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            All Submissions ({applicants.length})
          </button>
          <button
            onClick={() => setStatusFilter('under_review')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'under_review'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Under Review ({applicants.filter(a => a.status === 'under_review').length})
          </button>
          <button
            onClick={() => setStatusFilter('interview')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'interview'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Audition Call ({applicants.filter(a => a.status === 'interview').length})
          </button>
          <button
            onClick={() => setStatusFilter('selected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'selected'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Selected ({applicants.filter(a => a.status === 'selected').length})
          </button>
        </div>

        {/* Search, Filter Drawer Toggle & Sort */}
        <div className="flex items-center gap-2">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artist or skill..."
              className="w-full pl-9.5 pr-4 py-2 bg-white border border-[#E0D9CD] rounded-2xl text-xs text-zinc-800 outline-none focus:border-[#E45826]"
            />
          </div>

          <button
            onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
              isFilterDrawerOpen || activeFilterCount > 0
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
            <option value="rating">Sort: Highest Rating</option>
            <option value="experience">Most Experienced</option>
            <option value="newest">Submission Date</option>
          </select>
        </div>
      </div>

      {/* Advanced Filter Drawer for Applicant Pipeline */}
      {isFilterDrawerOpen && (
        <div className="bg-white rounded-3xl p-6 border border-[#EDE8E0] shadow-md space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#E45826]" />
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Audition Review & Casting Filters
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Specific Opportunity Call */}
            <div>
              <label className="text-xs font-bold text-zinc-600 block mb-1.5">
                Target Opportunity Call
              </label>
              <select
                value={selectedOppFilter}
                onChange={(e) => setSelectedOppFilter(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-[#E45826]"
              >
                <option value="all">All Opportunity Calls ({opportunities.length})</option>
                {opportunities.map((opp) => (
                  <option key={opp.id} value={opp.id}>
                    {opp.title.slice(0, 32)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Experience Level */}
            <div>
              <label className="text-xs font-bold text-zinc-600 block mb-1.5 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-[#E45826]" />
                Experience Tier
              </label>
              <select
                value={experienceFilter}
                onChange={(e) => setExperienceFilter(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-[#E45826]"
              >
                <option value="all">All Experience Levels</option>
                <option value="emerging">Emerging Talent (1 - 3 yrs)</option>
                <option value="mid">Mid-Career (4 - 7 yrs)</option>
                <option value="senior">Master / Senior (8+ yrs)</option>
              </select>
            </div>

            {/* City / Region */}
            <div>
              <label className="text-xs font-bold text-zinc-600 block mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#E45826]" />
                Artist Location
              </label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-[#E45826]"
              >
                <option value="all">All Regions / Pan-India</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Delhi">Delhi NCR</option>
                <option value="Pune">Pune</option>
                <option value="Chennai">Chennai</option>
              </select>
            </div>

            {/* Minimum Rating */}
            <div>
              <label className="text-xs font-bold text-zinc-600 block mb-1.5 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                Curator Rating
              </label>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-[#E45826]"
              >
                <option value="all">All Ratings</option>
                <option value="4.5">4.5+ Stars (Highly Rated)</option>
                <option value="4.8">4.8+ Stars (Exceptional)</option>
              </select>
            </div>
          </div>

          {/* Quick Toggle Checkbox */}
          <div className="pt-1 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700">
              <input
                type="checkbox"
                checked={hasReelFilter}
                onChange={(e) => setHasReelFilter(e.target.checked)}
                className="w-4 h-4 rounded text-[#E45826] focus:ring-[#E45826] border-zinc-300"
              />
              <span className="flex items-center gap-1">
                <Music className="w-3.5 h-3.5 text-[#E45826]" />
                Show only submissions with acoustic / video audition reel
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-zinc-400 font-medium">Active:</span>

          {selectedOppFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>Call: {opportunities.find(o => o.id === selectedOppFilter)?.title.slice(0, 20)}...</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setSelectedOppFilter('all')} />
            </span>
          )}

          {statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>Stage: {statusFilter.replace('_', ' ')}</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setStatusFilter('all')} />
            </span>
          )}

          {experienceFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>Exp: {experienceFilter}</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setExperienceFilter('all')} />
            </span>
          )}

          {cityFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>City: {cityFilter}</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setCityFilter('all')} />
            </span>
          )}

          {ratingFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>Rating: {ratingFilter}+ Stars</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setRatingFilter('all')} />
            </span>
          )}

          {hasReelFilter && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>Has Audition Reel</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setHasReelFilter(false)} />
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

      {/* Results Count & Applicants Grid */}
      <div className="flex items-center justify-between text-xs text-zinc-500 font-medium pt-2 border-t border-[#EDE7DE]">
        <span>Showing {filteredApplicants.length} submissions</span>
        {activeFilterCount > 0 && (
          <button
            onClick={resetAllFilters}
            className="text-[#E45826] font-semibold hover:underline cursor-pointer"
          >
            Reset filters
          </button>
        )}
      </div>

      {filteredApplicants.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#EDE8E0]">
          <Users className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-800 mb-1">No applicants match your filter criteria</h3>
          <p className="text-xs text-zinc-500 mb-4">Try clearing stage filters or search by another instrument/genre.</p>
          <button
            onClick={resetAllFilters}
            className="px-5 py-2 rounded-full bg-[#E45826] text-white text-xs font-semibold cursor-pointer shadow-xs hover:bg-[#D44716]"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredApplicants.map((app) => {
            const oppBanner = opportunities.find((o) => o.id === app.opportunityId)?.imageUrl;
            return (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-3xl border border-[#EDE8E0] p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-start gap-3.5">
                    <img
                      src={app.artistAvatar}
                      alt={app.artistName}
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-[#FCEEE3] shrink-0"
                    />
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 flex items-center gap-1.5">
                        {app.artistName}
                        {app.rating && (
                          <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500 ml-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {app.rating}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs font-medium text-zinc-600 mt-0.5">
                        {app.artistRole} • {app.experienceYears} yrs exp
                      </p>
                      <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {app.artistLocation}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {getStatusBadge(app.status)}
                  </div>
                </div>

                {/* Target Opportunity */}
                <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] mb-4 flex items-center gap-3">
                  {oppBanner && (
                    <img
                      src={oppBanner}
                      alt=""
                      className="w-11 h-11 rounded-xl object-cover shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-0.5">
                      Submitted For Call:
                    </span>
                    <p className="text-xs font-bold text-zinc-800 line-clamp-1">
                      {app.opportunityTitle}
                    </p>
                  </div>
                </div>

                {/* Pitch / Statement */}
                <p className="text-xs text-zinc-600 leading-relaxed line-clamp-3 mb-4">
                  "{app.pitch}"
                </p>

                {/* Skills tags */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {app.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FAF8F5] border border-[#EDE8E0] text-zinc-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Audition Reel & Portfolio */}
                {(app.reelUrl || app.portfolioUrl) && (
                  <div className="p-3 rounded-2xl bg-[#FAF2EB] border border-[#FAD7C8] mb-4 space-y-2.5">
                    {app.reelUrl && isDirectMediaUrl(app.reelUrl) && (
                      mediaKind(app.reelUrl) === 'image' ? (
                        <MediaPreview
                          src={getOptimizedCloudinaryUrl(app.reelUrl, { width: 800, quality: 'auto' })}
                          alt="Audition reel"
                          wrapperClassName="relative block w-full h-40 rounded-xl overflow-hidden bg-zinc-100"
                          mediaClassName="w-full h-full object-cover"
                        />
                      ) : mediaKind(app.reelUrl) === 'audio' ? (
                        <audio controls preload="metadata" src={app.reelUrl} className="w-full" />
                      ) : (
                        <MediaPreview
                          src={getOptimizedCloudinaryUrl(app.reelUrl, { width: 1280, quality: 'auto' })}
                          alt="Audition reel"
                          wrapperClassName="relative block w-full h-40 rounded-xl overflow-hidden bg-black"
                          mediaClassName="w-full h-full object-contain"
                        />
                      )
                    )}
                    {app.reelUrl && !isDirectMediaUrl(app.reelUrl) && (
                      <a
                        href={app.reelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                      >
                        <span className="w-8 h-8 rounded-full bg-[#E45826] text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                        </span>
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-zinc-800 block truncate">
                            Audition Reel
                          </span>
                          <span className="text-[10px] text-zinc-500">{linkHost(app.reelUrl)}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-[#E45826] shrink-0" />
                      </a>
                    )}
                    {app.portfolioUrl && (
                      <div className="flex justify-end">
                        <a
                          href={app.portfolioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-[#E45826] hover:underline flex items-center gap-1 shrink-0"
                        >
                          <span>Portfolio</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status Update Action Bar */}
              <div className="pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">
                  Applied {app.appliedDate}
                </span>

                <div className="flex items-center gap-1.5">
                  {(() => {
                    const thread = threads.find(
                      (t) => t.opportunityId === app.opportunityId && t.artistId === app.artistId
                    );
                    const unread = thread ? isUnread(thread, 'organiser') : false;
                    return (
                      <button
                        onClick={() => onOpenThread?.(app.opportunityId, app.artistId ?? '')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FDEEE7] border border-[#FAD7C8] text-[#E45826] text-[11px] font-bold hover:bg-[#FCE4D9] transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Message</span>
                        {unread && <span className="w-2 h-2 rounded-full bg-[#E45826] animate-pulse" />}
                      </button>
                    );
                  })()}
                  {app.status !== 'interview' && (
                    <button
                      onClick={() => onUpdateApplicantStatus(app.id, 'interview')}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition-colors cursor-pointer"
                    >
                      Schedule Audition
                    </button>
                  )}

                  {app.status !== 'selected' && (
                    <button
                      onClick={() => onUpdateApplicantStatus(app.id, 'selected')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors cursor-pointer"
                    >
                      Commission Artist
                    </button>
                  )}

                  {app.status !== 'rejected' && (
                    <button
                      onClick={() => onUpdateApplicantStatus(app.id, 'rejected')}
                      className="p-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                      title="Decline"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
