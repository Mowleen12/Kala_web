import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Calendar, 
  MapPin, 
  IndianRupee, 
  Clock, 
  Sparkles, 
  Image as ImageIcon,
  CheckCircle2,
  Plus,
  Cloud
} from 'lucide-react';
import { Opportunity } from '../types';
import { KalaStar, KalaLogo } from './KalaLogo';
import { MediaUploader } from './MediaUploader';
import { getDraft, setDraft, clearDraft } from '../lib/drafts';
import { isLocalMediaUrl, resolveMediaUrl } from '../lib/localMedia';

interface PostOpportunityDraft {
  title?: string;
  category?: string;
  venue?: string;
  city?: string;
  dateRange?: string;
  compensation?: string;
  deadlineDays?: string;
  selectedImage?: string;
  description?: string;
  requirements?: string;
}

const DRAFT_KEY = 'kala_draft_post';

const DEFAULT_DESCRIPTION =
  'Seeking innovative performers and emerging creative voices for our curated seasonal spotlight. Open to solo artists and ensemble troupes.';
const DEFAULT_REQUIREMENTS =
  'Original portfolio or video reel (2-5 mins)\nAvailable for on-stage technical soundcheck\nOpen to artists aged 18-35';

interface PostOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (opp: Opportunity) => void;
  organizerName?: string;
}

