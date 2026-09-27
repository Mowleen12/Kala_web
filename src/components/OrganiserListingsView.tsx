import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  MapPin, 
  Calendar, 
  IndianRupee, 
  Users, 
  ExternalLink, 
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  Building2,
  Sparkles
} from 'lucide-react';
import { Opportunity } from '../types';
import { KalaStar } from './KalaLogo';

interface OrganiserListingsViewProps {
  opportunities: Opportunity[];
  initialCategory?: string;
  isOpenFiltersInitially?: boolean;
  onPostOpportunity: () => void;
  onReviewOpportunityApplicants: (opp: Opportunity) => void;
  onViewOpportunityDetails: (opp: Opportunity) => void;
}

export const OrganiserListingsView: React.FC<OrganiserListingsViewProps> = ({
  opportunities,
  initialCategory,
  isOpenFiltersInitially = false,
  onPostOpportunity,
  onReviewOpportunityApplicants,
  onViewOpportunityDetails,
}) => {
  // Filter states
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'reviewing'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'All');
  const [selectedVenue, setSelectedVenue] = useState<string>('All');
  const [selectedApplicantVolume, setSelectedApplicantVolume] = useState<string>('All');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'applicants' | 'deadline' | 'title'>('applicants');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(isOpenFiltersInitially);

  const categories = [
    'All',
    'Music & Dance',
    'Film & Photography',
    'Visual Arts',
    'Theatre & Performance',
    'Design & Fashion',
  ];

  const venueOptions = [
    'All',
    'Tata Theatre',
    'Jamshed Bhabha Theatre',
    'Experimental Theatre',
    'Godrej Dance Academy',
  ];

  const volumeOptions = [
    { label: 'All Volumes', value: 'All' },
    { label: 'High Demand (20+ Applicants)', value: 'high' },
    { label: 'Moderate (10-19 Applicants)', value: 'medium' },
    { label: 'Emerging (< 10 Applicants)', value: 'low' },
  ];

  const urgencyOptions = [
    { label: 'All Timelines', value: 'All' },
    { label: 'Closing in ≤ 7 Days', value: 'urgent' },
    { label: 'Extended Calls (14+ Days)', value: 'extended' },
  ];

  // Count active filters
  const activeFilterCount = [
    filterStatus !== 'all',
    selectedCategory !== 'All',
    selectedVenue !== 'All',
    selectedApplicantVolume !== 'All',
    selectedUrgency !== 'All',
    searchQuery.trim().length > 0,
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setFilterStatus('all');
    setSelectedCategory('All');
    setSelectedVenue('All');
    setSelectedApplicantVolume('All');
    setSelectedUrgency('All');
    setSearchQuery('');
    setSortBy('applicants');
  };

  const filteredOpps = useMemo(() => {
    let list = opportunities.filter((opp) => {
      // Search
      const matchesSearch = 
        !searchQuery.trim() ||
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.venue?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status
      let matchesStatus = true;
      if (filterStatus === 'active') {
        matchesStatus = opp.statusBadge.variant !== 'closed';
      } else if (filterStatus === 'reviewing') {
        matchesStatus = (opp.applicantCount || 0) > 0;
      }

      // Category
      const matchesCategory = selectedCategory === 'All' || opp.category === selectedCategory;

      // Venue
      const matchesVenue = 
        selectedVenue === 'All' || 
        (opp.venue || opp.location).toLowerCase().includes(selectedVenue.toLowerCase());

      // Applicant Volume
      let matchesVolume = true;
      const count = opp.applicantCount || 0;
      if (selectedApplicantVolume === 'high') {
        matchesVolume = count >= 20;
      } else if (selectedApplicantVolume === 'medium') {
        matchesVolume = count >= 10 && count < 20;
      } else if (selectedApplicantVolume === 'low') {
        matchesVolume = count < 10;
      }

      // Urgency
      let matchesUrgency = true;
      const label = opp.statusBadge.label.toLowerCase();
      if (selectedUrgency === 'urgent') {
        matchesUrgency = label.includes('4 days') || label.includes('5 days') || label.includes('7 days') || label.includes('3 days') || label.includes('2 days');
      } else if (selectedUrgency === 'extended') {
        matchesUrgency = !label.includes('4 days') && !label.includes('7 days');
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesVenue && matchesVolume && matchesUrgency;
    });

    // Sorting
    if (sortBy === 'applicants') {
      list.sort((a, b) => (b.applicantCount || 0) - (a.applicantCount || 0));
    } else if (sortBy === 'deadline') {
      list.sort((a, b) => {
        const getDays = (str: string) => {
          const m = str.match(/\d+/);
          return m ? parseInt(m[0], 10) : 999;
        };
        return getDays(a.statusBadge.label) - getDays(b.statusBadge.label);
      });
    } else if (sortBy === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }

    return list;
  }, [opportunities, filterStatus, selectedCategory, selectedVenue, selectedApplicantVolume, selectedUrgency, sortBy, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EDE8E0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#E45826] uppercase tracking-wider mb-1">
            <KalaStar size={14} className="text-[#E45826]" />
            Active Production Calls
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
            Manage Opportunities & Auditions
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Track incoming artist applications, shortlist audition reels, and program your upcoming calendar.
          </p>
        </div>

        <button
          onClick={onPostOpportunity}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#E45826] hover:bg-[#D44716] text-white text-sm font-semibold shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Post New Call</span>
        </button>
      </div>

      {/* Main Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#EFE8DE] rounded-2xl w-fit">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            All Calls ({opportunities.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              filterStatus === 'active'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Open for Submissions
          </button>
          <button
            onClick={() => setFilterStatus('reviewing')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              filterStatus === 'reviewing'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Auditioning ({opportunities.filter(o => (o.applicantCount || 0) > 0).length})
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
              placeholder="Search calls or auditoriums..."
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
            <option value="applicants">Sort: Most Applicants</option>
            <option value="deadline">Deadline Soonest</option>
            <option value="title">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Advanced Filter Drawer for Organisers */}
      {isFilterDrawerOpen && (
        <div className="bg-white rounded-3xl p-6 border border-[#EDE8E0] shadow-md space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#E45826]" />
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Audition Call Filters & Constraints
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
            {/* Category / Discipline */}
            <div>
              <label className="text-xs font-bold text-zinc-600 block mb-1.5">
                Creative Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-[#E45826]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Venue Hall */}
            <div>
              <label className="text-xs font-bold text-zinc-600 block mb-1.5 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#E45826]" />
                Auditorium / Hall
              </label>
              <select
                value={selectedVenue}
                onChange={(e) => setSelectedVenue(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-[#E45826]"
              >
                {venueOptions.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {/* Applicant Volume */}
            <div>
              <label className="text-xs font-bold text-zinc-600 block mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#E45826]" />
                Applicant Pipeline Volume
              </label>
              <select
                value={selectedApplicantVolume}
                onChange={(e) => setSelectedApplicantVolume(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-[#E45826]"
              >
                {volumeOptions.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* Deadline Urgency */}
            <div>
              <label className="text-xs font-bold text-zinc-600 block mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#E45826]" />
                Application Deadline
              </label>
              <select
                value={selectedUrgency}
                onChange={(e) => setSelectedUrgency(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-[#E45826]"
              >
                {urgencyOptions.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-zinc-400 font-medium">Active:</span>

          {filterStatus !== 'all' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>Status: {filterStatus === 'active' ? 'Open' : 'Auditioning'}</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setFilterStatus('all')} />
            </span>
          )}

          {selectedCategory !== 'All' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>Category: {selectedCategory}</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setSelectedCategory('All')} />
            </span>
          )}

          {selectedVenue !== 'All' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>Venue: {selectedVenue}</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setSelectedVenue('All')} />
            </span>
          )}

          {selectedApplicantVolume !== 'All' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>Volume: {volumeOptions.find(o => o.value === selectedApplicantVolume)?.label}</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setSelectedApplicantVolume('All')} />
            </span>
          )}

          {selectedUrgency !== 'All' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>Deadline: {urgencyOptions.find(o => o.value === selectedUrgency)?.label}</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setSelectedUrgency('All')} />
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

      {/* Opportunities List */}
      {filteredOpps.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#EDE8E0]">
          <KalaStar size={32} className="text-zinc-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-800 mb-1">No production calls match your filter criteria</h3>
          <p className="text-xs text-zinc-500 mb-4">Try clearing filters or search for another auditorium.</p>
          <button
            onClick={resetAllFilters}
            className="px-5 py-2 rounded-full bg-[#E45826] text-white text-xs font-semibold cursor-pointer shadow-xs hover:bg-[#D44716]"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOpps.map((opp) => (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-3xl border border-[#EDE8E0] p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
            >
              {/* Left Details */}
              <div className="flex items-start gap-4">
                <img
                  src={opp.imageUrl}
                  alt={opp.title}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-1 ring-zinc-200 shrink-0"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF2EB] text-[#E45826] border border-[#FAD7C8]">
                      {opp.category}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-900 text-white">
                      {opp.statusBadge.label}
                    </span>
                  </div>

                  <h3
                    onClick={() => onViewOpportunityDetails(opp)}
                    className="text-base sm:text-lg font-bold text-zinc-900 hover:text-[#E45826] cursor-pointer transition-colors"
                  >
                    {opp.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 mt-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      {opp.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      {opp.dateRange}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-[#E45826]">
                      <IndianRupee className="w-3.5 h-3.5" />
                      {opp.compensation}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Action & Submissions Count */}
              <div className="flex items-center justify-between lg:justify-end gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-zinc-100">
                <div className="text-left lg:text-right">
                  <div className="text-xl sm:text-2xl font-black text-zinc-900">
                    {opp.applicantCount || 0}
                  </div>
                  <div className="text-xs font-medium text-zinc-500">
                    Artist Submissions
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onReviewOpportunityApplicants(opp)}
                    className="px-4 py-2.5 rounded-xl bg-[#E45826] hover:bg-[#D44716] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Review Applicants</span>
                  </button>

                  <button
                    onClick={() => onViewOpportunityDetails(opp)}
                    className="p-2.5 rounded-xl bg-[#FAF8F5] hover:bg-zinc-100 text-zinc-600 border border-[#EDE8E0] transition-colors cursor-pointer"
                    title="View Call Specifications"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
