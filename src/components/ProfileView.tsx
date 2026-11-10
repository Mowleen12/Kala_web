import React, { useState } from 'react';
import { 
  User, 
  MapPin, 
  Mail, 
  Phone, 
  ExternalLink, 
  CheckCircle2, 
  Award, 
  Plus, 
  Sparkles,
  Video,
  Play,
  Cloud,
  Camera,
  Film,
  Pencil,
  FileText,
} from 'lucide-react';
import { KalaStar } from './KalaLogo';
import { MediaUploader } from './MediaUploader';
import { MediaPreview } from './MediaPreview';
import { SkillsInput } from './SkillsInput';
import { ScriptAttachment } from '../types';
import { getDraft, setDraft } from '../lib/drafts';
import { computeProfileCompletion, ProfileFields } from '../lib/profile';
import { VIDEO_MAX_BYTES, formatMB } from '../lib/limits';
import { StudentTag } from './HostTypeTag';

export interface ProfileMedia {
  avatar?: string;
  /** Primary reel retained for compatibility with existing profile data. */
  reel?: string;
  videos?: string[];
  gallery?: string[];
  scripts?: ScriptAttachment[];
}

interface ProfileText {
  name?: string;
  location?: string;
  bio?: string;
}

interface ProfileViewProps {
  completion: number;
  onUpdateCompletion: (newVal: number) => void;
  profileKey: string;
  userName?: string;
  userEmail?: string;
  collegeName?: string;
  avatarUrl?: string;
  profileMedia?: ProfileMedia;
  onProfileMediaChange?: (patch: ProfileMedia) => void;
  onProfileTextSaved?: (name: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  completion,
  onUpdateCompletion,
  profileKey,
  userName = '',
  userEmail = '',
  collegeName = '',
  avatarUrl = '',
  profileMedia,
  onProfileMediaChange,
  onProfileTextSaved,
}) => {
  const profileTextDraftKey = `kala_profile_text_${profileKey}`;
  const skillsKey = `kala_skills_${profileKey}`;
  const currentAvatar = profileMedia?.avatar || avatarUrl;
  const reelUrl = profileMedia?.reel || profileMedia?.videos?.[0] || '';
  const profileVideos = Array.from(new Set([
    ...(profileMedia?.reel ? [profileMedia.reel] : []),
    ...(profileMedia?.videos || []),
  ]));
  const galleryImages = profileMedia?.gallery || [];
  const profileScripts = profileMedia?.scripts || [];
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [newGalleryImage, setNewGalleryImage] = useState('');
  const [showAddGallery, setShowAddGallery] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [showAddScript, setShowAddScript] = useState(false);

  // Completion is always recomputed from what actually exists — never +9 or
  // a hardcoded 100.
  const recomputeCompletion = (over: Partial<ProfileFields> = {}) => {
    const fields: ProfileFields = {
      name: displayName,
      location,
      bio,
      skills,
      avatar: currentAvatar,
      reel: reelUrl,
      gallery: galleryImages,
      ...over,
    };
    onUpdateCompletion(computeProfileCompletion(fields));
  };

  const [displayName, setDisplayName] = useState<string>(
    () => getDraft<ProfileText>(profileTextDraftKey)?.name || userName || 'Your name'
  );
  const [location, setLocation] = useState<string>(
    () => getDraft<ProfileText>(profileTextDraftKey)?.location || ''
  );
  const [bio, setBio] = useState<string>(
    () => getDraft<ProfileText>(profileTextDraftKey)?.bio || ''
  );

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editBio, setEditBio] = useState('');

  const startEditingProfile = () => {
    setEditName(displayName);
    setEditLocation(location);
    setEditBio(bio);
    setIsEditingProfile(true);
  };

  const saveProfileText = () => {
    const name = editName.trim();
    if (!name) return;
    const next: ProfileText = {
      name,
      location: editLocation.trim(),
      bio: editBio.trim(),
    };
    setDisplayName(name);
    setLocation(next.location || location);
    setBio(next.bio || bio);
    setDraft(profileTextDraftKey, next);
    setIsEditingProfile(false);
    recomputeCompletion({
      name,
      location: next.location || location,
      bio: next.bio || bio,
    });
    onProfileTextSaved?.(name);
  };

  const [skills, setSkills] = useState<string[]>(() => {
    const stored = getDraft<string[]>(skillsKey);
    return stored && stored.length > 0 ? stored : [];
  });

  const updateProfileVideos = (next: string[]) => {
    onProfileMediaChange?.({ videos: next, reel: next[0] || '' });
    recomputeCompletion({ reel: next[0] || '' });
  };

  const handleProfileVideoChanged = (index: number, url: string) => {
    const next = [...profileVideos];
    if (url) {
      next[index] = url;
    } else {
      next.splice(index, 1);
    }
    updateProfileVideos(next.filter(Boolean));
  };

  const handleAddProfileVideo = (url: string) => {
    if (!url) return;
    updateProfileVideos([...profileVideos, url]);
    setShowAddVideo(false);
  };

  const handleScriptChanged = (index: number, url: string) => {
    const next = [...profileScripts];
    if (url) {
      next[index] = { ...next[index], url };
    } else {
      next.splice(index, 1);
    }
    onProfileMediaChange?.({ scripts: next });
  };

  const handleAddScript = (url: string) => {
    if (!url) return;
    const title = `Script ${profileScripts.length + 1}`;
    onProfileMediaChange?.({
      scripts: [...profileScripts, { title, name: title, url }],
    });
    setShowAddScript(false);
  };

  const handleAddGalleryImage = (url: string) => {
    if (url) {
      const next = [url, ...galleryImages];
      onProfileMediaChange?.({ gallery: next });
      setShowAddGallery(false);
      setNewGalleryImage('');
      recomputeCompletion({ gallery: next });
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header Profile Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EDE8E0] shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-5 w-full min-w-0">
            <div className="relative group">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt="Profile Avatar"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-[#FDEEE7]"
                />
              ) : (
                <span className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#FDEEE7] text-[#E45826] text-3xl font-extrabold flex items-center justify-center ring-4 ring-[#FDEEE7]">
                  {(displayName || '?').charAt(0).toUpperCase()}
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsEditingAvatar(!isEditingAvatar)}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                title="Update avatar"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {isEditingProfile ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={60}
                    aria-label="Display name"
                    className="text-xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight bg-[#FAF8F5] border border-[#E5E0D6] rounded-xl px-3 py-1 outline-none focus:border-[#E45826] w-full sm:w-64"
                  />
                ) : (
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight break-words">
                    {displayName}
                  </h1>
                )}
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex flex-wrap items-center gap-1 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  {isEditingProfile ? (
                    <input
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      maxLength={60}
                      aria-label="Location"
                      className="min-w-0 w-full sm:w-44 bg-[#FAF8F5] border border-[#E5E0D6] rounded-lg px-2 py-1 text-xs outline-none focus:border-[#E45826]"
                    />
                  ) : (
                    location || 'Location not set'
                  )}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-1 min-w-0">
                  <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{userEmail}</span>
                </span>
              </p>
              {collegeName && (
                <div className="mt-2">
                  <StudentTag college={collegeName} />
                </div>
              )}
            </div>
          </div>

          <div className="w-full sm:w-auto flex flex-col sm:items-end">
            <div className="text-xs font-bold text-zinc-500 mb-1">
              Profile Completeness: <span className="text-[#E45826] text-sm">{completion}%</span>
            </div>
            <div className="w-full sm:w-48 bg-zinc-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#E45826] to-[#F97316] h-full rounded-full transition-all duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>
            {isEditingProfile ? (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button
                  onClick={saveProfileText}
                  disabled={!editName.trim()}
                  className="px-4 py-2 rounded-full bg-[#E45826] hover:bg-[#D44716] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 rounded-full bg-white border border-[#EDE8E0] text-zinc-700 text-xs font-semibold hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={startEditingProfile}
                className="mt-3 px-4 py-2 rounded-full bg-[#E45826] hover:bg-[#D44716] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Change Avatar Uploader */}
        {isEditingAvatar && (
          <div className="mt-5 p-4 rounded-2xl bg-[#FAF8F5] border border-[#EBE4DA] animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-800">Update Profile Avatar</span>
              <button
                onClick={() => setIsEditingAvatar(false)}
                className="text-xs text-zinc-500 hover:text-zinc-800"
              >
                Close
              </button>
            </div>
            <MediaUploader
              resourceType="image"
              folder="kala-artists/avatars"
              value={currentAvatar}
              onChange={(url) => {
                onProfileMediaChange?.({ avatar: url });
                recomputeCompletion({ avatar: url });
                setIsEditingAvatar(false);
              }}
            />
          </div>
        )}

        {/* Bio */}
        <div className="mt-6 pt-6 border-t border-zinc-100">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">
            Artist Statement & Bio
          </label>
          {isEditingProfile ? (
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              maxLength={600}
              rows={4}
              aria-label="Artist statement and bio"
              className="w-full max-w-3xl bg-[#FAF8F5] border border-[#E5E0D6] rounded-xl px-3 py-2 text-xs sm:text-sm text-zinc-700 leading-relaxed outline-none focus:border-[#E45826] resize-y"
            />
          ) : (
            <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed max-w-3xl">
              {bio || 'No artist statement yet — add one in Edit Profile.'}
            </p>
          )}
        </div>
      </div>

      {/* Cloudinary Performance Reel Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EDE8E0] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Film className="w-4 h-4 text-[#E45826]" />
              Performance Videos &amp; Showreels
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Add multiple videos to your artist profile. Your first video remains the primary reel.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddVideo((shown) => !shown)}
            className="px-4 py-2 rounded-xl bg-[#FAF2EB] hover:bg-[#F6E4D7] text-[#E45826] text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Video</span>
          </button>
        </div>

        <div className="space-y-4">
          {profileVideos.map((videoUrl, index) => (
            <MediaUploader
              key={`${videoUrl}-${index}`}
              label={`Performance Video ${index + 1}${index === 0 ? ' (Primary Reel)' : ''}`}
              description={`Upload an MP4, MOV, or WEBM video. Max ${formatMB(VIDEO_MAX_BYTES)}.`}
              folder="kala-artists/reels"
              resourceType="video"
              value={videoUrl}
              onChange={(url) => handleProfileVideoChanged(index, url)}
              onRemove={() => handleProfileVideoChanged(index, '')}
            />
          ))}
          {profileVideos.length === 0 && !showAddVideo && (
            <p className="text-xs text-zinc-400 text-center py-5 border border-dashed border-zinc-200 rounded-2xl">
              No performance videos added yet.
            </p>
          )}
          {showAddVideo && (
            <MediaUploader
              label="Add Performance Video"
              description={`Upload an MP4, MOV, or WEBM video. Max ${formatMB(VIDEO_MAX_BYTES)}.`}
              folder="kala-artists/reels"
              resourceType="video"
              onChange={handleAddProfileVideo}
            />
          )}
        </div>
      </div>

      {/* Portfolio Stills & Gallery (Cloudinary Storage) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EDE8E0] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#E45826]" />
              Visual Portfolio & Stage Stills
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Add multiple high-resolution stage photos, costume stills, and album artwork.
            </p>
          </div>
          <button
            onClick={() => setShowAddGallery(!showAddGallery)}
            className="px-4 py-2 rounded-xl bg-[#FAF2EB] hover:bg-[#F6E4D7] text-[#E45826] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Photo</span>
          </button>
        </div>

        {showAddGallery && (
          <div className="mb-4 p-4 rounded-2xl bg-[#FAF8F5] border border-[#EBE4DA] animate-in fade-in duration-150">
            <MediaUploader
              label="Add New Artwork / Stage Photo"
              resourceType="image"
              folder="kala-artists/gallery"
              value={newGalleryImage}
              onChange={handleAddGalleryImage}
            />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {galleryImages.length === 0 && (
            <p className="col-span-2 sm:col-span-3 text-xs text-zinc-400 text-center py-6 border border-dashed border-zinc-200 rounded-2xl">
              No work added yet — upload stage stills to build your visual portfolio.
            </p>
          )}
          {galleryImages.map((imgUrl, idx) => (
            <div key={idx} className="relative aspect-4/3 rounded-2xl overflow-hidden border border-[#EDE7DE] group bg-zinc-100">
              <MediaPreview
                src={imgUrl}
                alt={`Portfolio still ${idx + 1}`}
                mediaClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <button
                type="button"
                onClick={() => {
                  const next = galleryImages.filter((_, imageIndex) => imageIndex !== idx);
                  onProfileMediaChange?.({ gallery: next });
                  recomputeCompletion({ gallery: next });
                }}
                aria-label={`Remove portfolio photo ${idx + 1}`}
                className="absolute top-2 right-2 p-2 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Scripts & Documents */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EDE8E0] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#E45826]" />
              Scripts &amp; Documents
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Attach multiple scripts, portfolios, or other supporting documents to your profile.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddScript((shown) => !shown)}
            className="px-4 py-2 rounded-xl bg-[#FAF2EB] hover:bg-[#F6E4D7] text-[#E45826] text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Script</span>
          </button>
        </div>

        <div className="space-y-4">
          {profileScripts.map((script, index) => (
            <MediaUploader
              key={`${script.url}-${index}`}
              label={script.title || script.name || `Script ${index + 1}`}
              description="Upload a PDF, DOC, DOCX, RTF, or TXT document."
              folder="kala-artists/scripts"
              resourceType="raw"
              value={script.url}
              onChange={(url) => handleScriptChanged(index, url)}
              onRemove={() => handleScriptChanged(index, '')}
            />
          ))}
          {profileScripts.length === 0 && !showAddScript && (
            <p className="text-xs text-zinc-400 text-center py-5 border border-dashed border-zinc-200 rounded-2xl">
              No scripts or documents added yet.
            </p>
          )}
          {showAddScript && (
            <MediaUploader
              label={`Add Script ${profileScripts.length + 1}`}
              description="Upload a PDF, DOC, DOCX, RTF, or TXT document."
              folder="kala-artists/scripts"
              resourceType="raw"
              onChange={handleAddScript}
            />
          )}
        </div>
      </div>

      {/* Skills & Creative Disciplines */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EDE8E0] shadow-xs">
        <h3 className="text-base font-bold text-zinc-900 mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-[#E45826]" />
          Skills & Disciplines
        </h3>

        {skills.length === 0 && (
          <p className="text-xs text-zinc-400 mb-3">
            No skills listed yet — start typing below and pick from the suggestions.
          </p>
        )}

        <div className="max-w-lg">
          <SkillsInput
            id="profile-skills"
            value={skills}
            onChange={(next) => {
              setSkills(next);
              setDraft(skillsKey, next);
              recomputeCompletion({ skills: next });
            }}
            ariaLabel="Add a skill"
            placeholder="e.g. Hindustani Vocals, Bharatanatyam, Cinematography"
          />
        </div>
      </div>
    </div>
  );
};
