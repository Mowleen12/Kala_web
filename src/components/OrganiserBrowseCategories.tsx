import React from 'react';
import { 
  ArrowRight, 
  Music, 
  Camera, 
  Palette, 
  Theater, 
  Sparkles, 
  Landmark,
  Layers,
  Users
} from 'lucide-react';
import { KalaStar } from './KalaLogo';

interface OrganiserBrowseCategoriesProps {
  selectedCategory?: string;
  onSelectCategory: (categoryName: string) => void;
  onViewAll: () => void;
}

export const OrganiserBrowseCategories: React.FC<OrganiserBrowseCategoriesProps> = ({
  selectedCategory,
  onSelectCategory,
  onViewAll,
}) => {
  const departments = [
    {
      id: 'music-dance',
      name: 'Music & Dance',
      count: 14,
      applicants: 184,
      icon: Music,
      desc: 'Orchestras, Classical Recitals & Contemporary Dance',
      color: 'from-orange-500/10 to-amber-500/10 border-orange-200 text-[#E45826]',
      badgeBg: 'bg-orange-100 text-orange-800'
    },
    {
      id: 'theatre-drama',
      name: 'Theatre & Performance',
      count: 8,
      applicants: 96,
      icon: Theater,
      desc: 'Experimental Plays, Solos & Regional Dramas',
      color: 'from-orange-500/15 to-[#E45826]/10 border-orange-200 text-[#C73E0E]',
      badgeBg: 'bg-[#FCEEE7] text-[#C73E0E]'
    },
    {
      id: 'visual-installations',
      name: 'Visual Arts',
      count: 6,
      applicants: 72,
      icon: Palette,
      desc: 'Gallery Exhibitions, Murals & Sculptures',
      color: 'from-rose-500/10 to-orange-500/10 border-rose-200 text-rose-700',
      badgeBg: 'bg-rose-100 text-rose-800'
    },
    {
      id: 'film-multimedia',
      name: 'Film & Photography',
      count: 5,
      applicants: 58,
      icon: Camera,
      desc: 'Documentaries, Live Projections & Scoring',
      color: 'from-purple-500/10 to-pink-500/10 border-purple-200 text-purple-700',
      badgeBg: 'bg-purple-100 text-purple-800'
    },
    {
      id: 'heritage-craft',
      name: 'Writing & Content',
      count: 4,
      applicants: 42,
      icon: Layers,
      desc: 'Playwriting, Librettos & Cultural Journalism',
      color: 'from-emerald-500/10 to-teal-500/10 border-emerald-200 text-emerald-700',
      badgeBg: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 'design-scenography',
      name: 'Design & Fashion',
      count: 7,
      applicants: 64,
      icon: Sparkles,
      desc: 'Stage Scenography, Costume & Spatial Design',
      color: 'from-blue-500/10 to-cyan-500/10 border-blue-200 text-blue-700',
      badgeBg: 'bg-blue-100 text-blue-800'
    },
  ];

  return (
    <section className="mb-8 rounded-3xl bg-zinc-950 p-6 sm:p-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <KalaStar size={18} className="text-[#E45826]" />
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Curate by Creative Department
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Filter calls, audition queues, and auditions across artistic disciplines.
          </p>
        </div>

        <button
          onClick={onViewAll}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#F8A97D] hover:text-[#FFC9AC] transition-colors self-start sm:self-auto cursor-pointer"
        >
          <span>All Departments</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid of Categories / Departments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => {
          const IconComponent = dept.icon;
          const isSelected = selectedCategory === dept.name;

          return (
            <div
              key={dept.id}
              onClick={() => onSelectCategory(dept.name)}
              className={`group p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-white border-[#E45826] shadow-md ring-2 ring-[#E45826]/10'
                  : 'bg-white hover:bg-[#FAF8F5] border-[#EDE8E0] hover:border-[#DFD7CC] shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${dept.color} flex items-center justify-center`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${dept.badgeBg}`}>
                    {dept.count} Active Calls
                  </span>
                </div>

                <h3 className="text-sm font-bold text-zinc-900 group-hover:text-[#E45826] transition-colors">
                  {dept.name}
                </h3>
                <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                  {dept.desc}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-semibold">
                <span className="text-zinc-500 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#E45826]" />
                  {dept.applicants} Applicants
                </span>
                <span className="text-[#E45826] group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                  Filter <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
