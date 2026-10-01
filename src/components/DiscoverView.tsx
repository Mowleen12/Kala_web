import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  MapPin, 
  Calendar, 
  SlidersHorizontal, 
  ArrowRight, 
  X, 
  IndianRupee, 
  Clock, 
  Sparkles,
  Check,
  ChevronDown
} from 'lucide-react';
import { KalaStar } from './KalaLogo';
import { Opportunity } from '../types';

interface DiscoverViewProps {
  opportunities: Opportunity[];
  initialCategory?: string;
  initialSearch?: string;
  isOpenFiltersInitially?: boolean;
  onApply: (opp: Opportunity) => void;
  onViewDetails: (opp: Opportunity) => void;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  opportunities,
  initialCategory,
  initialSearch = '',
  isOpenFiltersInitially = false,
  onApply,
  onViewDetails,
}) => {
  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'All');
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');
  const [selectedHonorarium, setSelectedHonorarium] = useState<string>('All');
  const [selectedDeadline, setSelectedDeadline] = useState<string>('All');
  const [selectedVenueType, setSelectedVenueType] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'recommended' | 'deadline' | 'compensation' | 'applicants'>('recommended');
  const [search, setSearch] = useState<string>(initialSearch);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(isOpenFiltersInitially);

  const categories = [
    'All',
    'Music & Dance',
    'Film & Photography',
    'Visual Arts',
    'Theatre & Performance',
    'Writing & Content',
    'Design & Fashion',
  ];

  const cities = [
    'All Cities',
    'Mumbai',
    'Bengaluru',
    'Delhi NCR',
    'Kochi',
    'Ahmedabad',
    'Chennai',
    'Pune',
  ];

  const honorariumOptions = [
    { label: 'All Compensations', value: 'All' },
    { label: '₹15,000+ (Standard Gig)', value: '15k' },
    { label: '₹30,000+ (Featured Ensemble)', value: '30k' },
    { label: '₹50,000+ (Residency / Commission)', value: '50k' },
  ];

  const deadlineOptions = [
    { label: 'All Deadlines', value: 'All' },
    { label: 'Closing This Week (≤ 7 days)', value: '7days' },
    { label: 'Next 14 Days', value: '14days' },
    { label: 'Seasonal Residencies (15+ days)', value: '30days' },
  ];

  const venueTypeOptions = [
    { label: 'All Venues', value: 'All' },
    { label: 'Theatres & Auditoriums', value: 'theatre' },
    { label: 'Galleries & Studios', value: 'gallery' },
    { label: 'Open-Air & Festivals', value: 'festival' },
  ];

  // Calculate active filter count
  const activeFilterCount = [
    selectedCategory !== 'All',
    selectedCity !== 'All Cities',
    selectedHonorarium !== 'All',
    selectedDeadline !== 'All',
    selectedVenueType !== 'All',
    search.trim().length > 0,
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setSelectedCategory('All');
    setSelectedCity('All Cities');
    setSelectedHonorarium('All');
    setSelectedDeadline('All');
    setSelectedVenueType('All');
    setSearch('');
    setSortBy('recommended');
  };

  // Filter and Sort Logic
  const filteredOpportunities = useMemo(() => {
    let list = opportunities.filter((opp) => {
      // Category
      const matchesCat = selectedCategory === 'All' || opp.category === selectedCategory;

      // City
      const matchesCity =
        selectedCity === 'All Cities' ||
        opp.city.toLowerCase().includes(selectedCity.toLowerCase()) ||
        opp.location.toLowerCase().includes(selectedCity.toLowerCase());

      // Search Query
      const matchesSearch =
        !search.trim() ||
        opp.title.toLowerCase().includes(search.toLowerCase()) ||
        opp.location.toLowerCase().includes(search.toLowerCase()) ||
        opp.category.toLowerCase().includes(search.toLowerCase()) ||
        opp.organizer?.toLowerCase().includes(search.toLowerCase());

      // Honorarium parsing: pull ₹ amounts out of the free-text compensation
      // string and match on its upper bound (custom prices included).
      let matchesHonorarium = true;
      if (selectedHonorarium !== 'All') {
        const nums = (opp.compensation.match(/[\d,]+/g) || [])
          .map((n) => Number(n.replace(/,/g, '')))
          .filter((n) => !Number.isNaN(n) && n > 0);
        const maxPay = nums.length ? Math.max(...nums) : 0;
        const threshold = selectedHonorarium === '15k' ? 15000 : selectedHonorarium === '30k' ? 30000 : 50000;
        matchesHonorarium = maxPay >= threshold;
      }

      // Deadline filter
      let matchesDeadline = true;
      const label = opp.statusBadge.label.toLowerCase();
      if (selectedDeadline === '7days') {
        matchesDeadline = label.includes('4 days') || label.includes('5 days') || label.includes('7 days') || label.includes('6 days') || label.includes('3 days') || label.includes('2 days');
      } else if (selectedDeadline === '14days') {
        matchesDeadline = !label.includes('30 days') && !label.includes('residency');
      } else if (selectedDeadline === '30days') {
        matchesDeadline = label.includes('residency') || label.includes('30') || label.includes('annual');
      }

      // Venue type filter
      let matchesVenue = true;
      const venueStr = (opp.venue || opp.location).toLowerCase();
      if (selectedVenueType === 'theatre') {
        matchesVenue = venueStr.includes('theatre') || venueStr.includes('auditorium') || venueStr.includes('hall');
      } else if (selectedVenueType === 'gallery') {
        matchesVenue = venueStr.includes('gallery') || venueStr.includes('studio') || venueStr.includes('art');
      } else if (selectedVenueType === 'festival') {
        matchesVenue = venueStr.includes('stage') || venueStr.includes('amphitheatre') || venueStr.includes('fort') || venueStr.includes('festival');
      }

      return matchesCat && matchesCity && matchesSearch && matchesHonorarium && matchesDeadline && matchesVenue;
    });

    // Sorting
    if (sortBy === 'deadline') {
      list.sort((a, b) => {
        const getDays = (str: string) => {
          const match = str.match(/\d+/);
          return match ? parseInt(match[0], 10) : 999;
        };
        return getDays(a.statusBadge.label) - getDays(b.statusBadge.label);
      });
    } else if (sortBy === 'compensation') {
      list.sort((a, b) => {
        const getNum = (str: string) => {
          const clean = str.replace(/[^0-9]/g, '');
          return clean ? parseInt(clean.slice(-5), 10) : 0;
        };
        return getNum(b.compensation) - getNum(a.compensation);
      });
    } else if (sortBy === 'applicants') {
      list.sort((a, b) => (b.applicantCount || 0) - (a.applicantCount || 0));
    }

    return list;
  }, [opportunities, selectedCategory, selectedCity, search, selectedHonorarium, selectedDeadline, selectedVenueType, sortBy]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Banner & Title */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EDE8E0] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#E45826] uppercase tracking-wider mb-1">
              <KalaStar size={14} className="text-[#E45826]" />
              Artist Opportunity Board
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
              Discover Open Calls & Commissions
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Explore curated opportunities, stage auditions, residency grants, and collaborations with verified venues.
            </p>
          </div>

          {/* Filter Toggle & Sort Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                isFilterPanelOpen || activeFilterCount > 0
                  ? 'bg-[#FDEEE7] text-[#E45826] border-[#FAD7C8] shadow-2xs'
                  : 'bg-[#FAF8F5] text-zinc-700 hover:text-zinc-900 border-[#EDE8E0]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filter Calls</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#E45826] text-white text-[11px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-semibold text-zinc-800 outline-none cursor-pointer focus:border-[#E45826]"
              >
                <option value="recommended">Sort: Recommended</option>
                <option value="deadline">Soonest Deadline</option>
                <option value="compensation">Highest Honorarium</option>
                <option value="applicants">Most In-Demand</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Advanced Filter Drawer / Panel */}
      {isFilterPanelOpen && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EDE8E0] shadow-md space-y-5 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#E45826]" />
              <span className="text-sm font-bold text-zinc-900">Advanced Filter Controls</span>
              <span className="text-xs text-zinc-400 font-medium">({activeFilterCount} active)</span>
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={resetAllFilters}
                className="text-xs font-semibold text-[#E45826] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Reset all filters</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Grid: 4 Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. City / Region */}
            <div>
              <label className="text-xs font-bold text-zinc-600 block mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#E45826]" />
                Location / City
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-[#E45826]"
              >
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* 2. Honorarium Tier */}
            <div>
              <label className="text-xs font-bold text-zinc-600 block mb-2 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-[#E45826]" />
                Compensation Tier
              </label>
              <select
                value={selectedHonorarium}
                onChange={(e) => setSelectedHonorarium(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-[#E45826]"
              >
                {honorariumOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* 3. Deadline Urgency */}
            <div>
              <label className="text-xs font-bold text-zinc-600 block mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#E45826]" />
                Audition Deadline
              </label>
              <select
                value={selectedDeadline}
                onChange={(e) => setSelectedDeadline(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-[#E45826]"
              >
                {deadlineOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* 4. Venue Setting */}
            <div>
              <label className="text-xs font-bold text-zinc-600 block mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E45826]" />
                Auditorium / Venue Type
              </label>
              <select
                value={selectedVenueType}
                onChange={(e) => setSelectedVenueType(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-[#E45826]"
              >
                {venueTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter Pills (Horizontal Scroll) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#E45826] text-white shadow-xs'
                  : 'bg-white text-zinc-600 hover:text-zinc-900 border border-[#EDE7DE] hover:bg-zinc-50'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Active Filter Chips Bar */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-zinc-400 font-medium">Active:</span>

          {selectedCategory !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>Category: {selectedCategory}</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setSelectedCategory('All')} />
            </span>
          )}

          {selectedCity !== 'All Cities' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>City: {selectedCity}</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setSelectedCity('All Cities')} />
            </span>
          )}

          {selectedHonorarium !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>Comp: {honorariumOptions.find(o => o.value === selectedHonorarium)?.label}</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setSelectedHonorarium('All')} />
            </span>
          )}

          {selectedDeadline !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>Deadline: {deadlineOptions.find(o => o.value === selectedDeadline)?.label}</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setSelectedDeadline('All')} />
            </span>
          )}

          {selectedVenueType !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>Venue: {venueTypeOptions.find(o => o.value === selectedVenueType)?.label}</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setSelectedVenueType('All')} />
            </span>
          )}

          {search.trim() && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>Query: "{search}"</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setSearch('')} />
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

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-zinc-500 font-medium pt-2 border-t border-[#EDE7DE]">
        <span>Showing {filteredOpportunities.length} opportunities</span>
        {activeFilterCount > 0 && (
          <button
            onClick={resetAllFilters}
            className="text-[#E45826] font-semibold hover:underline cursor-pointer"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Grid of Results */}
      {filteredOpportunities.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#EDE7DE]">
          <KalaStar size={32} className="text-zinc-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-800 mb-1">No opportunities match your filter criteria</h3>
          <p className="text-xs text-zinc-500 mb-4">Try broadening your parameters, clearing tags, or selecting "All" categories.</p>
          <button
            onClick={resetAllFilters}
            className="px-5 py-2 rounded-full bg-[#E45826] text-white text-xs font-semibold cursor-pointer shadow-xs hover:bg-[#D44716]"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOpportunities.map((opp) => (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="group bg-white rounded-2xl overflow-hidden border border-[#EDE8E0] shadow-2xs hover:shadow-md hover:border-[#E0D7CB] transition-all flex flex-col justify-between"
            >
              <div>
                <div 
                  className="relative aspect-[16/9] overflow-hidden cursor-pointer"
                  onClick={() => onViewDetails(opp)}
                >
                  <img
                    src={opp.imageUrl}
                    alt={opp.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E45826] text-white shadow-xs">
                      {opp.category}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-900/90 text-white backdrop-blur-xs">
                      {opp.statusBadge.label}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <h3
                    onClick={() => onViewDetails(opp)}
                    className="text-base font-bold text-zinc-900 line-clamp-1 group-hover:text-[#E45826] transition-colors cursor-pointer"
                  >
                    {opp.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-zinc-500 text-xs mt-2.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{opp.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-500 text-xs mt-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{opp.dateRange}</span>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 pt-2 flex items-center justify-between border-t border-zinc-100 mt-auto">
                <span className="text-sm font-bold text-[#E45826]">
                  {opp.compensation}
                </span>
                <button
                  onClick={() => onApply(opp)}
                  className="px-4 py-1.5 rounded-full bg-[#E45826] hover:bg-[#D44716] active:scale-95 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  Apply Now
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
