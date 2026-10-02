import React from 'react';
import { 
  ArrowRight, 
  Music, 
  Camera, 
  Palette, 
  Theater, 
  PenTool, 
  Sparkles 
} from 'lucide-react';
import { KalaStar } from './KalaLogo';
import { CATEGORIES } from '../data/mockData';
import { Category } from '../types';

interface BrowseCategoriesProps {
  selectedCategory?: string;
  counts: Record<string, number>;
  onSelectCategory: (categoryName: string) => void;
  onViewAll: () => void;
}

export const BrowseCategories: React.FC<BrowseCategoriesProps> = ({
  selectedCategory,
  counts,
  onSelectCategory,
  onViewAll,
}) => {
  const getCategoryIcon = (name: string) => {
    switch (name) {
      case 'Music & Dance':
        return Music;
      case 'Film & Photography':
        return Camera;
      case 'Visual Arts':
        return Palette;
      case 'Theatre & Performance':
        return Theater;
      case 'Writing & Content':
        return PenTool;
      case 'Design & Fashion':
        return Sparkles;
      default:
        return Sparkles;
    }
  };

  return (
    <section className="mb-8 rounded-3xl bg-zinc-950 p-6 sm:p-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <KalaStar size={18} className="text-[#E45826]" />
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Browse by Category
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Find the right opportunities for your creative journey.
          </p>
        </div>

        <button
          id="view-all-categories-btn"
          onClick={onViewAll}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#F8A97D] hover:text-[#FFC9AC] transition-colors self-start sm:self-auto cursor-pointer"
        >
          <span>View All</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Categories Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
        {CATEGORIES.map((cat: Category) => {
          const Icon = getCategoryIcon(cat.name);
          const isSelected = selectedCategory === cat.name;
          const count = counts[cat.name] || 0;

          return (
            <button
              key={cat.id}
              id={`cat-btn-${cat.id}`}
              onClick={() => onSelectCategory(cat.name)}
              className={`p-3.5 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-200 border cursor-pointer ${
                isSelected
                  ? 'bg-white border-[#E45826] shadow-md ring-2 ring-[#E45826]/20'
                  : 'bg-white hover:bg-[#FDFBF7] border-[#ECE7DF] hover:border-[#E0D7CB] shadow-2xs'
              }`}
            >
              {/* Pastel Icon Box */}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 transition-transform duration-200 group-hover:scale-105 ${cat.bgColor}`}
              >
                <Icon className={`w-5 h-5 ${cat.iconColor}`} />
              </div>

              {/* Category Name */}
              <span className="text-xs font-semibold text-zinc-800 leading-tight">
                {cat.name}
              </span>
              <span className="text-[11px] text-zinc-500 mt-0.5">
                {count} open {count === 1 ? 'call' : 'calls'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
