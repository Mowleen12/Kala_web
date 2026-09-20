import React from 'react';
import { Palette, Building2 } from 'lucide-react';
import { PortalMode } from '../types';

interface PortalToggleProps {
  portalMode: PortalMode;
  onToggle: (mode: PortalMode) => void;
  size?: 'sm' | 'md';
}

export const PortalToggle: React.FC<PortalToggleProps> = ({
  portalMode,
  onToggle,
  size = 'md',
}) => {
  return (
    <div 
      className={`inline-flex items-center p-1 rounded-full bg-[#EFE8DE] border border-[#E3DCcf] shadow-2xs ${
        size === 'sm' ? 'scale-90 origin-left' : ''
      }`}
      role="tablist"
      aria-label="Switch between Artist and Organiser portals"
    >
      <button
        type="button"
        role="tab"
        aria-selected={portalMode === 'artist'}
        onClick={() => onToggle('artist')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
          portalMode === 'artist'
            ? 'bg-white text-zinc-900 shadow-xs ring-1 ring-black/5'
            : 'text-zinc-600 hover:text-zinc-900'
        }`}
      >
        <Palette className={`w-3.5 h-3.5 ${portalMode === 'artist' ? 'text-[#E45826]' : 'text-zinc-400'}`} />
        <span>Artist Portal</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={portalMode === 'organiser'}
        onClick={() => onToggle('organiser')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
          portalMode === 'organiser'
            ? 'bg-[#E45826] text-white shadow-xs'
            : 'text-zinc-600 hover:text-zinc-900'
        }`}
      >
        <Building2 className={`w-3.5 h-3.5 ${portalMode === 'organiser' ? 'text-white' : 'text-zinc-400'}`} />
        <span>Organiser Portal</span>
        {portalMode !== 'organiser' && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#E45826] animate-pulse" />
        )}
      </button>
    </div>
  );
};
