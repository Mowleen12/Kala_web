import { Category } from '../types';

/**
 * Static display configuration only — category tiles (name, icon, palette).
 * No demo opportunities, applications, users or stats live here: every count
 * and listing shown in the app is derived from Supabase.
 */
export const CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: 'Music & Dance',
    icon: 'Music2',
    bgColor: 'bg-[#FFF3EC]',
    iconColor: 'text-[#E45826]',
  },
  {
    id: 'cat-2',
    name: 'Film & Photography',
    icon: 'Camera',
    bgColor: 'bg-[#F5EFFB]',
    iconColor: 'text-[#8B5CF6]',
  },
  {
    id: 'cat-3',
    name: 'Visual Arts',
    icon: 'Palette',
    bgColor: 'bg-[#EFFBF2]',
    iconColor: 'text-[#10B981]',
  },
  {
    id: 'cat-4',
    name: 'Theatre & Performance',
    icon: 'Drama',
    bgColor: 'bg-[#FFF9EC]',
    iconColor: 'text-[#F59E0B]',
  },
  {
    id: 'cat-5',
    name: 'Writing & Content',
    icon: 'Feather',
    bgColor: 'bg-[#EFF6FE]',
    iconColor: 'text-[#3B82F6]',
  },
  {
    id: 'cat-6',
    name: 'Design & Fashion',
    icon: 'Sparkles',
    bgColor: 'bg-[#F9EFFE]',
    iconColor: 'text-[#D946EF]',
  },
];
