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
  Pencil,
  GraduationCap
} from 'lucide-react';
import { OrganiserProfile, OrganiserType } from '../types';
import { KalaStar } from './KalaLogo';
import { StudentTag } from './HostTypeTag';
import { CollegeAutocomplete } from './CollegeAutocomplete';
import { MediaPreview } from './MediaPreview';
import { MediaUploader } from './MediaUploader';

interface OrganiserProfileViewProps {
  profile: OrganiserProfile;
  userEmail: string;
  onUpdateProfile?: (updated: OrganiserProfile) => void;
  onLogoChange?: (url: string) => void;
}

export const OrganiserProfileView: React.FC<OrganiserProfileViewProps> = ({
  profile,
  userEmail,
  onUpdateProfile,
  onLogoChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingLogo, setIsEditingLogo] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editAbout, setEditAbout] = useState('');
  const [editCoverImage, setEditCoverImage] = useState('');
  const [editOrgType, setEditOrgType] = useState<OrganiserType>('venue');
  const [editCollege, setEditCollege] = useState('');
  const [editCollegeStudent, setEditCollegeStudent] = useState(false);

  const startEditing = () => {
    setEditName(profile.name);
    setEditCity(profile.city);
    setEditState(profile.state);
    setEditTagline(profile.tagline);
    setEditAbout(profile.about);
    setEditCoverImage(profile.coverImage);
    setEditOrgType(profile.orgType || 'venue');
    setEditCollege(profile.collegeName || '');
    setEditCollegeStudent(profile.collegeStudent ?? false);
    setIsEditing(true);
  };

  const saveProfile = () => {
    const name = editName.trim();
    if (!name) return;
    if (editCollegeStudent && !editCollege.trim()) return;
    onUpdateProfile?.({
      ...profile,
      name,
      city: editCity.trim() || profile.city,
      state: editState.trim() || profile.state,
      tagline: editTagline.trim(),
      about: editAbout.trim(),
      coverImage: editCoverImage,
      orgType: editOrgType,
      collegeName:
        editOrgType === 'society'
          ? editCollege.trim()
          : editCollegeStudent
            ? editCollege.trim()
            : profile.collegeName || '',
      collegeStudent: editCollegeStudent,
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Cover and Header Banner */}
      <div className="bg-white rounded-3xl border border-[#EDE8E0] overflow-hidden shadow-xs">
        {/* Cover Photo — swaps to the uploader while editing */}
        <div className={`relative bg-[#FAF2EB] overflow-hidden ${isEditing ? 'p-3' : 'h-48 sm:h-64'}`}>
          {isEditing ? (
            <MediaUploader
              label=""
              description="JPG, PNG or WEBP up to 5 MB. Shown at the top of your venue profile."
              value={editCoverImage}
              resourceType="image"
              folder="kala-venues/covers"
              onChange={(url) => setEditCoverImage(url)}
              onRemove={() => setEditCoverImage('')}
            />
          ) : (
            <>
              {profile.coverImage && (
                <MediaPreview
                  src={profile.coverImage}
                  alt={`${profile.name} cover`}
                  mediaClassName="w-full h-full object-contain object-center opacity-90"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent pointer-events-none" />
            </>
          )}
        </div>

          {/* Profile Details Container */}
          <div className="p-6 sm:p-8 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-6">
              <div className="flex items-start sm:items-end gap-5">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden ring-4 ring-white shadow-lg bg-[#FAF2EB] shrink-0 relative group/logo">
                {profile.logo && (
                  <MediaPreview
                    src={profile.logo}
                    alt={profile.name}
                    mediaClassName="w-full h-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setIsEditingLogo(!isEditingLogo)}
                  className="absolute inset-0 rounded-3xl bg-black/40 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                  title="Update logo"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              <div className="min-w-0">
                {isEditing && (
                  <div className="mb-3">
                    <div className="grid grid-cols-2 p-1 bg-[#FAF8F5] border border-[#E8E2D8] rounded-2xl">
                      <button
                        id="profile-org-type-venue"
                        type="button"
                        onClick={() => setEditOrgType('venue')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${editOrgType === 'venue' ? 'bg-[#E45826] text-white shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'}`}
                      >
                        Cultural Venue / Festival
                      </button>
                      <button
                        id="profile-org-type-society"
                        type="button"
                        onClick={() => setEditOrgType('society')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${editOrgType === 'society' ? 'bg-[#E45826] text-white shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'}`}
                      >
                        College Society / Club
                      </button>
                    </div>
                    {editOrgType === 'society' && (
                      <CollegeAutocomplete
                        value={editCollege}
                        onChange={setEditCollege}
                        maxLength={100}
                        ariaLabel="College name"
                        placeholder="e.g. Indian Institute of Technology Delhi"
                        wrapperClassName="mt-2"
                        className="w-full bg-[#FAF8F5] border border-[#E5E0D6] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#E45826]"
                      />
                    )}
                    <label className="mt-2 flex items-center gap-2 text-xs font-bold text-zinc-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="profile-college-student"
                        checked={editCollegeStudent}
                        onChange={(e) => setEditCollegeStudent(e.target.checked)}
                        className="w-4 h-4 accent-[#E45826] cursor-pointer"
                      />
                      I'm a college student
                    </label>
                    {editCollegeStudent && editOrgType !== 'society' && (
                      <CollegeAutocomplete
                        value={editCollege}
                        onChange={setEditCollege}
                        maxLength={100}
                        ariaLabel="Your college name"
                        placeholder="e.g. University of Mumbai"
                        wrapperClassName="mt-2"
                        className="w-full bg-[#FAF8F5] border border-[#E5E0D6] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#E45826]"
                      />
                    )}
                  </div>
                )}
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
                    <>
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
                        {profile.name || 'Your venue'}
                      </h1>
                      {profile.collegeStudent && profile.collegeName && (
                        <StudentTag college={profile.collegeName} className="mb-1" />
                      )}
                    </>
                  )}
                </div>
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
                      [profile.city, profile.state].filter(Boolean).join(', ') || 'Location not set'
                    )}
                  </span>
                </p>
                {profile.orgType === 'society' && (
                  <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-[11px] font-bold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
                    <GraduationCap className="w-3.5 h-3.5" />
                    College Society{profile.collegeName ? ` • ${profile.collegeName}` : ''}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={saveProfile}
                    disabled={!editName.trim() || (editCollegeStudent && !editCollege.trim())}
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
                {profile.tagline || 'Add a tagline in Edit Profile.'}
              </p>
            )}
          </div>

          {/* Logo Uploader */}
          {isEditingLogo && (
            <div className="mt-4 p-4 rounded-2xl bg-[#FAF8F5] border border-[#EBE4DA] animate-in fade-in duration-150">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-800">Update Venue Logo</span>
                <button
                  onClick={() => setIsEditingLogo(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-800"
                >
                  Close
                </button>
              </div>
              <MediaUploader
                resourceType="image"
                folder="kala-venues/logos"
                value={profile.logo}
                onChange={(url) => {
                  onLogoChange?.(url);
                  setIsEditingLogo(false);
                }}
              />
            </div>
          )}
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
                {profile.about || 'Add a short description of your programming vision in Edit Profile.'}
              </p>
            )}
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
              {profile.focusDisciplines.length === 0 && (
                <span className="text-xs text-zinc-400">No focus disciplines set yet.</span>
              )}
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
                <span className="truncate">{userEmail}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-zinc-400" />
                <span>{[profile.city, profile.state].filter(Boolean).join(', ') || 'Location not set'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
