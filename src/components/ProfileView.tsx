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
  Film
} from 'lucide-react';
import { KalaStar } from './KalaLogo';
import { MediaUploader } from './MediaUploader';

interface ProfileViewProps {
  completion: number;
  onUpdateCompletion: (newVal: number) => void;
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  completion,
  onUpdateCompletion,
  userName = "Mowleen Mukherjee",
  userEmail = "mowleen2006@gmail.com",
  avatarUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80",
}) => {
  const [currentAvatar, setCurrentAvatar] = useState(avatarUrl);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [reelUrl, setReelUrl] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80'
  ]);
  const [newGalleryImage, setNewGalleryImage] = useState('');
  const [showAddGallery, setShowAddGallery] = useState(false);

  const [bio, setBio] = useState(
    "Emerging multidisciplinary artist & music producer based in Mumbai. Crafting sonic landscapes bridging traditional Indian acoustic instruments with contemporary indie textures."
  );
  const [skills, setSkills] = useState([
    'Vocal Performance',
    'Acoustic Guitar',
    'Music Production',
    'Sound Design',
    'Audio Mixing',
    'Songwriting'
  ]);
  const [newSkill, setNewSkill] = useState('');

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
      if (completion < 100) {
        onUpdateCompletion(Math.min(100, completion + 9));
      }
    }
  };

  const handleReelUploaded = (url: string) => {
    setReelUrl(url);
    if (completion < 100) {
      onUpdateCompletion(100);
    }
  };

  const handleAddGalleryImage = (url: string) => {
    if (url) {
      setGalleryImages(prev => [url, ...prev]);
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

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
                  {userName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FAF2EB] text-[#E45826]">
                  Artist Pro
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  Mumbai, Maharashtra
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
          </div>
        </div>

        {/* Change Avatar Uploader */}
        {isEditingAvatar && (
          <div className="mt-5 p-4 rounded-2xl bg-[#FAF8F5] border border-[#EBE4DA] animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-800">Update Profile Avatar (Cloudinary Free CDN)</span>
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
                setCurrentAvatar(url);
                setIsEditingAvatar(false);
              }}
              maxSizeMB={10}
            />
          </div>
        )}

        {/* Bio */}
        <div className="mt-6 pt-6 border-t border-zinc-100">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">
            Artist Statement & Bio
          </label>
          <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed max-w-3xl">
            {bio}
          </p>
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
              Streamed through Cloudinary Free CDN. Directly attached to all your audition callbacks.
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
          onRemove={() => setReelUrl('')}
          maxSizeMB={50}
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
              High-resolution stage photos, costume stills, and album artwork stored on Cloudinary Free Tier.
            </p>
          </div>
          <button
            onClick={() => setShowAddGallery(!showAddGallery)}
            className="px-3 py-1.5 rounded-xl bg-[#FAF2EB] hover:bg-[#F6E4D7] text-[#E45826] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
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
              maxSizeMB={15}
            />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {galleryImages.map((imgUrl, idx) => (
            <div key={idx} className="relative aspect-4/3 rounded-2xl overflow-hidden border border-[#EDE7DE] group bg-zinc-100">
              <img src={imgUrl} alt={`Portfolio still ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-semibold text-white">
                Cloudinary CDN
              </div>
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
            <span
              key={skill}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#FAF8F5] border border-[#EDE7DE] text-zinc-700"
            >
              {skill}
            </span>
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

