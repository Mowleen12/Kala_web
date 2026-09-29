import React, { useState } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  Bell, 
  ChevronDown, 
  Check, 
  X, 
  Building2, 
  Palette, 
  LogOut, 
  ArrowLeftRight, 
  LogIn 
} from 'lucide-react';
import { KalaLogo } from './KalaLogo';
import { NOTIFICATIONS } from '../data/mockData';
import { PortalMode } from '../types';

interface HeaderProps {
  portalMode: PortalMode;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleFilters: () => void;
  onSelectArtistTab: (tab: any) => void;
  onSelectOrgTab: (tab: any) => void;
  onOpenSignUp: () => void;
  onOpenSignIn?: () => void;
  onSignOut?: () => void;
  onSwitchPortalAccount?: (targetPortal: PortalMode) => void;
  userName?: string;
  userEmail?: string;
  orgName?: string;
  avatarUrl?: string;
  authProvider?: string;
}

export const Header: React.FC<HeaderProps> = ({
  portalMode,
  searchQuery,
  onSearchChange,
  onToggleFilters,
  onSelectArtistTab,
  onSelectOrgTab,
  onOpenSignUp,
  onOpenSignIn,
  onSignOut,
  onSwitchPortalAccount,
  userName = "Mowleen",
  userEmail,
  orgName = "NCPA Mumbai",
  avatarUrl,
  authProvider,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const handleSwitchClick = () => {
    setShowUserMenu(false);
    const target = portalMode === 'artist' ? 'organiser' : 'artist';
    if (onSwitchPortalAccount) {
      onSwitchPortalAccount(target);
    } else {
      onOpenSignUp();
    }
  };

  const effectiveEmail = userEmail || (portalMode === 'artist' ? 'mowleen2006@gmail.com' : 'auditions@ncpamumbai.com');

  return (
    <header className="sticky top-0 z-30 bg-[#FAF8F5]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 border-b border-[#EFECE6]/80 flex flex-wrap items-center justify-between gap-y-2.5 gap-x-3 sm:gap-x-4">
      {/* Mobile Logo */}
      <div className="lg:hidden shrink-0 flex items-center gap-2">
        <KalaLogo 
          starSize={24} 
          textSize="text-2xl" 
          onClick={() => portalMode === 'artist' ? onSelectArtistTab('home') : onSelectOrgTab('overview')} 
        />
      </div>

      {/* Role-Scoped Portal Status Badge */}
      <div className="hidden sm:flex shrink-0">
        {portalMode === 'artist' ? (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8] text-xs font-bold shadow-2xs">
            <Palette className="w-3.5 h-3.5" />
            <span>Artist Portal</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAF2EA] text-zinc-900 border border-[#EBDCCF] text-xs font-bold shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-[#E45826]" />
            <span>Host Portal &bull; <span className="text-[#E45826]">{orgName}</span></span>
          </div>
        )}
      </div>

      {/* Global Search Bar — own full-width row on phones (logo + actions stay on row 1) */}
      <div className="order-last w-full sm:order-none sm:flex-1 sm:w-auto sm:max-w-xl sm:mx-auto min-w-0">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            id="global-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              portalMode === 'artist'
                ? "Search events, auditions, venues..."
                : "Search applicants, reels, calls..."
            }
            className="w-full bg-[#F2EDE4] hover:bg-[#EFE8DE] focus:bg-white text-zinc-800 text-[14px] rounded-full pl-11 pr-11 py-2.5 outline-none border border-transparent focus:border-[#E45826]/40 transition-all placeholder:text-zinc-500 placeholder:text-sm shadow-2xs"
          />
          <button
            id="header-filter-btn"
            onClick={onToggleFilters}
            aria-label="Filter opportunities"
            className="absolute right-3 p-1.5 rounded-full text-zinc-500 hover:text-[#E45826] hover:bg-zinc-200/50 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Actions: Notifications & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Mobile portal badge removed: the header cannot fit it alongside logo +
            search + bell + avatar without overflowing the viewport. The full
            "Artist Portal" badge above covers sm and up. */}

        {/* Notification Bell */}
        <div className="relative">
          <button
            id="notifications-bell-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            aria-label="Notifications"
            className="w-9 h-9 rounded-full bg-white border border-[#E9E4DB] flex items-center justify-center text-zinc-700 hover:border-zinc-300 hover:bg-[#F8F5F0] transition-colors relative cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#E45826] ring-2 ring-white" />
            )}
          </button>

          {/* Notifications Dropdown Popover */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-xl border border-[#EBE6DD] p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-zinc-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-[#FDEEE7] text-[#E45826] rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-[#E45826] hover:underline font-medium cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="divide-y divide-zinc-50 max-h-80 overflow-y-auto mt-2">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`py-2.5 px-2 rounded-xl transition-colors ${
                      notif.unread ? 'bg-[#FFF8F5]' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-zinc-900">{notif.title}</p>
                      <span className="text-[10px] text-zinc-400 whitespace-nowrap">{notif.time}</span>
                    </div>
                    <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{notif.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Pill / Profile Dropdown */}
        <div className="relative">
          <button
            id="user-profile-menu-btn"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-white border border-[#E9E4DB] hover:border-zinc-300 transition-colors shadow-2xs cursor-pointer"
          >
            <img
              src={
                avatarUrl || (
                  portalMode === 'artist'
                    ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80"
                    : "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=120&q=80"
                )
              }
              alt="Profile"
              className="w-7 h-7 rounded-full object-cover ring-1 ring-zinc-200"
            />
            <span className="text-[13px] text-zinc-600 hidden lg:inline">
              {portalMode === 'artist' ? (
                <>Hello, <strong className="text-zinc-900 font-semibold">{userName}</strong></>
              ) : (
                <strong className="text-zinc-900 font-semibold">{orgName}</strong>
              )}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {/* User Options Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-68 bg-white rounded-2xl shadow-xl border border-[#EBE6DD] p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-zinc-100">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#E45826]">
                    {portalMode === 'artist' ? (
                      <>
                        <Palette className="w-3.5 h-3.5" />
                        <span>Artist Account</span>
                      </>
                    ) : (
                      <>
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Cultural Host Account</span>
                      </>
                    )}
                  </div>
                  {authProvider === 'google' && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 text-[10px] font-bold text-blue-600 border border-blue-100">
                      <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                      </svg>
                      Google
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 font-medium truncate">
                  {effectiveEmail}
                </p>
              </div>

              <div className="py-1">
                {portalMode === 'artist' ? (
                  <>
                    <button
                      onClick={() => {
                        onSelectArtistTab('profile');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-[#FDEEE7] hover:text-[#E45826] rounded-lg transition-colors cursor-pointer"
                    >
                      View Creator Profile & Cloudinary Media
                    </button>
                    <button
                      onClick={() => {
                        onSelectArtistTab('applications');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-[#FDEEE7] hover:text-[#E45826] rounded-lg transition-colors cursor-pointer"
                    >
                      My Submissions & Auditions
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        onSelectOrgTab('org_profile');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-[#FDEEE7] hover:text-[#E45826] rounded-lg transition-colors cursor-pointer"
                    >
                      NCPA Venue Profile
                    </button>
                    <button
                      onClick={() => {
                        onSelectOrgTab('listings');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-[#FDEEE7] hover:text-[#E45826] rounded-lg transition-colors cursor-pointer"
                    >
                      Manage Production Calls
                    </button>
                    <button
                      onClick={() => {
                        onSelectOrgTab('applicants');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-[#FDEEE7] hover:text-[#E45826] rounded-lg transition-colors cursor-pointer"
                    >
                      Review Audition Pipeline
                    </button>
                  </>
                )}

                <div className="pt-1 mt-1 border-t border-zinc-100 space-y-0.5">
                  {onOpenSignIn && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenSignIn();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-[#FAF8F5] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <LogIn className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Log In to Existing Account</span>
                    </button>
                  )}

                  <button
                    onClick={handleSwitchClick}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-zinc-800 hover:bg-[#FAF8F5] rounded-lg transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-[#E45826]" />
                      <span>Switch to {portalMode === 'artist' ? 'Organiser Portal' : 'Artist Portal'}</span>
                    </span>
                  </button>

                  {onSignOut && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onSignOut();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out of Supabase Session</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
