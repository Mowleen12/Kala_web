import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  MapPin, 
  Calendar, 
  Link2, 
  AlertCircle, 
  Building2, 
  Film, 
  Image as ImageIcon, 
  FileText, 
  Plus, 
  Trash2, 
  Play, 
  Check,
  Eye,
  Sparkles
} from 'lucide-react';
import { Opportunity, VideoAttachment, ScriptAttachment } from '../types';
import { SkillsInput } from './SkillsInput';
import { HostTypeTag, CollegeOnlyTag, StudentTag } from './HostTypeTag';
import { CallTypeBadge } from './CallTypeBadge';
import { VideoPlayer } from './VideoPlayer';
import { getDraft, setDraft, clearDraft } from '../lib/drafts';
import { isLocalMediaUrl, resolveMediaUrl, storeLocalMedia } from '../lib/localMedia';
import { loadProfileSkills, loadProfileText } from '../lib/profile';
import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES, formatMB } from '../lib/limits';
import { validateApplyForm } from '../lib/applyForm';

interface ApplyDraft {
  portfolioUrl?: string;
  statement?: string;
  mediaUrl?: string;
  photographs?: string[];
  videos?: VideoAttachment[];
  scripts?: ScriptAttachment[];
  experienceYears?: string;
  skills?: string[] | string;
  city?: string;
}

export interface ApplyFormData {
  portfolioUrl?: string | null;
  statement?: string;
  reelUrl?: string | null;
  fileName?: string | null;
  experienceYears?: number;
  skills?: string[];
  city?: string;
  photographs?: string[];
  videos?: VideoAttachment[];
  scripts?: ScriptAttachment[];
}

const applyDraftKey = (oppId: string) => `kala_draft_apply_${oppId}`;

interface ApplyModalProps {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitApplication: (
    opp: Opportunity,
    appData: ApplyFormData
  ) => Promise<{ ok: boolean; error?: string }>;
  userName: string;
  userEmail: string;
  collegeName?: string;
  profileKey: string;
  onViewOrganizerProfile?: (opportunity: Opportunity) => void;
}

