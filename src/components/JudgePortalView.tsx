import React, { useState, useEffect, useMemo } from 'react';
import { 
  Award, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Film, 
  Filter, 
  Image as ImageIcon, 
  Lock, 
  LogOut, 
  MapPin, 
  Search, 
  Send, 
  Sparkles, 
  Star, 
  Users, 
  X,
  Sliders,
  Check,
  Eye,
  Download,
  AlertCircle
} from 'lucide-react';
import { 
  Application, 
  CandidateEvaluation, 
  JudgeEvaluationSubmission, 
  JudgeEventAccess, 
  Opportunity, 
  ScoringCriterion, 
  TopCandidateRemark 
} from '../types';
import { CallTypeBadge } from './CallTypeBadge';
import { VideoPlayer } from './VideoPlayer';
import { 
  DEFAULT_SCORING_CRITERIA, 
  findJudgeAccess, 
  getJudgeDraft, 
  saveJudgeSubmission 
} from '../lib/judge';
import { KalaLogo } from './KalaLogo';

interface JudgePortalViewProps {
  opportunity?: Opportunity | null;
  opportunities?: Opportunity[];
  applications: Application[];
  initialCode?: string;
  initialEventCode?: string;
  initialEventId?: string;
  onExitPortal?: () => void;
  onExit?: () => void;
  onEvaluationSubmitted?: (submission: JudgeEvaluationSubmission) => void;
  onOpenThread?: (oppId: string, artistId: string) => void;
}

