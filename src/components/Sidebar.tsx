import React from 'react';
import { 
  Home, 
  Compass, 
  FileText, 
  User, 
  ArrowRight, 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  Search, 
  Building2, 
  Plus,
  Palette,
  ArrowLeftRight
} from 'lucide-react';
import { KalaLogo, KalaStar } from './KalaLogo';
import { NavTab, OrganiserNavTab, PortalMode } from '../types';

interface SidebarProps {
  portalMode: PortalMode;
  currentTab: NavTab;
  currentOrgTab: OrganiserNavTab;
  onSelectArtistTab: (tab: NavTab) => void;
  onSelectOrgTab: (tab: OrganiserNavTab) => void;
  onOpenSignUp: () => void;
  onSwitchPortalAccount?: (targetPortal: PortalMode) => void;
  onPostOpportunity?: () => void;
  orgName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  portalMode,
  currentTab,
  currentOrgTab,
  onSelectArtistTab,
  onSelectOrgTab,
  onOpenSignUp,
  onSwitchPortalAccount,
  onPostOpportunity,
  orgName = "NCPA Mumbai",
}) => {
  const artistNavItems = [
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'discover' as NavTab, label: 'Discover', icon: Compass },
    { id: 'applications' as NavTab, label: 'Applications', icon: FileText },
    { id: 'profile' as NavTab, label: 'Profile', icon: User },
  ];

  const organiserNavItems = [
    { id: 'overview' as OrganiserNavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'listings' as OrganiserNavTab, label: 'Manage Calls', icon: CalendarDays },
    { id: 'applicants' as OrganiserNavTab, label: 'Talent Pipeline', icon: Users },
    { id: 'scout' as OrganiserNavTab, label: 'Direct Scout', icon: Search },
    { id: 'org_profile' as OrganiserNavTab, label: 'Venue Profile', icon: Building2 },
  ];

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col justify-between w-64 shrink-0 h-screen sticky top-0 px-6 py-7 border-r border-[#EFECE6] bg-[#FAF8F5]">
        <div>
          {/* Brand Logo & Scoped Portal Workspace Card */}
          <div className="mb-6 px-1">
            <div className="flex items-center justify-between mb-4">
              <KalaLogo 
                starSize={28} 
                textSize="text-3xl tracking-tight"
                onClick={() => portalMode === 'artist' ? onSelectArtistTab('home') : onSelectOrgTab('overview')} 
              />
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                portalMode === 'artist' 
                  ? 'bg-[#FDEEE7] text-[#E45826]' 
                  : 'bg-[#FAF0E6] text-[#C73E0E] border border-[#F3D5C3]'
              }`}>
                {portalMode === 'artist' ? 'Artist' : 'Host'}
              </span>
            </div>

            {/* Scoped Role Badge */}
            {portalMode === 'artist' ? (
              <div className="mt-2 p-2.5 rounded-2xl bg-[#FDEEE7]/80 border border-[#FAD7C8] flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-white text-[#E45826] flex items-center justify-center shadow-2xs">
                    <Palette className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-[#E45826] tracking-wider leading-none">Logged In As</p>
                    <p className="text-xs font-bold text-zinc-900 mt-0.5">Artist Portal</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-2 p-2.5 rounded-2xl bg-[#FAF2EA] border border-[#EBDCCF] flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-white text-[#E45826] border border-[#F0DEC2]/60 flex items-center justify-center shadow-2xs">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-[#E45826] tracking-wider leading-none">Logged In As</p>
                    <p className="text-xs font-bold text-zinc-900 mt-0.5">{orgName}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 mt-4">
            {portalMode === 'artist' ? (
              artistNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    onClick={() => onSelectArtistTab(item.id)}
                    className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 text-left cursor-pointer ${
                      isActive
                        ? 'bg-[#FDEEE7] text-[#E45826] font-semibold shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-[#F2ECE3]'
                    }`}
                  >
                    <Icon
                      className={`w-4.5 h-4.5 transition-colors ${
                        isActive ? 'text-[#E45826]' : 'text-zinc-500'
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })
            ) : (
              <>
                {organiserNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentOrgTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`org-nav-${item.id}`}
                      onClick={() => onSelectOrgTab(item.id)}
                      className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 text-left cursor-pointer ${
                        isActive
                          ? 'bg-[#FDEEE7] text-[#E45826] font-semibold shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-[#F2ECE3]'
                      }`}
                    >
                      <Icon
                        className={`w-4.5 h-4.5 transition-colors ${
                          isActive ? 'text-[#E45826]' : 'text-zinc-500'
                        }`}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}

                {/* Direct Post CTA button in Organiser Sidebar */}
                {onPostOpportunity && (
                  <div className="pt-3">
                    <button
                      onClick={onPostOpportunity}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#E45826] hover:bg-[#D44716] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Post Production Call</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="space-y-3">
          {/* Switch Portal Account Link */}
          {onSwitchPortalAccount && (
            <button
              onClick={() => onSwitchPortalAccount(portalMode === 'artist' ? 'organiser' : 'artist')}
              className="w-full py-2 px-3 rounded-xl bg-white hover:bg-zinc-100 border border-[#EDE8E0] text-zinc-700 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer shadow-2xs"
            >
              <span className="flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5 text-[#E45826]" />
                <span>Switch to {portalMode === 'artist' ? 'Host Portal' : 'Artist Portal'}</span>
              </span>
              <span className="text-[10px] text-zinc-400">&rarr;</span>
            </button>
          )}

          {/* Bottom Inspirational Promo Card */}
          <div className="bg-[#F6EFE6] rounded-2xl p-4 border border-[#E9DFD2] relative overflow-hidden">
            <div className="relative z-10">
              <KalaStar size={16} className="text-[#E45826] mb-2" />
              <p className="text-[12px] font-medium text-zinc-700 leading-snug mb-3">
                {portalMode === 'artist' ? (
                  <>
                    Real people.<br />
                    Real opportunities.<br />
                    Your next chapter starts here.
                  </>
                ) : (
                  <>
                    Stage the future.<br />
                    Real talent.<br />
                    Empower emerging artists.
                  </>
                )}
              </p>
              <button
                id="sidebar-cta-btn"
                onClick={portalMode === 'artist' ? onOpenSignUp : onPostOpportunity}
                aria-label={portalMode === 'artist' ? 'Join as an artist' : 'Post opportunity call'}
                className="w-8 h-8 rounded-full bg-[#E45826] text-white flex items-center justify-center shadow-xs hover:bg-[#D44716] active:scale-95 transition-all cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EAE6DE] px-3 py-2 flex justify-around items-center">
        {portalMode === 'artist'
          ? artistNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectArtistTab(item.id)}
                  className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
                    isActive ? 'text-[#E45826] font-bold' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#E45826]' : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })
          : organiserNavItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              const isActive = currentOrgTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectOrgTab(item.id)}
                  className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
                    isActive ? 'text-[#E45826] font-bold' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#E45826]' : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
      </div>
    </>
  );
};
