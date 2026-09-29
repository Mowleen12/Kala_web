import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Award, 
  CheckCircle2, 
  Sparkles, 
  ExternalLink,
  Mail,
  Phone,
  Music,
  Drama,
  Camera,
  Pencil
} from 'lucide-react';
import { OrganiserProfile } from '../types';
import { KalaStar } from './KalaLogo';
import { MediaPreview } from './MediaPreview';

interface OrganiserProfileViewProps {
  profile: OrganiserProfile;
  onUpdateProfile?: (updated: OrganiserProfile) => void;
}

export const OrganiserProfileView: React.FC<OrganiserProfileViewProps> = ({
  profile,
  onUpdateProfile,
}) => {
  const venues = [
    { name: 'Jamshed Bhabha Theatre', capacity: '1,109 seats', type: 'Opera & Symphony Stage' },
    { name: 'Tata Theatre', capacity: '1,010 seats', type: 'Acoustic Fan Auditorium' },
    { name: 'Experimental Theatre', capacity: '300 seats', type: 'Black Box & Avant-Garde' },
    { name: 'Godrej Dance Academy Theatre', capacity: '185 seats', type: 'Classical & Contemporary Dance' },
  ];

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editAbout, setEditAbout] = useState('');

  const startEditing = () => {
    setEditName(profile.name);
    setEditCity(profile.city);
    setEditState(profile.state);
    setEditTagline(profile.tagline);
    setEditAbout(profile.about);
    setIsEditing(true);
  };

  const saveProfile = () => {
    const name = editName.trim();
    if (!name) return;
    onUpdateProfile?.({
      ...profile,
      name,
      city: editCity.trim() || profile.city,
      state: editState.trim() || profile.state,
      tagline: editTagline.trim(),
      about: editAbout.trim(),
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Cover and Header Banner */}
      <div className="bg-white rounded-3xl border border-[#EDE8E0] overflow-hidden shadow-xs">
        {/* Cover Photo */}
        <div className="h-48 sm:h-64 relative bg-[#FAF2EB] overflow-hidden">
          <MediaPreview
            src={profile.coverImage}
            alt={`${profile.name} cover`}
            mediaClassName="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent pointer-events-none" />
        </div>

          {/* Profile Details Container */}
          <div className="p-6 sm:p-8 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-6">
              <div className="flex items-start sm:items-end gap-5">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden ring-4 ring-white shadow-lg bg-[#FAF2EB] shrink-0">
                  <MediaPreview
                    src={profile.logo}
                    alt={profile.name}
                    mediaClassName="w-full h-full object-cover"
                  />
                </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={60}
                      aria-label="Venue name"
                      className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight bg-[#FAF8F5] border border-[#E5E0D6] rounded-xl px-3 py-1 outline-none focus:border-[#E45826] w-full sm:w-72"
                    />
                  ) : (
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
                      {profile.name}
                    </h1>
                  )}
                  {profile.verified && (
                    <CheckCircle2 className="w-5 h-5 text-blue-500 fill-blue-50 shrink-0" />
                  )}
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#E45826] mt-0.5">
                  {profile.handle} • Est. {profile.establishedYear}
                </p>
                <p className="text-xs text-zinc-500 flex flex-wrap items-center gap-2 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    {isEditing ? (
                      <span className="flex items-center gap-1.5">
                        <input
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                          maxLength={60}
                          aria-label="City"
                          placeholder="City"
                          className="w-32 bg-[#FAF8F5] border border-[#E5E0D6] rounded-lg px-2 py-1 text-xs outline-none focus:border-[#E45826]"
                        />
                        <input
                          value={editState}
                          onChange={(e) => setEditState(e.target.value)}
                          maxLength={60}
                          aria-label="State"
                          placeholder="State"
                          className="w-32 bg-[#FAF8F5] border border-[#E5E0D6] rounded-lg px-2 py-1 text-xs outline-none focus:border-[#E45826]"
                        />
                      </span>
                    ) : (
                      `${profile.city}, ${profile.state}`
                    )}
                  </span>
                  <span>•</span>
                  <span>{profile.totalEventsHosted}+ Productions Hosted</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={saveProfile}
                    disabled={!editName.trim()}
                    className="px-4 py-2 rounded-full bg-[#E45826] hover:bg-[#D44716] text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 transition-all"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-full bg-white border border-[#EDE8E0] text-zinc-700 text-xs font-semibold hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={startEditing}
                  className="px-4 py-2 rounded-full bg-[#E45826] hover:bg-[#D44716] text-white text-xs font-semibold shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Tagline */}
          <div className="pt-4 border-t border-zinc-100">
            {isEditing ? (
              <textarea
                value={editTagline}
                onChange={(e) => setEditTagline(e.target.value)}
                maxLength={180}
                rows={2}
                aria-label="Tagline"
                className="w-full max-w-3xl bg-[#FAF8F5] border border-[#E5E0D6] rounded-xl px-3 py-2 text-xs sm:text-sm text-zinc-700 leading-relaxed outline-none focus:border-[#E45826] resize-y"
              />
            ) : (
              <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed max-w-3xl font-medium">
                {profile.tagline}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2-Column Details: Venues & Focus Disciplines */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: About & Venues (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EDE8E0] shadow-xs">
            <h3 className="text-base font-bold text-zinc-900 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#E45826]" />
              Institutional Heritage & Vision
            </h3>
            {isEditing ? (
              <textarea
                value={editAbout}
                onChange={(e) => setEditAbout(e.target.value)}
                maxLength={600}
                rows={6}
                aria-label="Institutional heritage and vision"
                className="w-full bg-[#FAF8F5] border border-[#E5E0D6] rounded-xl px-3 py-2 text-xs sm:text-sm text-zinc-600 leading-relaxed outline-none focus:border-[#E45826] resize-y"
              />
            ) : (
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                {profile.about}
              </p>
            )}
          </div>

          {/* Venues Grid */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EDE8E0] shadow-xs">
            <h3 className="text-base font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#E45826]" />
              Performance Auditoriums & Stages
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {venues.map((venue) => (
                <div
                  key={venue.name}
                  className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0]"
                >
                  <h4 className="text-xs font-bold text-zinc-900">{venue.name}</h4>
                  <div className="text-[11px] text-[#E45826] font-semibold mt-0.5">{venue.capacity}</div>
                  <div className="text-[11px] text-zinc-500 mt-1">{venue.type}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Curator Info & Focus Areas (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#EDE8E0] shadow-xs">
            <h3 className="text-base font-bold text-zinc-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#E45826]" />
              Programming Focus
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.focusDisciplines.map((d) => (
                <span
                  key={d}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF2EB] text-[#E45826] border border-[#FAD7C8]"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#EDE8E0] shadow-xs">
            <h3 className="text-base font-bold text-zinc-900 mb-3">
              Programming Secretariat
            </h3>
            <div className="space-y-3 text-xs text-zinc-600">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-zinc-400" />
                <span>auditions@ncpamumbai.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-zinc-400" />
                <span>+91 22 6622 3737</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-zinc-400" />
                <span>Nariman Point, Mumbai 400021</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
