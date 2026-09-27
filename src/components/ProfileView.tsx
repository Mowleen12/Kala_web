import React, { useState } from 'react';
import { motion } from 'motion/react';
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
  Pencil
} from 'lucide-react';
import { KalaStar } from './KalaLogo';
import { MediaUploader } from './MediaUploader';
import { getDraft, setDraft } from '../lib/drafts';

export interface ProfileMedia {
  avatar?: string;
  reel?: string;
  gallery?: string[];
}

interface ProfileText {
  name?: string;
  location?: string;
  bio?: string;
}

interface ProfileViewProps {
  completion: number;
  onUpdateCompletion: (newVal: number) => void;
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
  profileMedia?: ProfileMedia;
  onProfileMediaChange?: (patch: ProfileMedia) => void;
  onProfileTextSaved?: (name: string) => void;
}

const DEFAULT_GALLERY = [
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80'
];

const DEFAULT_SKILLS = [
  'Vocal Performance',
  'Acoustic Guitar',
  'Music Production',
  'Sound Design',
  'Audio Mixing',
  'Songwriting'
];

const DEFAULT_BIO =
  'Emerging multidisciplinary artist & music producer based in Mumbai. Crafting sonic landscapes bridging traditional Indian acoustic instruments with contemporary indie textures.';

export const ProfileView: React.FC<ProfileViewProps> = ({
  completion,
  onUpdateCompletion,
  userName = "Mowleen Mukherjee",
  userEmail = "mowleen2006@gmail.com",
  avatarUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80",
  profileMedia,
  onProfileMediaChange,
  onProfileTextSaved,
}) => {
  const profileTextKey = `kala_profile_text_${userEmail}`;
  const currentAvatar = profileMedia?.avatar || avatarUrl;
  const reelUrl = profileMedia?.reel || '';
  const galleryImages = profileMedia?.gallery || DEFAULT_GALLERY;
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [newGalleryImage, setNewGalleryImage] = useState('');
  const [showAddGallery, setShowAddGallery] = useState(false);

  const [displayName, setDisplayName] = useState<string>(
    () => getDraft<ProfileText>(`kala_profile_text_${userEmail}`)?.name || userName
  );
  const [location, setLocation] = useState<string>(
    () => getDraft<ProfileText>(`kala_profile_text_${userEmail}`)?.location || 'Mumbai, Maharashtra'
  );
  const [bio, setBio] = useState<string>(
    () => getDraft<ProfileText>(`kala_profile_text_${userEmail}`)?.bio || DEFAULT_BIO
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
    setDraft(profileTextKey, next);
    setIsEditingProfile(false);
    onProfileTextSaved?.(name);
  };

  const [skills, setSkills] = useState<string[]>(() => {
    const stored = getDraft<string[]>(`kala_skills_${userEmail}`);
    return stored && stored.length > 0 ? stored : DEFAULT_SKILLS;
  });
  const [newSkill, setNewSkill] = useState('');

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      const next = [...skills, newSkill.trim()];
      setSkills(next);
      setDraft(`kala_skills_${userEmail}`, next);
      setNewSkill('');
      if (completion < 100) {
        onUpdateCompletion(Math.min(100, completion + 9));
      }
    }
  };

  const handleReelUploaded = (url: string) => {
    onProfileMediaChange?.({ reel: url });
    if (completion < 100) {
      onUpdateCompletion(100);
    }
  };

  const handleAddGalleryImage = (url: string) => {
    if (url) {
      onProfileMediaChange?.({ gallery: [url, ...galleryImages] });
      setShowAddGallery(false);
      setNewGalleryImage('');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header Profile Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EDE8E0] shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <img
                src={currentAvatar}
                alt="Profile Avatar"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-[#FDEEE7]"
              />
              <button
                type="button"
                onClick={() => setIsEditingAvatar(!isEditingAvatar)}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                title="Update avatar via Cloudinary"
              >
                <Camera className="w-5 h-5" />
              </button>
              <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {isEditingProfile ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={60}
                    aria-label="Display name"
                    className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight bg-[#FAF8F5] border border-[#E5E0D6] rounded-xl px-3 py-1 outline-none focus:border-[#E45826] w-full sm:w-64"
                  />
                ) : (
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
                    {displayName}
                  </h1>
                )}
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  {isEditingProfile ? (
                    <input
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      maxLength={60}
                      aria-label="Location"
                      className="w-44 bg-[#FAF8F5] border border-[#E5E0D6] rounded-lg px-2 py-1 text-xs outline-none focus:border-[#E45826]"
                    />
                  ) : (
                    location
                  )}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  {userEmail}
                </span>
              </p>
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
              <div className="flex items-center gap-2 mt-3">
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
              {bio}
            </p>
          )}
        </div>
      </div>

      {/* Cloudinary Audition Reel Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EDE8E0] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Film className="w-4 h-4 text-[#E45826]" />
              Audition Reel & Performance Video
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Streamed through Cloudinary. Directly attached to all your audition callbacks.
            </p>
          </div>
        </div>

        <MediaUploader
          label="Upload Audition Reel (MP4 / MOV / WEBM)"
          description="Drag & drop or click to upload your performance reel. Curators can play it directly in their review room."
          folder="kala-artists/reels"
          resourceType="video"
          value={reelUrl}
          onChange={handleReelUploaded}
          onRemove={() => onProfileMediaChange?.({ reel: '' })}
        />
      </div>

      {/* Portfolio Stills & Gallery (Cloudinary Storage) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EDE8E0] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#E45826]" />
              Visual Portfolio & Stage Stills
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              High-resolution stage photos, costume stills, and album artwork stored on Cloudinary.
            </p>
          </div>
          <button
            onClick={() => setShowAddGallery(!showAddGallery)}
            className="px-4 py-2 rounded-xl bg-[#FAF2EB] hover:bg-[#F6E4D7] text-[#E45826] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Work</span>
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
          {galleryImages.map((imgUrl, idx) => (
            <div key={idx} className="relative aspect-4/3 rounded-2xl overflow-hidden border border-[#EDE7DE] group bg-zinc-100">
              <img src={imgUrl} alt={`Portfolio still ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
          ))}
        </div>
      </div>

      {/* Skills & Creative Disciplines */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EDE8E0] shadow-xs">
        <h3 className="text-base font-bold text-zinc-900 mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-[#E45826]" />
          Skills & Disciplines
        </h3>

        <div className="flex flex-wrap gap-2 mb-4">
          {skills.map((skill) => (
            <motion.span
              key={skill}
              layout
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#FAF8F5] border border-[#EDE7DE] text-zinc-700"
            >
              {skill}
            </motion.span>
          ))}
        </div>

        <div className="flex gap-2 max-w-sm">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
            placeholder="Add another skill (e.g. Cinema 4D)..."
            className="flex-1 bg-[#FAF8F5] border border-[#E5E0D6] rounded-xl px-3 py-1.5 text-xs text-zinc-900 outline-none focus:border-[#E45826]"
          />
          <button
            onClick={handleAddSkill}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold cursor-pointer"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