export const JudgePortalView: React.FC<JudgePortalViewProps> = ({
  opportunity: propOpportunity,
  opportunities = [],
  applications,
  initialCode = '',
  initialEventCode = '',
  initialEventId = '',
  onExitPortal,
  onExit,
  onEvaluationSubmitted,
  onOpenThread,
}) => {
  const handleExit = onExitPortal || onExit || (() => {});
  const effectiveInitialCode = initialCode || initialEventCode;
  // Judge Session State
  const [judgeAccessCode, setJudgeAccessCode] = useState(effectiveInitialCode);
  const [activeOppId, setActiveOppId] = useState<string>(
    propOpportunity?.id || initialEventId || (opportunities[0]?.id ?? '')
  );

  const opportunity: Opportunity = useMemo(() => {
    if (propOpportunity) return propOpportunity;
    if (activeOppId) {
      const byId = opportunities.find((o) => o.id === activeOppId);
      if (byId) return byId;
    }
    if (judgeAccessCode.trim()) {
      const byCode = opportunities.find((o) => Boolean(findJudgeAccess(judgeAccessCode, o.id)));
      if (byCode) return byCode;
    }
    return (
      opportunities[0] || {
        id: activeOppId || 'default-competition',
        title: 'Event Evaluation',
        category: 'Music & Dance',
        callType: 'competition',
        location: 'Grand Auditorium',
        venue: 'Kala Academy',
        city: 'Mumbai',
        dateRange: 'This Season',
        compensation: 'Cash Honorarium',
        imageUrl: '',
        statusBadge: { label: 'Active', variant: 'open' },
      }
    );
  }, [propOpportunity, opportunities, activeOppId, judgeAccessCode]);

  const [judgeName, setJudgeName] = useState('');
  const [judgeTitle, setJudgeTitle] = useState('');
  const [judgeEmail, setJudgeEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active View Tab: 'candidates' | 'top_selected' | 'guidelines'
  const [activeTab, setActiveTab] = useState<'candidates' | 'top_selected' | 'guidelines'>('candidates');

  // Candidate Selection & Filter
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'evaluated' | 'pending' | 'shortlisted'>('all');

  // Media Sub-Tab in Review: 'videos' | 'photos' | 'scripts'
  const [mediaTab, setMediaTab] = useState<'videos' | 'photos' | 'scripts'>('videos');
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Evaluation Submissions State
  const [evaluations, setEvaluations] = useState<Record<string, CandidateEvaluation>>({});
  const [topRemarks, setTopRemarks] = useState<Record<string, TopCandidateRemark>>({});
  const [overallRemarks, setOverallRemarks] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const criteria: ScoringCriterion[] = DEFAULT_SCORING_CRITERIA;

  // Filter applications for this specific event ONLY
  const eventCandidates = useMemo(() => {
    return applications.filter((app) => app.opportunityId === opportunity.id);
  }, [applications, opportunity.id]);

  // Attempt restoring existing session or prefilled code
  useEffect(() => {
    const savedJudge = localStorage.getItem(`kala_judge_session_${opportunity.id}`);
    if (savedJudge) {
      try {
        const parsed = JSON.parse(savedJudge);
        setJudgeName(parsed.name || '');
        setJudgeTitle(parsed.title || '');
        setJudgeEmail(parsed.email || '');
        setJudgeAccessCode(parsed.code || initialCode);
        setIsAuthenticated(true);
      } catch {}
    } else if (initialCode) {
      // Validate initialCode against opportunity
      const access = findJudgeAccess(initialCode, opportunity.id);
      if (access) {
        setJudgeAccessCode(access.code);
      }
    }
  }, [opportunity.id, initialCode]);

  // Restore existing evaluation draft once authenticated
  useEffect(() => {
    if (!isAuthenticated || !judgeName) return;

    const judgeId = `judge-${judgeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const draft = getJudgeDraft(opportunity.id, judgeId);

    if (draft) {
      setEvaluations(draft.evaluations || {});
      const remarksMap: Record<string, TopCandidateRemark> = {};
      (draft.topSelectedRemarks || []).forEach((r) => {
        remarksMap[r.candidateId] = r;
      });
      setTopRemarks(remarksMap);
      setOverallRemarks(draft.overallRemarks || '');
      setIsSubmitted(Boolean(draft.isSubmitted));
      setSubmittedAt(draft.submittedAt || null);
    }
  }, [isAuthenticated, judgeName, opportunity.id]);

  // Set default selected candidate
  useEffect(() => {
    if (eventCandidates.length > 0 && !selectedCandidateId) {
      setSelectedCandidateId(eventCandidates[0].id);
    }
  }, [eventCandidates, selectedCandidateId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAuthenticate = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!judgeName.trim()) {
      setAuthError('Please enter your full name or jury identifier.');
      return;
    }

    if (!judgeAccessCode.trim()) {
      setAuthError('Please enter the event judge access code.');
      return;
    }

    const access = findJudgeAccess(judgeAccessCode, opportunity.id);
    if (!access) {
      setAuthError('Invalid access code for this specific event. Check with the organizer or scan the official event QR code.');
      return;
    }

    // Save session
    localStorage.setItem(
      `kala_judge_session_${opportunity.id}`,
      JSON.stringify({
        name: judgeName.trim(),
        title: judgeTitle.trim(),
        email: judgeEmail.trim(),
        code: judgeAccessCode.trim(),
      })
    );

    setIsAuthenticated(true);
    showToast(`Welcome, ${judgeName}! Judge Portal loaded for "${opportunity.title}".`);
  };

  const handleLogoutJudge = () => {
    localStorage.removeItem(`kala_judge_session_${opportunity.id}`);
    setIsAuthenticated(false);
  };

  // Get active candidate
  const currentCandidate = useMemo(() => {
    return eventCandidates.find((c) => c.id === selectedCandidateId) || eventCandidates[0] || null;
  }, [eventCandidates, selectedCandidateId]);

  // Current candidate's evaluation state
  const currentEvaluation: CandidateEvaluation = useMemo(() => {
    if (!currentCandidate) {
      return {
        candidateId: '',
        candidateName: '',
        scores: [],
        totalScore: 0,
        maxTotalScore: 40,
        percentage: 0,
        rating: 0,
        selectionStatus: 'under_review',
        feedback: '',
        evaluatedAt: '',
      };
    }

    if (evaluations[currentCandidate.id]) {
      return evaluations[currentCandidate.id];
    }

    // Default blank evaluation
    const initialScores = criteria.map((c) => ({
      criterionId: c.id,
      criterionName: c.name,
      score: 7, // neutral starting point
      maxScore: c.maxScore,
    }));
    const total = initialScores.reduce((acc, s) => acc + s.score, 0);

    return {
      candidateId: currentCandidate.id,
      candidateName: currentCandidate.artistName,
      scores: initialScores,
      totalScore: total,
      maxTotalScore: 40,
      percentage: Math.round((total / 40) * 100),
      rating: 4,
      selectionStatus: 'under_review',
      feedback: '',
      evaluatedAt: new Date().toISOString(),
    };
  }, [currentCandidate, evaluations, criteria]);

  // Save changes to current candidate's evaluation
  const updateCandidateEvaluation = (patch: Partial<CandidateEvaluation>) => {
    if (!currentCandidate) return;

    const updated = {
      ...currentEvaluation,
      ...patch,
      candidateId: currentCandidate.id,
      candidateName: currentCandidate.artistName,
      evaluatedAt: new Date().toISOString(),
    };

    // Recompute total & percentage
    if (patch.scores) {
      const total = patch.scores.reduce((acc, s) => acc + s.score, 0);
      const max = patch.scores.reduce((acc, s) => acc + s.maxScore, 0);
      updated.totalScore = total;
      updated.maxTotalScore = max;
      updated.percentage = max > 0 ? Math.round((total / max) * 100) : 0;
    }

    const nextEvaluations = {
      ...evaluations,
      [currentCandidate.id]: updated,
    };
    setEvaluations(nextEvaluations);

    // If marked as shortlisted or selected, initialize top remark if missing
    if (updated.selectionStatus === 'shortlisted' || updated.selectionStatus === 'selected') {
      if (!topRemarks[currentCandidate.id]) {
        setTopRemarks((prev) => ({
          ...prev,
          [currentCandidate.id]: {
            candidateId: currentCandidate.id,
            candidateName: currentCandidate.artistName,
            rank: Object.keys(prev).length + 1,
            selectionRationale: '',
            keyObservations: '',
            strengths: '',
            recommendations: '',
          },
        }));
      }
    }

    // Persist draft
    saveCurrentDraft(nextEvaluations, topRemarks);
  };

  const updateCriterionScore = (criterionId: string, newScore: number) => {
    const scores = currentEvaluation.scores.map((s) =>
      s.criterionId === criterionId ? { ...s, score: newScore } : s
    );
    updateCandidateEvaluation({ scores });
  };

  const updateTopRemark = (candidateId: string, patch: Partial<TopCandidateRemark>) => {
    const candidate = eventCandidates.find((c) => c.id === candidateId);
    const existing = topRemarks[candidateId] || {
      candidateId,
      candidateName: candidate?.artistName || 'Candidate',
      rank: Object.keys(topRemarks).length + 1,
      selectionRationale: '',
      keyObservations: '',
      strengths: '',
      recommendations: '',
    };

    const nextRemarks = {
      ...topRemarks,
      [candidateId]: { ...existing, ...patch },
    };
    setTopRemarks(nextRemarks);
    saveCurrentDraft(evaluations, nextRemarks);
  };

  const saveCurrentDraft = (
    evals: Record<string, CandidateEvaluation>,
    remarks: Record<string, TopCandidateRemark>
  ) => {
    const judgeId = `judge-${judgeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const shortlistedIds = Object.keys(evals).filter(
      (id) => evals[id].selectionStatus === 'shortlisted' || evals[id].selectionStatus === 'selected'
    );

    const submission: JudgeEvaluationSubmission = {
      id: `${opportunity.id}_${judgeId}`,
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      eventCategory: opportunity.category,
      eventType: opportunity.callType || 'competition',
      judgeId,
      judgeName,
      judgeEmail,
      judgeTitle,
      judgeAccessCode,
      evaluations: evals,
      shortlistedCandidateIds: shortlistedIds,
      topSelectedRemarks: Object.values(remarks),
      overallRemarks,
      isSubmitted,
      submittedAt,
      updatedAt: new Date().toISOString(),
    };

    saveJudgeSubmission(submission);
  };

  const handleFinalSubmit = () => {
    const judgeId = `judge-${judgeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const shortlistedIds = Object.keys(evaluations).filter(
      (id) => evaluations[id].selectionStatus === 'shortlisted' || evaluations[id].selectionStatus === 'selected'
    );

    const now = new Date().toISOString();
    const submission: JudgeEvaluationSubmission = {
      id: `${opportunity.id}_${judgeId}`,
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      eventCategory: opportunity.category,
      eventType: opportunity.callType || 'competition',
      judgeId,
      judgeName,
      judgeEmail,
      judgeTitle,
      judgeAccessCode,
      evaluations,
      shortlistedCandidateIds: shortlistedIds,
      topSelectedRemarks: Object.values(topRemarks),
      overallRemarks,
      isSubmitted: true,
      submittedAt: now,
      updatedAt: now,
    };

    saveJudgeSubmission(submission);
    setIsSubmitted(true);
    setSubmittedAt(now);
    setIsSubmitModalOpen(false);

    if (onEvaluationSubmitted) {
      onEvaluationSubmitted(submission);
    }

    showToast('Evaluation submitted successfully to the Organizer Portal!');
  };

  // Metrics
  const evaluatedCount = Object.keys(evaluations).length;
  const shortlistedCandidates = useMemo(() => {
    return eventCandidates.filter((c) => {
      const ev = evaluations[c.id];
      return ev && (ev.selectionStatus === 'shortlisted' || ev.selectionStatus === 'selected');
    });
  }, [eventCandidates, evaluations]);

  // Filtered Candidate List
  const filteredCandidates = useMemo(() => {
    return eventCandidates.filter((c) => {
      const matchesSearch =
        c.artistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.artistRole && c.artistRole.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.artistCollege && c.artistCollege.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      const ev = evaluations[c.id];
      if (statusFilter === 'evaluated') return Boolean(ev);
      if (statusFilter === 'pending') return !ev;
      if (statusFilter === 'shortlisted') {
        return ev && (ev.selectionStatus === 'shortlisted' || ev.selectionStatus === 'selected');
      }
      return true;
    });
  }, [eventCandidates, searchQuery, statusFilter, evaluations]);

  // Navigate next/prev candidate
  const currentIndex = eventCandidates.findIndex((c) => c.id === selectedCandidateId);
  const handlePrevCandidate = () => {
    if (currentIndex > 0) {
      setSelectedCandidateId(eventCandidates[currentIndex - 1].id);
    }
  };
  const handleNextCandidate = () => {
    if (currentIndex < eventCandidates.length - 1) {
      setSelectedCandidateId(eventCandidates[currentIndex + 1].id);
    }
  };

  // Helper to extract videos from candidate (supports both array and legacy reel)
  const candidateVideos = useMemo(() => {
    if (!currentCandidate) return [];
    const list: { url: string; title?: string }[] = [];
    if (currentCandidate.videos && currentCandidate.videos.length > 0) {
      currentCandidate.videos.forEach((v) => list.push(v));
    }
    if (currentCandidate.reelUrl && !list.some((v) => v.url === currentCandidate.reelUrl)) {
      list.push({ url: currentCandidate.reelUrl, title: 'Primary Performance Reel' });
    }
    if (currentCandidate.mediaUrl && !list.some((v) => v.url === currentCandidate.mediaUrl)) {
      list.push({ url: currentCandidate.mediaUrl, title: 'Media Showcase' });
    }
    return list;
  }, [currentCandidate]);

  // Helper to extract photographs
  const candidatePhotos = useMemo(() => {
    if (!currentCandidate) return [];
    const photos = currentCandidate.photographs ? [...currentCandidate.photographs] : [];
    if (currentCandidate.artistAvatar && !photos.includes(currentCandidate.artistAvatar)) {
      photos.unshift(currentCandidate.artistAvatar);
    }
    if (currentCandidate.portfolioUrl && currentCandidate.portfolioUrl.startsWith('http') && !photos.includes(currentCandidate.portfolioUrl)) {
      photos.push(currentCandidate.portfolioUrl);
    }
    return photos;
  }, [currentCandidate]);

  // Helper to extract scripts/documents
  const candidateScripts = useMemo(() => {
    if (!currentCandidate) return [];
    const scripts = currentCandidate.scripts ? [...currentCandidate.scripts] : [];
    if (currentCandidate.fileName) {
      scripts.push({
        url: currentCandidate.portfolioUrl || '#',
        title: currentCandidate.fileName,
        size: '1.4 MB',
      });
    }
    return scripts;
  }, [currentCandidate]);

  // =========================================================================
  // 1. AUTHENTICATION SCREEN FOR JUDGES
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-zinc-900 flex flex-col justify-between p-4 sm:p-8">
        <header className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-[#EDE8E0]">
          <KalaLogo starSize={26} textSize="text-2xl" />
          <button
            onClick={handleExit}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Return to Platform</span>
          </button>
        </header>

        <main className="max-w-md mx-auto w-full my-auto py-8">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#E9E4DC] shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-[#FDEEE7] text-[#E45826] flex items-center justify-center mb-5 shadow-2xs">
              <Award className="w-6 h-6" />
            </div>

            <div className="space-y-1 mb-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#E45826] bg-[#FDEEE7] px-2 py-0.5 rounded-md">
                Jury Evaluation Portal
              </span>
              <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">
                Event Judge Verification
              </h1>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Sign in to evaluate candidates registered for <span className="font-semibold text-zinc-900">"{opportunity.title}"</span>.
              </p>
            </div>

            {authError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthenticate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1.5">
                  Your Full Name / Jury Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pt. Arvind Sharma or Dr. Meera Rao"
                  value={judgeName}
                  onChange={(e) => setJudgeName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:border-[#E45826] focus:ring-1 focus:ring-[#E45826] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1.5">
                  Affiliation or Jury Title <span className="text-zinc-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Director, National School of Drama"
                  value={judgeTitle}
                  onChange={(e) => setJudgeTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:border-[#E45826] focus:ring-1 focus:ring-[#E45826] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1.5">
                  Official Email <span className="text-zinc-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="email"
                  placeholder="judge@arts-jury.org"
                  value={judgeEmail}
                  onChange={(e) => setJudgeEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:border-[#E45826] focus:ring-1 focus:ring-[#E45826] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1.5">
                  Event Access Code / PIN <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. JDG-7249"
                    value={judgeAccessCode}
                    onChange={(e) => setJudgeAccessCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 font-mono uppercase tracking-wider rounded-xl border border-zinc-300 text-sm font-bold text-[#E45826] focus:border-[#E45826] focus:ring-1 focus:ring-[#E45826] focus:outline-none"
                  />
                  <Lock className="w-4 h-4 text-zinc-400 absolute right-3.5 top-3" />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Provided in the organizer invitation or encoded in your event QR code.
                </p>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 rounded-xl bg-[#E45826] hover:bg-[#D44716] text-white font-bold text-sm shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Enter Evaluation Room</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </main>

        <footer className="text-center text-xs text-zinc-500 max-w-md mx-auto">
          Confidential Evaluation Portal &bull; Access restricted to designated event jury.
        </footer>
      </div>
    );
  }

  // =========================================================================
  // 2. AUTHENTICATED JUDGE PORTAL MAIN WORKSPACE
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-zinc-900 flex flex-col antialiased">
      {/* Top Fixed Judge Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#EDE8E0] px-4 sm:px-6 py-3.5 shadow-2xs">
        <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Event Identification & Badge */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleExit}
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 transition-colors cursor-pointer"
              title="Return to Main Portal"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#E45826] bg-[#FDEEE7] px-2 py-0.5 rounded-md">
                  {opportunity.category}
                </span>
                <CallTypeBadge callType={opportunity.callType} variant="inline" />
                {isSubmitted && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3 h-3" /> Submitted
                  </span>
                )}
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-zinc-950 truncate max-w-md sm:max-w-xl">
                {opportunity.title} &bull; <span className="font-medium text-zinc-600">{opportunity.organizer || 'Cultural Host'}</span>
              </h1>
            </div>
          </div>

          {/* Center Tabs: Evaluation | Top Selected | Guidelines */}
          <div className="flex items-center bg-[#F4EFEA] p-1 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setActiveTab('candidates')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'candidates'
                  ? 'bg-white text-zinc-950 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#E45826]" />
              <span>Candidates ({eventCandidates.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('top_selected')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'top_selected'
                  ? 'bg-white text-zinc-950 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-[#E45826]" />
              <span>Top Selected ({shortlistedCandidates.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('guidelines')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'guidelines'
                  ? 'bg-white text-zinc-950 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-zinc-500" />
              <span>Rubric &amp; Rules</span>
            </button>
          </div>

          {/* Right: Judge Info & Submit Evaluation Button */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:block text-right">
              <div className="text-xs font-bold text-zinc-900">{judgeName}</div>
              <div className="text-[11px] text-zinc-500">{judgeTitle || 'Event Jury Panel'}</div>
            </div>

            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-[#E45826] hover:bg-[#D44716] active:scale-98 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitted ? 'Update Submission' : 'Submit Evaluation'}</span>
            </button>

            <button
              onClick={handleLogoutJudge}
              className="p-2 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              title="Sign Out as Judge"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <div className="flex-1 max-w-[1720px] w-full mx-auto p-3 sm:p-6 flex flex-col">
        {/* ========================================================================= */}
        {/* TAB 1: CANDIDATES EVALUATION WORKSPACE */}
        {/* ========================================================================= */}
        {activeTab === 'candidates' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
            {/* LEFT COLUMN: Candidate Roster & Filters (4 Cols on LG) */}
            <div className="order-2 lg:order-1 lg:col-span-4 bg-white rounded-3xl border border-[#EDE8E0] p-4 sm:p-5 space-y-4 shadow-sm flex flex-col max-h-[85vh]">
              {/* Filter Tabs */}
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <div>
                  <h3 className="font-extrabold text-zinc-950 text-sm">Participant Roster</h3>
                  <p className="text-[11px] text-zinc-500">
                    {evaluatedCount} of {eventCandidates.length} evaluated
                  </p>
                </div>
                <span className="text-xs font-bold font-mono text-[#E45826] bg-[#FDEEE7] px-2.5 py-1 rounded-full">
                  {Math.round((evaluatedCount / (eventCandidates.length || 1)) * 100)}% Done
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search participants by name, skill, or college..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs focus:outline-none focus:border-[#E45826]"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                    statusFilter === 'all' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  All ({eventCandidates.length})
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                    statusFilter === 'pending' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  Pending ({eventCandidates.length - evaluatedCount})
                </button>
                <button
                  onClick={() => setStatusFilter('evaluated')}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                    statusFilter === 'evaluated' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  Evaluated ({evaluatedCount})
                </button>
                <button
                  onClick={() => setStatusFilter('shortlisted')}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                    statusFilter === 'shortlisted' ? 'bg-[#E45826] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  Shortlisted ({shortlistedCandidates.length})
                </button>
              </div>

              {/* Candidates Scrollable List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredCandidates.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-400 border border-dashed rounded-2xl">
                    No participants match your filter criteria.
                  </div>
                ) : (
                  filteredCandidates.map((candidate) => {
                    const isSelected = candidate.id === currentCandidate?.id;
                    const evalData = evaluations[candidate.id];
                    const isShortlisted =
                      evalData && (evalData.selectionStatus === 'shortlisted' || evalData.selectionStatus === 'selected');

                    return (
                      <div
                        key={candidate.id}
                        onClick={() => setSelectedCandidateId(candidate.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-[#FDEEE7]/60 border-[#E45826] shadow-sm'
                            : 'bg-white hover:bg-zinc-50 border-zinc-200/80'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={
                              candidate.artistAvatar ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                            }
                            alt={candidate.artistName}
                            className="w-10 h-10 rounded-full object-cover shrink-0 border border-zinc-200"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs sm:text-sm text-zinc-950 truncate">
                              {candidate.artistName}
                            </h4>
                            <p className="text-[11px] text-zinc-500 truncate">
                              {candidate.artistRole || candidate.category || 'Creator'} &bull; {candidate.artistLocation || 'India'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {evalData ? (
                            <div>
                              <div className="text-xs font-extrabold text-[#E45826]">
                                {evalData.totalScore}/40
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                <span>{evalData.rating}.0</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-100 px-2 py-0.5 rounded-md">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Participant Evaluation Workspace (8 Cols on LG) */}
            {currentCandidate ? (
              <div className="order-1 lg:order-2 lg:col-span-8 space-y-4 sm:space-y-6">
                {/* Candidate Overview Card */}
                <div className="bg-white rounded-3xl border border-[#EDE8E0] p-4 sm:p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sm:pb-6 border-b border-[#EDE8E0]">
                    <div className="flex items-center gap-4">
                      <img
                        src={
                          currentCandidate.artistAvatar ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
                        }
                        alt={currentCandidate.artistName}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-[#E45826]/30 shadow-md shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl sm:text-2xl font-black text-zinc-950 break-words">
                            {currentCandidate.artistName}
                          </h2>
                          {currentCandidate.artistCollege && (
                            <span className="text-[11px] font-bold bg-[#FAF0E6] text-[#C73E0E] px-2.5 py-0.5 rounded-full border border-[#F3D5C3] break-words">
                              {currentCandidate.artistCollege}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 text-xs text-zinc-600 mt-1">
                          <span className="font-semibold text-zinc-900">{currentCandidate.artistRole || 'Participant'}</span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-zinc-400" />
                            {currentCandidate.artistLocation || 'India'}
                          </span>
                          {currentCandidate.experienceYears !== null && (
                            <>
                              <span>&bull;</span>
                              <span>{currentCandidate.experienceYears} Years Experience</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Prev / Next Candidate Controls */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        onClick={handlePrevCandidate}
                        disabled={currentIndex <= 0}
                        className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Previous Candidate"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold text-zinc-500 font-mono">
                        {currentIndex + 1} / {eventCandidates.length}
                      </span>
                      <button
                        onClick={handleNextCandidate}
                        disabled={currentIndex >= eventCandidates.length - 1}
                        className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Next Candidate"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Pitch / Statement & Skills */}
                  <div className="pt-4 space-y-3">
                    {currentCandidate.pitch && (
                      <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                          Artist Statement &amp; Submission Pitch
                        </h4>
                        <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed bg-[#FAF8F5] p-3.5 rounded-2xl border border-zinc-100">
                          {currentCandidate.pitch}
                        </p>
                      </div>
                    )}

                    {currentCandidate.skills && currentCandidate.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {currentCandidate.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* MEDIA REVIEW COMPONENT (Videos, Photographs, Scripts) */}
                <div className="bg-white rounded-3xl border border-[#EDE8E0] p-4 sm:p-6 shadow-sm space-y-4">
                  {/* Media Selector Tabs */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EDE8E0] pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setMediaTab('videos')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          mediaTab === 'videos'
                            ? 'bg-zinc-950 text-white shadow-2xs'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        }`}
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>Videos ({candidateVideos.length})</span>
                      </button>

                      <button
                        onClick={() => setMediaTab('photos')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          mediaTab === 'photos'
                            ? 'bg-zinc-950 text-white shadow-2xs'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Photographs ({candidatePhotos.length})</span>
                      </button>

                      <button
                        onClick={() => setMediaTab('scripts')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          mediaTab === 'scripts'
                            ? 'bg-zinc-950 text-white shadow-2xs'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Scripts &amp; Docs ({candidateScripts.length})</span>
                      </button>
                    </div>

                    <span className="text-[11px] text-zinc-400">
                      Multi-file evaluation enabled
                    </span>
                  </div>

                  {/* 1. VIDEOS TAB (With Integrated VideoPlayer) */}
                  {mediaTab === 'videos' && (
                    <div className="space-y-4">
                      {candidateVideos.length === 0 ? (
                        <div className="p-8 text-center text-xs text-zinc-400 border border-dashed rounded-2xl">
                          No performance videos submitted by this candidate.
                        </div>
                      ) : (
                        <div>
                          {/* If multiple videos, show video tabs */}
                          {candidateVideos.length > 1 && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-3">
                              {candidateVideos.map((vid, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setSelectedVideoIndex(idx)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                                    selectedVideoIndex === idx
                                      ? 'bg-[#E45826] text-white shadow-xs'
                                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                                  }`}
                                >
                                  <Film className="w-3 h-3" />
                                  <span>{vid.title || `Video Clip ${idx + 1}`}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Built-in Video Player for Selected Video */}
                          <VideoPlayer
                            src={candidateVideos[selectedVideoIndex]?.url || candidateVideos[0].url}
                            title={candidateVideos[selectedVideoIndex]?.title || `${currentCandidate.artistName} - Performance Video`}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. PHOTOGRAPHS TAB */}
                  {mediaTab === 'photos' && (
                    <div>
                      {candidatePhotos.length === 0 ? (
                        <div className="p-8 text-center text-xs text-zinc-400 border border-dashed rounded-2xl">
                          No photographs attached to this submission.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {candidatePhotos.map((photoUrl, idx) => (
                            <div
                              key={idx}
                              onClick={() => setLightboxImage(photoUrl)}
                              className="group relative aspect-4/3 rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200 cursor-pointer shadow-2xs hover:shadow-md transition-all"
                            >
                              <img
                                src={photoUrl}
                                alt={`Candidate photo ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Eye className="w-5 h-5 drop-shadow-md" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. SCRIPTS & DOCUMENTS TAB */}
                  {mediaTab === 'scripts' && (
                    <div className="space-y-3">
                      {candidateScripts.length === 0 ? (
                        <div className="p-8 text-center text-xs text-zinc-400 border border-dashed rounded-2xl">
                          No script or technical documents uploaded.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {candidateScripts.map((doc, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-2xl border border-zinc-200 bg-[#FAF8F5] flex items-center justify-between gap-3 shadow-2xs"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-zinc-900 truncate">{doc.title}</div>
                                  <div className="text-[10px] text-zinc-500">{doc.size || 'PDF Document'}</div>
                                </div>
                              </div>

                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl border border-zinc-200 hover:bg-white text-zinc-700 transition-colors shrink-0"
                                title="Open or Download Script"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* SCORING & EVALUATION CRITERIA PANEL */}
                <div className="bg-white rounded-3xl border border-[#EDE8E0] p-6 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EDE8E0]">
                    <div>
                      <h3 className="text-base font-extrabold text-zinc-950 flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-[#E45826]" />
                        Jury Evaluation &amp; Scoring Panel
                      </h3>
                      <p className="text-xs text-zinc-500">
                        Score each parameter on a scale of 1 to 10
                      </p>
                    </div>

                    {/* Overall Score Badge */}
                    <div className="flex items-center gap-3 bg-[#FAF8F5] px-4 py-2 rounded-2xl border border-[#EDE8E0]">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-zinc-400">Total Score</div>
                        <div className="text-lg font-black text-[#E45826]">
                          {currentEvaluation.totalScore} / {currentEvaluation.maxTotalScore}
                        </div>
                      </div>
                      <div className="h-8 w-px bg-zinc-200" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-zinc-400">Percentage</div>
                        <div className="text-lg font-black text-zinc-900">
                          {currentEvaluation.percentage}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4 Scoring Sliders / Steppers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {criteria.map((crit) => {
                      const scoreItem =
                        currentEvaluation.scores.find((s) => s.criterionId === crit.id) || {
                          criterionId: crit.id,
                          score: 7,
                          maxScore: 10,
                        };

                      return (
                        <div
                          key={crit.id}
                          className="p-4 rounded-2xl border border-zinc-200/80 bg-[#FAF8F5]/50 space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-xs font-bold text-zinc-900">{crit.name}</label>
                            <span className="text-xs font-black text-[#E45826] bg-white px-2 py-0.5 rounded-lg border border-zinc-200 font-mono shadow-2xs">
                              {scoreItem.score} / {crit.maxScore}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 leading-snug">{crit.description}</p>
                          <input
                            type="range"
                            min={1}
                            max={crit.maxScore}
                            value={scoreItem.score}
                            onChange={(e) => updateCriterionScore(crit.id, Number(e.target.value))}
                            className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#E45826]"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Rating Stars & Selection Status Picker */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Star Rating */}
                    <div className="p-4 rounded-2xl border border-zinc-200 bg-[#FAF8F5]/50 space-y-2">
                      <label className="text-xs font-bold text-zinc-900 block">Overall Star Rating</label>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((starVal) => (
                          <button
                            key={starVal}
                            type="button"
                            onClick={() => updateCandidateEvaluation({ rating: starVal })}
                            className="p-1 hover:scale-110 transition-transform cursor-pointer"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                starVal <= currentEvaluation.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-zinc-300'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-xs font-bold text-zinc-700 ml-2">
                          {currentEvaluation.rating} / 5 Stars
                        </span>
                      </div>
                    </div>

                    {/* Selection Status */}
                    <div className="p-4 rounded-2xl border border-zinc-200 bg-[#FAF8F5]/50 space-y-2">
                      <label className="text-xs font-bold text-zinc-900 block">Jury Decision Status</label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => updateCandidateEvaluation({ selectionStatus: 'shortlisted' })}
                          className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            currentEvaluation.selectionStatus === 'shortlisted'
                              ? 'bg-[#E45826] text-white shadow-xs'
                              : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                          }`}
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Shortlisted</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateCandidateEvaluation({ selectionStatus: 'selected' })}
                          className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            currentEvaluation.selectionStatus === 'selected'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Top Winner</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateCandidateEvaluation({ selectionStatus: 'under_review' })}
                          className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer ${
                            currentEvaluation.selectionStatus === 'under_review'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                          }`}
                        >
                          Under Review
                        </button>

                        <button
                          type="button"
                          onClick={() => updateCandidateEvaluation({ selectionStatus: 'not_selected' })}
                          className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer ${
                            currentEvaluation.selectionStatus === 'not_selected'
                              ? 'bg-zinc-800 text-white shadow-xs'
                              : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                          }`}
                        >
                          Not Selected
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Feedback Textarea */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-zinc-900 block">
                      Individual Evaluator Feedback &amp; Critique Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Add specific observations on technique, artistry, repertoire suitability, and execution..."
                      value={currentEvaluation.feedback || ''}
                      onChange={(e) => updateCandidateEvaluation({ feedback: e.target.value })}
                      className="w-full p-3.5 rounded-2xl border border-zinc-300 text-xs sm:text-sm focus:border-[#E45826] focus:ring-1 focus:ring-[#E45826] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: DEDICATED TOP SELECTED CANDIDATES SECTION */}
        {/* ========================================================================= */}
        {activeTab === 'top_selected' && (
          <div className="max-w-5xl mx-auto w-full space-y-6">
            <div className="bg-white rounded-3xl border border-[#EDE8E0] p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#EDE8E0]">
                <div>
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-[#E45826]" />
                    <h2 className="text-xl sm:text-2xl font-black text-zinc-950">
                      Top Selected &amp; Shortlisted Candidates
                    </h2>
                  </div>
                  <p className="text-xs text-zinc-600 mt-1">
                    Provide detailed remarks, key observations, and recommendations for the highest-performing participants.
                  </p>
                </div>

                <div className="text-xs font-bold text-zinc-700 bg-[#FAF8F5] px-4 py-2 rounded-2xl border border-zinc-200">
                  {shortlistedCandidates.length} Candidates Nominated
                </div>
              </div>

              {shortlistedCandidates.length === 0 ? (
                <div className="p-12 text-center text-xs text-zinc-500 space-y-3">
                  <Award className="w-10 h-10 text-zinc-300 mx-auto" />
                  <p className="font-semibold text-zinc-700">No candidates shortlisted yet</p>
                  <p className="max-w-sm mx-auto">
                    Go to the Candidates tab, review submissions, and mark top participants as "Shortlisted" or "Top Winner".
                  </p>
                  <button
                    onClick={() => setActiveTab('candidates')}
                    className="px-4 py-2 rounded-xl bg-zinc-900 text-white font-bold text-xs"
                  >
                    Evaluate Candidates
                  </button>
                </div>
              ) : (
                <div className="space-y-6 pt-6">
                  {shortlistedCandidates.map((candidate, idx) => {
                    const evalData = evaluations[candidate.id];
                    const remark = topRemarks[candidate.id] || {
                      candidateId: candidate.id,
                      candidateName: candidate.artistName,
                      rank: idx + 1,
                      selectionRationale: '',
                      keyObservations: '',
                      strengths: '',
                      recommendations: '',
                    };

                    return (
                      <div
                        key={candidate.id}
                        className="p-5 sm:p-6 rounded-3xl border-2 border-[#E9E4DC] bg-[#FAF8F5] space-y-5"
                      >
                        {/* Candidate Top Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2DBD0]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#E45826] text-white font-black text-xs flex items-center justify-center shrink-0">
                              #{remark.rank || idx + 1}
                            </div>
                            <img
                              src={
                                candidate.artistAvatar ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                              }
                              alt={candidate.artistName}
                              className="w-12 h-12 rounded-xl object-cover border border-zinc-300 shrink-0"
                            />
                            <div>
                              <h3 className="text-base font-extrabold text-zinc-950">
                                {candidate.artistName}
                              </h3>
                              <p className="text-xs text-zinc-600">
                                {candidate.artistRole || candidate.category} &bull; {candidate.artistCollege || candidate.artistLocation || 'India'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            <div className="text-right">
                              <span className="text-xs font-extrabold text-[#E45826]">
                                Score: {evalData?.totalScore || 0}/40
                              </span>
                              <div className="text-[10px] text-zinc-500 font-medium">
                                ({evalData?.percentage || 0}%)
                              </div>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                evalData?.selectionStatus === 'selected'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-[#FDEEE7] text-[#E45826]'
                              }`}
                            >
                              {evalData?.selectionStatus === 'selected' ? 'Top Winner' : 'Shortlisted'}
                            </span>
                          </div>
                        </div>

                        {/* Structured Remarks Form Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-800 uppercase tracking-wide flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#E45826]" />
                              Selection Rationale
                            </label>
                            <textarea
                              rows={2}
                              placeholder="Why does this candidate deserve top placement or nomination?"
                              value={remark.selectionRationale || ''}
                              onChange={(e) => updateTopRemark(candidate.id, { selectionRationale: e.target.value })}
                              className="w-full p-3 rounded-xl border border-zinc-300 bg-white text-xs focus:border-[#E45826] focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-800 uppercase tracking-wide flex items-center gap-1.5">
                              <Eye className="w-3.5 h-3.5 text-zinc-600" />
                              Key Observations
                            </label>
                            <textarea
                              rows={2}
                              placeholder="Notable artistic nuances, stage composure, or standout performance moments..."
                              value={remark.keyObservations || ''}
                              onChange={(e) => updateTopRemark(candidate.id, { keyObservations: e.target.value })}
                              className="w-full p-3 rounded-xl border border-zinc-300 bg-white text-xs focus:border-[#E45826] focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                              Core Strengths
                            </label>
                            <textarea
                              rows={2}
                              placeholder="E.g. Flawless pitch, innovative choreographic interpretation, vocal endurance..."
                              value={remark.strengths || ''}
                              onChange={(e) => updateTopRemark(candidate.id, { strengths: e.target.value })}
                              className="w-full p-3 rounded-xl border border-zinc-300 bg-white text-xs focus:border-[#E45826] focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                              Recommendations &amp; Next Stage
                            </label>
                            <textarea
                              rows={2}
                              placeholder="Suggestions for finals, commissioning notes, or award allocation..."
                              value={remark.recommendations || ''}
                              onChange={(e) => updateTopRemark(candidate.id, { recommendations: e.target.value })}
                              className="w-full p-3 rounded-xl border border-zinc-300 bg-white text-xs focus:border-[#E45826] focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: GUIDELINES & EVALUATION RUBRIC */}
        {/* ========================================================================= */}
        {activeTab === 'guidelines' && (
          <div className="max-w-4xl mx-auto w-full space-y-6">
            <div className="bg-white rounded-3xl border border-[#EDE8E0] p-6 sm:p-8 shadow-sm space-y-6">
              <div className="pb-4 border-b border-[#EDE8E0]">
                <h2 className="text-xl font-extrabold text-zinc-950">
                  Event Rubric &amp; Jury Guidelines
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Official evaluation framework for {opportunity.title}
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#E45826]">
                  Criteria Breakdown (40 Points Total)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {criteria.map((c) => (
                    <div key={c.id} className="p-4 rounded-2xl bg-[#FAF8F5] border border-zinc-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-zinc-900 text-sm">{c.name}</span>
                        <span className="text-xs font-extrabold text-[#E45826]">Max: {c.maxScore}</span>
                      </div>
                      <p className="text-xs text-zinc-600 leading-relaxed">{c.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-zinc-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                  Evaluation Process Notes
                </h3>
                <ul className="text-xs text-zinc-600 space-y-2 list-disc pl-4">
                  <li>Judges evaluate submissions independently. Scores are aggregated by the organizer.</li>
                  <li>Videos can be previewed directly using the integrated video player without needing download.</li>
                  <li>Shortlisted participants populate the Top Selected Candidates section automatically.</li>
                  <li>Once all candidates are scored, click "Submit Evaluation" to securely share your report with the host.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal for Photo Preview */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 text-white bg-black/50 rounded-full hover:bg-black/80"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Enlarged view"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl"
          />
        </div>
      )}

      {/* SUBMISSION CONFIRMATION MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#EDE8E0]">
            <div className="w-12 h-12 rounded-2xl bg-[#FDEEE7] text-[#E45826] flex items-center justify-center mb-4">
              <Send className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-extrabold text-zinc-950">
              Submit Evaluation to Organizer
            </h3>
            <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
              You are about to transmit your jury scorecard, candidate rankings, and selection remarks to{' '}
              <span className="font-semibold text-zinc-900">{opportunity.organizer || 'the organizer'}</span>.
            </p>

            {/* Evaluation Stats Summary */}
            <div className="my-5 p-4 rounded-2xl bg-[#FAF8F5] border border-zinc-200 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="text-base font-extrabold text-zinc-900">{evaluatedCount} / {eventCandidates.length}</div>
                <div className="text-[10px] text-zinc-500 uppercase">Evaluated</div>
              </div>
              <div>
                <div className="text-base font-extrabold text-[#E45826]">{shortlistedCandidates.length}</div>
                <div className="text-[10px] text-zinc-500 uppercase">Shortlisted</div>
              </div>
              <div>
                <div className="text-base font-extrabold text-emerald-600">
                  {evaluatedCount > 0
                    ? Math.round(
                        Object.values(evaluations).reduce((acc, e) => acc + e.totalScore, 0) / evaluatedCount
                      )
                    : 0} / 40
                </div>
                <div className="text-[10px] text-zinc-500 uppercase">Avg Score</div>
              </div>
            </div>

            {/* Overall Remarks Input */}
            <div className="space-y-1.5 mb-6">
              <label className="text-xs font-bold text-zinc-800 uppercase tracking-wide block">
                Overall Jury Remarks &amp; Feedback for Host
              </label>
              <textarea
                rows={3}
                placeholder="Concluding thoughts on the overall talent caliber, repertoire standards, or production advice..."
                value={overallRemarks}
                onChange={(e) => setOverallRemarks(e.target.value)}
                className="w-full p-3 rounded-xl border border-zinc-300 text-xs focus:border-[#E45826] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-xs font-bold text-zinc-700 transition-colors cursor-pointer"
              >
                Back to Review
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="flex-1 py-2.5 rounded-xl bg-[#E45826] hover:bg-[#D44716] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                Confirm &amp; Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-950 text-white px-5 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-medium flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-200">
          <div className="w-2 h-2 rounded-full bg-[#E45826]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
