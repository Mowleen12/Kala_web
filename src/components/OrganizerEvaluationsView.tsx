import React, { useState, useMemo } from 'react';
import { 
  Award, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  Eye, 
  FileText, 
  Filter, 
  QrCode, 
  Search, 
  Sparkles, 
  Star, 
  TrendingUp, 
  Users,
  MessageSquare
} from 'lucide-react';
import { 
  Application, 
  JudgeEvaluationSubmission, 
  Opportunity 
} from '../types';
import { CallTypeBadge } from './CallTypeBadge';
import { 
  calculateCandidateAggregate, 
  getSubmissionsForEvent, 
  loadAllJudgeSubmissions 
} from '../lib/judge';

interface OrganiserEvaluationsViewProps {
  opportunities: Opportunity[];
  applications: Application[];
  onOpenJudgeQr: (opp: Opportunity) => void;
  onUpdateApplicantStatus?: (appId: string, status: Application['status']) => void;
  onSelectArtist?: (appId: string) => void;
  onOpenThread?: (opportunityId: string, artistId: string) => void;
  selectedOpportunityId?: string;
}

export const OrganiserEvaluationsView: React.FC<OrganiserEvaluationsViewProps> = ({
  opportunities,
  applications,
  onOpenJudgeQr,
  onUpdateApplicantStatus,
  onSelectArtist,
  onOpenThread,
  selectedOpportunityId,
}) => {
  const handleCommissionArtist = (appId: string) => {
    if (onSelectArtist) {
      onSelectArtist(appId);
    } else if (onUpdateApplicantStatus) {
      onUpdateApplicantStatus(appId, 'selected');
    }
  };
  // Current active event selection
  const [activeOppId, setActiveOppId] = useState<string>(
    selectedOpportunityId || opportunities[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterView, setFilterView] = useState<'all' | 'shortlisted' | 'selected'>('all');
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);

  // Active Opportunity
  const currentOpp = useMemo(() => {
    return opportunities.find((o) => o.id === activeOppId) || opportunities[0] || null;
  }, [opportunities, activeOppId]);

  // Submissions for this event
  const submissions = useMemo(() => {
    if (!currentOpp) return [];
    return getSubmissionsForEvent(currentOpp.id);
  }, [currentOpp]);

  // Candidates for this event
  const candidates = useMemo(() => {
    if (!currentOpp) return [];
    return applications.filter((a) => a.opportunityId === currentOpp.id);
  }, [applications, currentOpp]);

  // Aggregate stats per candidate
  const candidateScores = useMemo(() => {
    return candidates.map((cand) => {
      const agg = calculateCandidateAggregate(cand.id, submissions);
      return {
        candidate: cand,
        ...agg,
      };
    }).sort((a, b) => b.averageScore - a.averageScore);
  }, [candidates, submissions]);

  // Filtered leaderboard
  const filteredLeaderboard = useMemo(() => {
    return candidateScores.filter(({ candidate, shortlistCount, selectCount }) => {
      const matchesSearch =
        candidate.artistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (candidate.artistRole && candidate.artistRole.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (candidate.artistCollege && candidate.artistCollege.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterView === 'shortlisted') return shortlistCount > 0 || selectCount > 0;
      if (filterView === 'selected') return candidate.status === 'selected';
      return true;
    });
  }, [candidateScores, searchQuery, filterView]);

  if (!currentOpp) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-[#EDE8E0] max-w-xl mx-auto space-y-3">
        <Award className="w-12 h-12 text-zinc-300 mx-auto" />
        <h3 className="font-extrabold text-base text-zinc-900">No Events Published Yet</h3>
        <p className="text-xs text-zinc-500">
          Publish a competition or event call first to enable judge evaluations and QR code jury access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Event Selector */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EDE8E0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#E45826] bg-[#FDEEE7] px-2.5 py-0.5 rounded-md">
              Centralized Jury Evaluation Desk
            </span>
            <CallTypeBadge callType={currentOpp.callType} variant="inline" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
            {currentOpp.title}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Category: <span className="font-bold text-zinc-700">{currentOpp.category}</span> &bull; {currentOpp.venue}, {currentOpp.city}
          </p>
        </div>

        {/* Event Switcher & QR Code Action */}
        <div className="flex flex-wrap items-center gap-3">
          {opportunities.length > 1 && (
            <div className="relative">
              <select
                value={activeOppId}
                onChange={(e) => setActiveOppId(e.target.value)}
                className="appearance-none bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 pr-8 text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#E45826] cursor-pointer shadow-2xs"
              >
                {opportunities.map((opp) => (
                  <option key={opp.id} value={opp.id}>
                    {opp.title} ({opp.category})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          )}

          <button
            onClick={() => onOpenJudgeQr(currentOpp)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-[#E45826]" />
            <span>Judge QR &amp; Access</span>
          </button>
        </div>
      </div>

      {/* Evaluation Progress & Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#EDE8E0] shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            Total Candidates
          </div>
          <div className="text-2xl font-black text-zinc-950 mt-1">{candidates.length}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Registered for this event</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#EDE8E0] shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Jury Submissions
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {submissions.filter((s) => s.isSubmitted).length} / {submissions.length || 0}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            {submissions.length === 0 ? 'No judges assigned yet' : 'Evaluation reports finalized'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#EDE8E0] shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-[#E45826]" />
            Jury Shortlists
          </div>
          <div className="text-2xl font-black text-[#E45826] mt-1">
            {candidateScores.filter((c) => c.shortlistCount > 0 || c.selectCount > 0).length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Candidates marked top tier</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#EDE8E0] shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            Overall Avg Score
          </div>
          <div className="text-2xl font-black text-zinc-900 mt-1">
            {candidateScores.length > 0 && candidateScores[0].averageScore > 0
              ? `${Math.round(
                  candidateScores.reduce((acc, c) => acc + c.averageScore, 0) /
                    candidateScores.filter((c) => c.averageScore > 0).length || 1
                )} / 40`
              : 'N/A'}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Across all judge scorecards</div>
        </div>
      </div>

      {/* Active Judges Panel */}
      {submissions.length > 0 && (
        <div className="bg-[#FAF8F5] rounded-3xl p-5 border border-[#EDE8E0] space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-700 flex items-center gap-2">
            <Award className="w-3.5 h-3.5 text-[#E45826]" />
            Assigned Jury Panel ({submissions.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {submissions.map((sub) => {
              const evalCount = Object.keys(sub.evaluations || {}).length;
              return (
                <div
                  key={sub.id}
                  className="p-3.5 rounded-2xl bg-white border border-zinc-200 shadow-2xs flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-extrabold text-zinc-950">{sub.judgeName}</div>
                    <div className="text-[11px] text-zinc-500">{sub.judgeTitle || 'Jury Member'}</div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        sub.isSubmitted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {sub.isSubmitted ? 'Submitted' : 'In Progress'}
                    </span>
                    <div className="text-[10px] text-zinc-400 mt-0.5 font-medium">
                      {evalCount} Evaluated
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Candidate Leaderboard & Detailed Scores Table */}
      <div className="bg-white rounded-3xl border border-[#EDE8E0] shadow-sm overflow-hidden">
        {/* Table Filters & Search */}
        <div className="p-5 border-b border-[#EDE8E0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF8F5]">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm sm:text-base text-zinc-950">
              Candidate Evaluation Leaderboard
            </h3>
            <span className="text-xs font-bold font-mono text-zinc-500 bg-zinc-200/60 px-2 py-0.5 rounded-md">
              {filteredLeaderboard.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs focus:outline-none focus:border-[#E45826]"
              />
            </div>

            <div className="flex items-center bg-zinc-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setFilterView('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterView === 'all' ? 'bg-white text-zinc-950 shadow-2xs' : 'text-zinc-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterView('shortlisted')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterView === 'shortlisted' ? 'bg-[#E45826] text-white shadow-2xs' : 'text-zinc-600'
                }`}
              >
                Shortlisted
              </button>
              <button
                onClick={() => setFilterView('selected')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterView === 'selected' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-zinc-600'
                }`}
              >
                Selected
              </button>
            </div>
          </div>
        </div>

        {/* Candidates Table */}
        <div className="overflow-x-auto">
          {filteredLeaderboard.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-400 space-y-2">
              <Users className="w-8 h-8 text-zinc-300 mx-auto" />
              <p>No candidates found matching the criteria.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EDE8E0] text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50/50">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4">Category &amp; College</th>
                  <th className="py-3 px-4">Jury Score</th>
                  <th className="py-3 px-4">Shortlist Votes</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredLeaderboard.map(({ candidate, averageScore, maxScore, percentage, ratingsCount, shortlistCount, selectCount, judgeEvaluations }, idx) => {
                  const isExpanded = expandedCandidateId === candidate.id;

                  return (
                    <React.Fragment key={candidate.id}>
                      <tr className="hover:bg-zinc-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-black text-zinc-400">
                          #{idx + 1}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                candidate.artistAvatar ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                              }
                              alt={candidate.artistName}
                              className="w-10 h-10 rounded-full object-cover border border-zinc-200 shrink-0"
                            />
                            <div>
                              <div className="font-extrabold text-zinc-950 text-xs sm:text-sm">
                                {candidate.artistName}
                              </div>
                              <div className="text-[11px] text-zinc-500">
                                {candidate.artistRole || 'Participant'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-zinc-800">{candidate.category}</div>
                          <div className="text-[11px] text-zinc-500">
                            {candidate.artistCollege || candidate.artistLocation || 'India'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {ratingsCount > 0 ? (
                            <div>
                              <div className="font-black text-zinc-950 text-sm flex items-center gap-1.5">
                                <span className="text-[#E45826]">{averageScore}</span>
                                <span className="text-zinc-400 font-normal text-xs">/ {maxScore}</span>
                              </div>
                              <div className="text-[10px] text-zinc-500 font-medium">
                                {ratingsCount} {ratingsCount === 1 ? 'Judge' : 'Judges'} ({percentage}%)
                              </div>
                            </div>
                          ) : (
                            <span className="text-zinc-400 italic text-[11px]">Pending evaluation</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {shortlistCount > 0 || selectCount > 0 ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FDEEE7] text-[#E45826] font-bold text-[11px]">
                              <Award className="w-3.5 h-3.5" />
                              <span>{shortlistCount + selectCount} Nominations</span>
                            </div>
                          ) : (
                            <span className="text-zinc-400 text-[11px]">&mdash;</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              candidate.status === 'selected'
                                ? 'bg-emerald-100 text-emerald-800'
                                : candidate.status === 'interview'
                                ? 'bg-[#FDEEE7] text-[#E45826]'
                                : candidate.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {candidate.status === 'selected'
                              ? 'Selected / Winner'
                              : candidate.status === 'interview'
                              ? 'Shortlisted'
                              : candidate.status === 'rejected'
                              ? 'Not Selected'
                              : 'Under Review'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Expand Judge Remarks Details */}
                            <button
                              onClick={() => setExpandedCandidateId(isExpanded ? null : candidate.id)}
                              className="px-2.5 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                              title="View Individual Judge Remarks"
                            >
                              <span>{isExpanded ? 'Hide' : 'Review'}</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Direct Commission / Shortlist Actions */}
                            {candidate.status !== 'selected' && (
                              <button
                                onClick={() => handleCommissionArtist(candidate.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                                title="Finalize and Commission this Candidate"
                              >
                                Select
                              </button>
                            )}

                            {onOpenThread && (
                              <button
                                onClick={() => onOpenThread(currentOpp.id, candidate.artistId)}
                                className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 transition-colors cursor-pointer"
                                title="Message Artist"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED ROW: Individual Judges Breakdown & Observations */}
                      {isExpanded && (
                        <tr className="bg-[#FAF8F5]">
                          <td colSpan={7} className="p-4 sm:p-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between pb-2 border-b border-[#EDE8E0]">
                                <h4 className="font-extrabold text-xs uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                                  <Sparkles className="w-3.5 h-3.5 text-[#E45826]" />
                                  Individual Judge Scorecards &amp; Qualitative Observations for {candidate.artistName}
                                </h4>
                                <span className="text-[11px] text-zinc-500 font-mono">
                                  {judgeEvaluations.length} {judgeEvaluations.length === 1 ? 'Scorecard' : 'Scorecards'} Submitted
                                </span>
                              </div>

                              {judgeEvaluations.length === 0 ? (
                                <div className="p-4 text-center text-xs text-zinc-400 bg-white rounded-xl border">
                                  No judge scorecards recorded yet for this candidate.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {judgeEvaluations.map((evalItem, eIdx) => (
                                    <div
                                      key={eIdx}
                                      className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-3 shadow-2xs"
                                    >
                                      <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                                        <div>
                                          <div className="font-extrabold text-xs text-zinc-950">
                                            {evalItem.judgeName}
                                          </div>
                                          <div className="text-[10px] text-zinc-500">
                                            {evalItem.judgeTitle || 'Jury Member'}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-sm font-black text-[#E45826]">
                                            {evalItem.score} / 40
                                          </div>
                                          <div className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500">
                                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                            <span>{evalItem.rating}.0</span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Feedback */}
                                      {evalItem.feedback && (
                                        <div className="space-y-1">
                                          <div className="text-[10px] uppercase font-bold text-zinc-400">
                                            Jury Critique Notes
                                          </div>
                                          <p className="text-xs text-zinc-700 leading-relaxed bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                                            {evalItem.feedback}
                                          </p>
                                        </div>
                                      )}

                                      {/* Strengths & Recommendations */}
                                      {(evalItem.strengths || evalItem.recommendations) && (
                                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                                          {evalItem.strengths && (
                                            <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                                              <span className="font-bold text-emerald-800 block text-[10px] uppercase">
                                                Strengths
                                              </span>
                                              <span className="text-emerald-950">{evalItem.strengths}</span>
                                            </div>
                                          )}
                                          {evalItem.recommendations && (
                                            <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                                              <span className="font-bold text-blue-800 block text-[10px] uppercase">
                                                Recommendations
                                              </span>
                                              <span className="text-blue-950">{evalItem.recommendations}</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