const PRESET_IMAGES = [
  { label: 'Auditorium Stage', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=700&q=80' },
  { label: 'Film & Cinema Set', url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=80' },
  { label: 'Art Studio & Canvas', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=700&q=80' },
  { label: 'Theatre Rehearsal', url: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=700&q=80' },
  { label: 'Sound Studio', url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=700&q=80' },
];

export const PostOpportunityModal: React.FC<PostOpportunityModalProps> = ({
  isOpen,
  onClose,
  onPublish,
  organizerName = "National Centre for the Performing Arts (NCPA)",
}) => {
  const savedDraft = useRef(getDraft<PostOpportunityDraft>(DRAFT_KEY)).current;
  const [title, setTitle] = useState(savedDraft?.title ?? '');
  const [category, setCategory] = useState(savedDraft?.category ?? 'Music & Dance');
  const [venue, setVenue] = useState(savedDraft?.venue ?? 'NCPA Tata Theatre');
  const [city, setCity] = useState(savedDraft?.city ?? 'Mumbai, Maharashtra');
  const [dateRange, setDateRange] = useState(savedDraft?.dateRange ?? '18 Nov â€“ 22 Nov 2026');
  const [compensation, setCompensation] = useState(savedDraft?.compensation ?? 'â‚¹15,000 â€“ â‚¹30,000');
  const [deadlineDays, setDeadlineDays] = useState(savedDraft?.deadlineDays ?? '7');
  const [selectedImage, setSelectedImage] = useState(savedDraft?.selectedImage || PRESET_IMAGES[0].url);
  const [description, setDescription] = useState(savedDraft?.description ?? DEFAULT_DESCRIPTION);
  const [requirements, setRequirements] = useState(savedDraft?.requirements ?? DEFAULT_REQUIREMENTS);
  const [error, setError] = useState('');

  // Persist the in-progress call so it survives logout/login and reloads.
  useEffect(() => {
    setDraft(DRAFT_KEY, {
      title,
      category,
      venue,
      city,
      dateRange,
      compensation,
      deadlineDays,
      // setDraft swaps live blob: previews for stable IndexedDB refs, so a
      // custom cover survives reloads; unknown dead blobs fall back to preset.
      selectedImage,
      description,
      requirements,
    });
  }, [title, category, venue, city, dateRange, compensation, deadlineDays, selectedImage, description, requirements]);

  // Resolve a locally-stored cover ref (kala-idb:) into a live object URL
  // while the modal is open; fall back to the preset if the blob is gone.
  useEffect(() => {
    if (!isOpen || !isLocalMediaUrl(selectedImage)) return;
    let alive = true;
    resolveMediaUrl(selectedImage).then((resolved) => {
      if (!alive) return;
      setSelectedImage((resolved as string) || PRESET_IMAGES[0].url);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for the opportunity');
      return;
    }

    const newOpp: Opportunity = {
      id: `opp-${Date.now().toString().slice(-4)}`,
      title: title.trim(),
      category: category,
      categorySlug: category.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      statusBadge: {
        label: `Closes in ${deadlineDays} days`,
        variant: 'countdown',
      },
      location: `${venue} â€¢ ${city}`,
      venue: venue,
      city: city,
      dateRange: dateRange,
      compensation: compensation,
      imageUrl: selectedImage,
      organizer: organizerName,
      description: description,
      requirements: requirements.split('\n').filter(r => r.trim().length > 0),
      applicantCount: 0,
      status: 'active',
    };

    onPublish(newOpp);
    clearDraft(DRAFT_KEY);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#E9E4DC] my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
          {/* Left Feature Column */}
          <div className="lg:col-span-5 bg-[#FAF6F0] p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#EFEBE4] relative overflow-hidden">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 mb-6">
                <KalaStar size={24} className="text-[#E45826]" />
                <span className="font-brand font-black text-2xl text-zinc-900">kalÄ</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FDEEE7] text-[#E45826] ml-1">
                  ORGANISER
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight leading-tight mb-3">
                Publish a Curated Audition Call
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed mb-6">
                Your open call will be broadcasted to over 12,400+ verified creators across 50 Indian cities.
              </p>

              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FCEEE7] text-[#E45826] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">Direct Audition Reels</h4>
                    <p className="text-[11px] text-zinc-500">Listen to high-res audio and video submissions directly inside your pipeline.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FCEEE7] text-[#E45826] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">Transparent Honorariums</h4>
                    <p className="text-[11px] text-zinc-500">Clear compensations attract India's top 1% emerging independent talent.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FCEEE7] text-[#E45826] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">Verified Portfolios</h4>
                    <p className="text-[11px] text-zinc-500">Every submission includes identity verification and performance history.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Image Preview Pill */}
            <div className="relative rounded-2xl overflow-hidden aspect-[16/9] border border-[#EDE8E0] shadow-2xs mt-6">
              <img src={selectedImage} alt="Selected preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-end p-3">
                <span className="text-[11px] font-bold text-white">Call Cover Preview</span>
              </div>
            </div>
          </div>

          {/* Right Form Column */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Call Specifications</h3>
                <p className="text-xs text-zinc-500">Define the artistic role, venue, and honorarium.</p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-600">
                  {error}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Opportunity Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Monsoon Classical & Fusion Showcase 2026"
                  className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3.5 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-[#E45826]"
                />
              </div>

              {/* Category & Deadline Days */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Category Discipline</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-[#E45826]"
                  >
                    <option>Music & Dance</option>
                    <option>Film & Photography</option>
                    <option>Visual Arts</option>
                    <option>Theatre & Performance</option>
                    <option>Writing & Content</option>
                    <option>Design & Fashion</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Applications Close In</label>
                  <select
                    value={deadlineDays}
                    onChange={(e) => setDeadlineDays(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-[#E45826]"
                  >
                    <option value="4">4 days (Flash Call)</option>
                    <option value="7">7 days (Standard)</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days (Residency)</option>
                  </select>
                </div>
              </div>

              {/* Venue & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Venue / Auditorium</label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. NCPA Tata Theatre"
                    className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3.5 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-[#E45826]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">City & State</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Mumbai, Maharashtra"
                    className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3.5 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-[#E45826]"
                  />
                </div>
              </div>

              {/* Dates & Compensation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Event Dates</label>
                  <input
                    type="text"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    placeholder="e.g. 18 Nov â€“ 22 Nov"
                    className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3.5 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-[#E45826]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Honorarium / Compensation</label>
                  <input
                    type="text"
                    value={compensation}
                    onChange={(e) => setCompensation(e.target.value)}
                    placeholder="e.g. â‚¹15,000 â€“ â‚¹30,000"
                    className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3.5 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-[#E45826]"
                  />
                </div>
              </div>

              {/* Cover Image Preset Selector & Cloudinary Upload */}
              <div className="space-y-3">
                <MediaUploader
                  label="Opportunity Banner (Stored on Cloudinary)"
                  description="Upload a custom stage banner, production poster or venue photo"
                  resourceType="image"
                  folder="kala-opportunities"
                  value={selectedImage}
                  onChange={(url) => setSelectedImage(url)}
                  onRemove={() => setSelectedImage(PRESET_IMAGES[0].url)}
                />

                <div>
                  <span className="text-[11px] font-semibold text-zinc-500 block mb-1.5">Or choose a curated stage preset:</span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {PRESET_IMAGES.map((img) => (
                      <button
                        key={img.url}
                        type="button"
                        onClick={() => setSelectedImage(img.url)}
                        className={`relative w-20 h-14 rounded-xl overflow-hidden shrink-0 border-2 cursor-pointer transition-all ${
                          selectedImage === img.url ? 'border-[#E45826] scale-102 ring-2 ring-[#E45826]/30' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Curatorial Synopsis</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl p-3 text-xs text-zinc-900 outline-none focus:border-[#E45826]"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-[#E45826] hover:bg-[#D44716] text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Publish Call to 12,400+ Artists</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