export const ApplyModal: React.FC<ApplyModalProps> = ({
  opportunity,
  isOpen,
  onClose,
  onSubmitApplication,
  userName,
  userEmail,
  collegeName,
  profileKey,
  onViewOrganizerProfile,
}) => {
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [statement, setStatement] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [city, setCity] = useState('');

  // Multi-File Upload State
  const [photographs, setPhotographs] = useState<string[]>([]);
  const [videos, setVideos] = useState<VideoAttachment[]>([]);
  const [scripts, setScripts] = useState<ScriptAttachment[]>([]);
  const [activePreviewVideoIdx, setActivePreviewVideoIdx] = useState(0);

  // Manual video link adder
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [isAddingVideoLink, setIsAddingVideoLink] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Restore saved draft
  useEffect(() => {
    if (!isOpen || !opportunity) return;
    const draft = getDraft<ApplyDraft>(applyDraftKey(opportunity.id));
    const profile = loadProfileText(profileKey);
    const profileSkills = loadProfileSkills(profileKey);

    setPortfolioUrl(draft?.portfolioUrl ?? '');
    setStatement(draft?.statement ?? profile.bio ?? '');
    setExperienceYears(draft?.experienceYears ?? '');

    const draftSkills = Array.isArray(draft?.skills)
      ? draft!.skills
      : (draft?.skills || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
    setSkills(draftSkills.length > 0 ? draftSkills : profileSkills);
    setCity(draft?.city ?? profile.location ?? '');

    // Multi-files restoration
    if (draft?.photographs && draft.photographs.length > 0) {
      setPhotographs(draft.photographs);
    } else if (draft?.mediaUrl) {
      setPhotographs([draft.mediaUrl]);
    } else {
      setPhotographs([]);
    }

    if (draft?.videos && draft.videos.length > 0) {
      setVideos(draft.videos);
    } else if (draft?.mediaUrl && (draft.mediaUrl.endsWith('.mp4') || draft.mediaUrl.includes('video'))) {
      setVideos([{ url: draft.mediaUrl, title: 'Primary Performance Video' }]);
    } else {
      setVideos([]);
    }

    if (draft?.scripts && draft.scripts.length > 0) {
      setScripts(draft.scripts);
    } else {
      setScripts([]);
    }

    setSubmitError(null);
    setFieldErrors({});
  }, [isOpen, opportunity?.id, profileKey]);

  // Persist draft while typing
  useEffect(() => {
    if (!isOpen || !opportunity) return;
    setDraft(applyDraftKey(opportunity.id), {
      portfolioUrl,
      statement,
      photographs,
      videos,
      scripts,
      experienceYears,
      skills,
      city,
    });
  }, [isOpen, opportunity?.id, portfolioUrl, statement, photographs, videos, scripts, experienceYears, skills, city]);

  if (!isOpen || !opportunity) return null;

  const isCollegeCall = opportunity.collegeOnly || opportunity.organiserType === 'society';

  const clearFieldError = (field: string) =>
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > IMAGE_MAX_BYTES) {
        setSubmitError(`Image ${file.name} exceeds max limit of ${formatMB(IMAGE_MAX_BYTES)}.`);
        continue;
      }
      try {
        const storedUrl = await storeLocalMedia(file);
        setPhotographs((prev) => [...prev, storedUrl]);
      } catch (err) {
        console.warn('Failed to store image:', err);
      }
    }
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotographs((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Video Upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > VIDEO_MAX_BYTES) {
        setSubmitError(`Video ${file.name} exceeds max limit of ${formatMB(VIDEO_MAX_BYTES)}.`);
        continue;
      }
      try {
        const storedUrl = await storeLocalMedia(file);
        const title = file.name.replace(/\.[^/.]+$/, '');
        setVideos((prev) => [...prev, { url: storedUrl, title }]);
      } catch (err) {
        console.warn('Failed to store video:', err);
      }
    }
    e.target.value = '';
  };

  const handleAddVideoLink = () => {
    if (!newVideoUrl.trim()) return;
    const title = newVideoTitle.trim() || `Video Performance ${videos.length + 1}`;
    setVideos((prev) => [...prev, { url: newVideoUrl.trim(), title }]);
    setNewVideoUrl('');
    setNewVideoTitle('');
    setIsAddingVideoLink(false);
  };

  const removeVideo = (index: number) => {
    setVideos((prev) => prev.filter((_, i) => i !== index));
    if (activePreviewVideoIdx >= index && activePreviewVideoIdx > 0) {
      setActivePreviewVideoIdx(activePreviewVideoIdx - 1);
    }
  };

  // Handle Script/Document Upload
  const handleScriptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const storedUrl = await storeLocalMedia(file);
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        setScripts((prev) => [
          ...prev,
          { url: storedUrl, title: file.name, size: `${sizeMb} MB` },
        ]);
      } catch (err) {
        console.warn('Failed to store document:', err);
      }
    }
    e.target.value = '';
  };

  const removeScript = (index: number) => {
    setScripts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const errs = validateApplyForm({ experienceYears, city, skills: skills.join(', ') });
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const primaryReel = videos.length > 0 ? videos[0].url : (photographs.length > 0 ? photographs[0] : null);
    const primaryFile = scripts.length > 0 ? scripts[0].title : null;

    const res = await onSubmitApplication(opportunity, {
      portfolioUrl: portfolioUrl || null,
      statement,
      reelUrl: primaryReel,
      fileName: primaryFile,
      experienceYears: experienceYears.trim() ? Number(experienceYears) || undefined : undefined,
      skills,
      city: city.trim() || undefined,
      photographs,
      videos,
      scripts,
    });

    setIsSubmitting(false);
    if (res && res.ok === false) {
      setSubmitError(res.error || 'Your registration could not be submitted. Please try again.');
      return;
    }

    clearDraft(applyDraftKey(opportunity.id));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#EDE8E0] overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative p-5 sm:p-6 border-b border-[#EDE8E0] bg-[#FAF8F5] shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-zinc-200/80 hover:bg-zinc-300 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#E45826] bg-[#FDEEE7] px-2.5 py-0.5 rounded-md">
              {opportunity.category}
            </span>
            <CallTypeBadge callType={opportunity.callType} variant="inline" />
            <HostTypeTag organiserType={opportunity.organiserType} />
            {isCollegeCall && <CollegeOnlyTag show={isCollegeCall} />}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight pr-8">
            Registration &bull; {opportunity.title}
          </h2>

          {/* Host & Profile Link */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-[#EDE8E0]/70 text-xs text-zinc-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900">{opportunity.organizer || 'Cultural Host'}</span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                {opportunity.venue}, {opportunity.city}
              </span>
            </div>

            {/* View Organizer Public Profile Trigger */}
            {onViewOrganizerProfile && (
              <button
                type="button"
                onClick={() => onViewOrganizerProfile(opportunity)}
                className="inline-flex items-center gap-1 text-[#E45826] hover:text-[#D44716] font-bold text-xs hover:underline cursor-pointer transition-colors"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>View Host Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Artist Identity Bar */}
          <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-zinc-200/80 flex items-center justify-between gap-3 text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400">Submitting as</div>
              <div className="font-bold text-zinc-900">{userName}</div>
              <div className="text-zinc-500 text-[11px]">{userEmail}</div>
            </div>
            {collegeName && <StudentTag college={collegeName} />}
          </div>

          {/* Basic Experience & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wide mb-1.5">
                Years of Experience <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="70"
                value={experienceYears}
                onChange={(e) => {
                  setExperienceYears(e.target.value);
                  clearFieldError('experienceYears');
                }}
                placeholder="e.g. 3"
                className="w-full bg-[#FAF8F5] border border-zinc-300 focus:border-[#E45826] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 outline-none transition-all shadow-2xs"
              />
              {fieldErrors.experienceYears && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.experienceYears}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wide mb-1.5">
                Current City / Base <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  clearFieldError('city');
                }}
                placeholder="e.g. Bengaluru, Karnataka"
                className="w-full bg-[#FAF8F5] border border-zinc-300 focus:border-[#E45826] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 outline-none transition-all shadow-2xs"
              />
              {fieldErrors.city && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.city}</p>
              )}
            </div>
          </div>

          <div>
            <SkillsInput
              id="apply-skills"
              label="Primary Artistic Skills & Disciplines"
              value={skills}
              onChange={(next) => {
                setSkills(next);
                clearFieldError('skills');
              }}
              ariaLabel="Your skills"
              placeholder="e.g. Carnatic Vocals, Sitar, Kathak, Stage Lighting"
              invalid={Boolean(fieldErrors.skills)}
            />
            {fieldErrors.skills && (
              <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.skills}</p>
            )}
          </div>

          {/* ================================================================= */}
          {/* DEDICATED SECTION 1: VIDEOS WITH INTEGRATED VIDEO PLAYER */}
          {/* ================================================================= */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#FAF8F5] border border-[#EDE8E0] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#E45826]" />
                  Performance &amp; Repertoire Videos ({videos.length})
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Upload multiple performance videos or paste direct video links.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-300 hover:border-[#E45826] text-zinc-800 text-xs font-semibold shadow-2xs transition-all cursor-pointer">
                  <Plus className="w-3.5 h-3.5 text-[#E45826]" />
                  <span>Upload Video</span>
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    multiple
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setIsAddingVideoLink(!isAddingVideoLink)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-zinc-300 hover:border-[#E45826] text-zinc-800 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  + Add Link
                </button>
              </div>
            </div>

            {/* Add Video Link Sub-Form */}
            {isAddingVideoLink && (
              <div className="p-3 bg-white rounded-2xl border border-zinc-200 space-y-2 animate-in fade-in">
                <input
                  type="url"
                  placeholder="Paste YouTube, Vimeo, or video stream link..."
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 outline-none focus:border-[#E45826]"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Video title / piece name (e.g. Round 1 Solo)"
                    value={newVideoTitle}
                    onChange={(e) => setNewVideoTitle(e.target.value)}
                    className="flex-1 text-xs p-2 rounded-xl border border-zinc-200 outline-none focus:border-[#E45826]"
                  />
                  <button
                    type="button"
                    onClick={handleAddVideoLink}
                    className="px-3.5 py-2 bg-[#E45826] text-white font-bold text-xs rounded-xl"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingVideoLink(false)}
                    className="px-3 py-2 bg-zinc-100 text-zinc-600 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* INTEGRATED VIDEO PLAYER PREVIEW */}
            {videos.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Interactive In-Form Video Preview:</span>
                  <span>Clip {activePreviewVideoIdx + 1} of {videos.length}</span>
                </div>

                {/* Multiple Video Selection Tabs */}
                {videos.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {videos.map((vid, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActivePreviewVideoIdx(idx)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer flex items-center gap-1 ${
                          activePreviewVideoIdx === idx
                            ? 'bg-zinc-950 text-white'
                            : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        <Film className="w-3 h-3 text-[#E45826]" />
                        <span className="truncate max-w-[130px]">{vid.title || `Video ${idx + 1}`}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Video Player */}
                <VideoPlayer
                  src={videos[activePreviewVideoIdx]?.url || videos[0].url}
                  title={videos[activePreviewVideoIdx]?.title || 'Uploaded Performance Video'}
                />

                {/* Uploaded Video List with Remove */}
                <div className="space-y-1.5 pt-2">
                  {videos.map((vid, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white border border-zinc-200/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Film className="w-3.5 h-3.5 text-[#E45826] shrink-0" />
                        <span className="font-semibold text-zinc-900 truncate">
                          {vid.title || `Video ${idx + 1}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVideo(idx)}
                        className="text-zinc-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="Remove video"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* DEDICATED SECTION 2: MULTIPLE PHOTOGRAPHS */}
          {/* ================================================================= */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#FAF8F5] border border-[#EDE8E0] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#E45826]" />
                  Photographs &amp; Stills ({photographs.length})
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Upload high-res stage photos, headshots, or production stills.
                </p>
              </div>

              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-300 hover:border-[#E45826] text-zinc-800 text-xs font-semibold shadow-2xs transition-all cursor-pointer">
                <Plus className="w-3.5 h-3.5 text-[#E45826]" />
                <span>Add Photos</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Photos Grid */}
            {photographs.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {photographs.map((url, idx) => (
                  <div
                    key={idx}
                    className="group relative aspect-square rounded-2xl overflow-hidden bg-white border border-zinc-200 shadow-2xs"
                  >
                    <img
                      src={url}
                      alt={`Uploaded photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                      title="Remove photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* DEDICATED SECTION 3: MULTIPLE SCRIPTS & DOCUMENTS */}
          {/* ================================================================= */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#FAF8F5] border border-[#EDE8E0] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#E45826]" />
                  Scripts, Musical Scores &amp; Documents ({scripts.length})
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Upload monologues, scene treatments, musical scores, or technical riders.
                </p>
              </div>

              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-300 hover:border-[#E45826] text-zinc-800 text-xs font-semibold shadow-2xs transition-all cursor-pointer">
                <Plus className="w-3.5 h-3.5 text-[#E45826]" />
                <span>Upload Document</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  multiple
                  onChange={handleScriptUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Scripts List */}
            {scripts.length > 0 && (
              <div className="space-y-2">
                {scripts.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-white border border-zinc-200/80 flex items-center justify-between text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="truncate">
                        <div className="font-bold text-zinc-900 truncate">{doc.title}</div>
                        <div className="text-[10px] text-zinc-400">{doc.size || 'Document'}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeScript(idx)}
                      className="text-zinc-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer"
                      title="Remove document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* External Portfolio / Social Link */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 mb-1">
              <Link2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>External Portfolio / Social Link (Optional)</span>
            </label>
            <input
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://instagram.com/your_handle or personal portfolio"
              className="w-full bg-[#FAF8F5] border border-zinc-300 focus:border-[#E45826] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 outline-none transition-all shadow-2xs"
            />
          </div>

          {/* Artist Statement / Pitch */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Artist Statement &amp; Submission Pitch for Jury &bull; Curator (Optional)
            </label>
            <textarea
              rows={3}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Briefly introduce your creative focus and what makes your submission compelling..."
              className="w-full bg-[#FAF8F5] border border-zinc-300 focus:border-[#E45826] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 outline-none transition-all shadow-2xs resize-none"
            />
          </div>

          {submitError && (
            <div className="flex items-start gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#E45826] hover:bg-[#D44716] active:scale-98 text-white text-sm font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSubmitting ? 'Transmitting Registration...' : 'Submit Event Registration'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
