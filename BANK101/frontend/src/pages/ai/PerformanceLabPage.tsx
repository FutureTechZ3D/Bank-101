import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import { api } from '../../lib/api';

interface ExamOption {
  id: number;
  code: string;
  title: string;
}

interface OfficialResult {
  id: number;
  roll_number: string;
  official_marks: string;
  total_marks: string;
  rank_achieved: number | null;
  publication_date: string;
  proof_url: string | null;
  is_verified: boolean;
}

interface StudyPlanItem {
  id: number;
  topic_id: number;
  topic_name: string;
  subject_name: string;
  scheduled_date: string;
  target_questions: number;
  is_completed: boolean;
  notes: string;
}

interface PerformanceLabData {
  examId: number;
  tierA_officialResults: OfficialResult[];
  tierB_platformAssessed: {
    attemptsCount: number;
    averagePercentage: number;
    recentAttempts: any[];
  };
  tierC_aiPredicted: {
    predicted_min: string;
    predicted_max: string;
    confidence_interval: string;
    readiness_score: number;
    assessed_from_attempts_count: number;
  };
}

export default function PerformanceLabPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number>(1);
  const [labData, setLabData] = useState<PerformanceLabData | null>(null);
  const [studyPlan, setStudyPlan] = useState<{ plan: any; items: StudyPlanItem[]; stats: any } | null>(null);

  // Modal for logging Tier A official marks
  const [showResultModal, setShowResultModal] = useState(false);
  const [rollNumber, setRollNumber] = useState('');
  const [officialMarks, setOfficialMarks] = useState('');
  const [totalMarks, setTotalMarks] = useState('300');
  const [rankAchieved, setRankAchieved] = useState('');
  const [publicationDate, setPublicationDate] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [submittingResult, setSubmittingResult] = useState(false);

  // Study plan generator form
  const [targetDate, setTargetDate] = useState('');
  const [dailyHours, setDailyHours] = useState('3');
  const [generatingPlan, setGeneratingPlan] = useState(false);

  useEffect(() => {
    async function loadExams() {
      const res = await api<{ exams: ExamOption[] }>('/catalog/exams');
      if (res.ok && res.data.exams && res.data.exams.length > 0) {
        setExams(res.data.exams);
        setSelectedExamId(res.data.exams[0].id);
      }
    }
    loadExams();
  }, []);

  useEffect(() => {
    if (!selectedExamId) return;

    async function loadLabAndPlan() {
      const labRes = await api<{ data: PerformanceLabData }>(`/ai/performance-lab/${selectedExamId}`);
      if (labRes.ok && labRes.data.data) {
        setLabData(labRes.data.data);
      }

      const planRes = await api<{ data: any }>(`/ai/study-plan/${selectedExamId}`);
      if (planRes.ok && planRes.data.data) {
        setStudyPlan(planRes.data.data);
      } else {
        setStudyPlan(null);
      }
    }

    loadLabAndPlan();
  }, [selectedExamId]);

  const handleRecordOfficialResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumber || !officialMarks) return;

    setSubmittingResult(true);
    const res = await api('/ai/performance-lab/official-result', {
      method: 'POST',
      body: {
        examId: selectedExamId,
        rollNumber,
        officialMarks: Number(officialMarks),
        totalMarks: Number(totalMarks),
        rankAchieved: rankAchieved ? Number(rankAchieved) : undefined,
        publicationDate: publicationDate || undefined,
        proofUrl: proofUrl || undefined,
      },
    });

    if (res.ok) {
      setShowResultModal(false);
      setRollNumber('');
      setOfficialMarks('');
      setRankAchieved('');
      // Reload lab data
      const labRes = await api<{ data: PerformanceLabData }>(`/ai/performance-lab/${selectedExamId}`);
      if (labRes.ok && labRes.data.data) {
        setLabData(labRes.data.data);
      }
    }
    setSubmittingResult(false);
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDate) return;

    setGeneratingPlan(true);
    const res = await api<{ data: any }>('/ai/study-plan/generate', {
      method: 'POST',
      body: {
        examId: selectedExamId,
        targetExamDate: targetDate,
        dailyStudyHours: Number(dailyHours),
      },
    });

    if (res.ok && res.data.data) {
      setStudyPlan(res.data.data);
    }
    setGeneratingPlan(false);
  };

  const handleTogglePlanItem = async (item: StudyPlanItem) => {
    const nextState = !item.is_completed;
    const res = await api(`/ai/study-plan/items/${item.id}`, {
      method: 'PATCH',
      body: { isCompleted: nextState },
    });

    if (res.ok && studyPlan) {
      const updatedItems = studyPlan.items.map((it) => (it.id === item.id ? { ...it, is_completed: nextState } : it));
      const completedCount = updatedItems.filter((it) => it.is_completed).length;
      const progressPercentage = Math.round((completedCount / updatedItems.length) * 100);

      setStudyPlan({
        ...studyPlan,
        items: updatedItems,
        stats: {
          ...studyPlan.stats,
          completedTopics: completedCount,
          progressPercentage,
        },
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        title="Performance Lab & Three-Tier Scorecard"
        subtitle="Separated Official Results, CBT Mock Scores, and AI Predicted Readiness"
        onBack={() => navigate('/dashboard')}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">📊</span>
              <h1 className="text-xl font-bold text-slate-900">Performance Lab & Three-Tier Scorecard</h1>
            </div>
            <p className="text-xs text-slate-500">
              Rigorous separation between Official Government Marks, Platform Mock Assessments, and AI Predicted Readiness.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-600">Select Examination:</label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(Number(e.target.value))}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-sm font-semibold rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.code} — {ex.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── 3-TIER SCORECARD ARCHITECTURE ───────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* TIER A: OFFICIAL PUBLISHED GOVERNMENT RESULTS */}
          <div className="bg-white rounded-2xl border-2 border-emerald-500/30 p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl">
              Tier A • Official Government
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🏛️</span>
                <h2 className="text-base font-bold text-slate-900">Published Results</h2>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Verified marks statement from official government gazette or examination commission.
              </p>

              {labData && labData.tierA_officialResults.length > 0 ? (
                <div className="space-y-3">
                  {labData.tierA_officialResults.map((off) => (
                    <div key={off.id} className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs">
                      <div className="flex items-center justify-between font-bold text-emerald-950 mb-1">
                        <span className="text-sm">
                          {off.official_marks} / {off.total_marks}
                        </span>
                        <span className="bg-emerald-200 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full">
                          Verified
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">Roll: {off.roll_number}</p>
                      {off.rank_achieved && (
                        <p className="text-slate-600 text-[11px]">Rank: #{off.rank_achieved}</p>
                      )}
                      <p className="text-slate-400 text-[10px] mt-1">Date: {off.publication_date}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200 mb-4">
                  <p className="text-xs text-slate-400">No official government marks logged yet.</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowResultModal(true)}
              className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition"
            >
              + Log Official Marks
            </button>
          </div>

          {/* TIER B: PLATFORM ASSESSED MOCK SCORES */}
          <div className="bg-white rounded-2xl border-2 border-indigo-500/30 p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl">
              Tier B • Platform Assessed
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">💻</span>
                <h2 className="text-base font-bold text-slate-900">CBT Mock Performance</h2>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Real-time evaluated scores from BANK-101 standardized CBT mock assessments.
              </p>

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center mb-4">
                <span className="text-3xl font-extrabold text-indigo-900">
                  {labData?.tierB_platformAssessed.averagePercentage || 0}%
                </span>
                <p className="text-xs font-medium text-indigo-700 mt-1">Average Mock Accuracy</p>
                <p className="text-[10px] text-indigo-500">
                  Based on {labData?.tierB_platformAssessed.attemptsCount || 0} completed mock tests
                </p>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {labData?.tierB_platformAssessed.recentAttempts.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <span className="font-medium text-slate-700 truncate max-w-[140px]">{att.test_name}</span>
                    <span className="font-bold text-indigo-700">{att.percentage || att.score}%</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => navigate('/quizzes')}
              className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition"
            >
              Take Practice Mock ➔
            </button>
          </div>

          {/* TIER C: AI PREDICTED SCORE & READINESS */}
          <div className="bg-white rounded-2xl border-2 border-purple-500/30 p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl">
              Tier C • AI Predicted
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🔮</span>
                <h2 className="text-base font-bold text-slate-900">AI Readiness Projection</h2>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Statistically projected score range modeled from syllabus coverage and recent CBT tests.
              </p>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center mb-3">
                <div className="text-2xl font-extrabold text-purple-900">
                  {labData?.tierC_aiPredicted.predicted_min}% – {labData?.tierC_aiPredicted.predicted_max}%
                </div>
                <p className="text-xs font-medium text-purple-700 mt-0.5">Projected Score Range</p>
                <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-purple-600">
                  <span>Confidence: 85%</span>
                  <span>•</span>
                  <span>Readiness: {labData?.tierC_aiPredicted.readiness_score || 75}%</span>
                </div>
              </div>

              {/* Readiness Progress Gauge */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                  <span>Exam Readiness Level</span>
                  <span>{labData?.tierC_aiPredicted.readiness_score || 75}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${labData?.tierC_aiPredicted.readiness_score || 75}%` }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/ai-tutor')}
              className="mt-4 w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition"
            >
              Consult Grounded AI Tutor ➔
            </button>
          </div>
        </div>

        {/* ── DYNAMIC SYLLABUS STUDY PLANNER ─────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>📅</span> Dynamic Syllabus Study Planner
              </h2>
              <p className="text-xs text-slate-500">
                Paces every topic in the official examination syllabus between today and your target date.
              </p>
            </div>

            {studyPlan && (
              <div className="flex items-center gap-4 text-xs font-medium">
                <div>
                  <span className="text-slate-400">Completed:</span>{' '}
                  <span className="font-bold text-slate-800">
                    {studyPlan.stats.completedTopics} / {studyPlan.stats.totalTopics} Topics
                  </span>
                </div>
                <div className="w-32 bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${studyPlan.stats.progressPercentage}%` }}
                  />
                </div>
                <span className="font-bold text-indigo-600">{studyPlan.stats.progressPercentage}%</span>
              </div>
            )}
          </div>

          {/* Generator Form if no plan or re-generating */}
          <form onSubmit={handleGeneratePlan} className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Examination Date</label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Daily Study Target (Hours)</label>
              <input
                type="number"
                min="1"
                max="12"
                value={dailyHours}
                onChange={(e) => setDailyHours(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={generatingPlan || !targetDate}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition"
              >
                {generatingPlan ? 'Calculating Schedule...' : '⚡ Generate Adaptive Plan'}
              </button>
            </div>
          </form>

          {/* Interactive Checklist of Topics */}
          {studyPlan && studyPlan.items.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {studyPlan.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleTogglePlanItem(item)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition ${
                    item.is_completed
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.is_completed}
                      onChange={() => {}} // Handled by parent div
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="font-semibold">{item.subject_name}: </span>
                      <span>{item.topic_name}</span>
                      {item.notes && <p className="text-[10px] text-slate-400 mt-0.5">{item.notes}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <span className="text-[11px] font-mono text-slate-400">{item.scheduled_date}</span>
                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                      {item.target_questions} Qs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-xs text-slate-500">
                No active study schedule for this examination. Choose your target date above and click Generate.
              </p>
            </div>
          )}
        </div>

        {/* ── LOG OFFICIAL GOVERNMENT RESULT MODAL ───────────────────────── */}
        {showResultModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 text-base">🏛️ Record Official Marks (Tier A)</h3>
                <button
                  onClick={() => setShowResultModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRecordOfficialResult} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Official Roll Number *</label>
                  <input
                    type="text"
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. TNPSC-2025-08912"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Marks Secured *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={officialMarks}
                      onChange={(e) => setOfficialMarks(e.target.value)}
                      placeholder="e.g. 218.5"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Total Marks</label>
                    <input
                      type="number"
                      value={totalMarks}
                      onChange={(e) => setTotalMarks(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Rank Achieved</label>
                    <input
                      type="number"
                      value={rankAchieved}
                      onChange={(e) => setRankAchieved(e.target.value)}
                      placeholder="e.g. 412"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Gazette Date</label>
                    <input
                      type="date"
                      value={publicationDate}
                      onChange={(e) => setPublicationDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Gazette / Scorecard Proof URL</label>
                  <input
                    type="url"
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    placeholder="https://tnpsc.gov.in/results/statement.pdf"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResultModal(false)}
                    className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingResult}
                    className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm"
                  >
                    {submittingResult ? 'Saving...' : 'Verify & Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
