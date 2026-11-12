import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/common/Header';
import { api } from '../../lib/api';

interface ExamOption {
  id: number;
  slug: string;
  title: string;
  authority_code: string;
}

export default function ExamComparisonPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [allExams, setAllExams] = useState<ExamOption[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(['tnpsc-group-2', 'ssc-cgl']);
  const [comparisonData, setComparisonData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize slugs from query params if available
  useEffect(() => {
    const q = searchParams.get('exams');
    if (q) {
      const parts = q.split(',').map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        setSelectedSlugs(parts);
      } else if (parts.length === 1) {
        setSelectedSlugs([parts[0], parts[0] === 'ssc-cgl' ? 'ibps-po' : 'ssc-cgl']);
      }
    }
  }, [searchParams]);

  // Load all available exams for selection dropdown
  useEffect(() => {
    async function loadExamsList() {
      const res = await api<{ exams: ExamOption[] }>('/catalog/exams');
      if (res.ok && res.data.exams) {
        setAllExams(res.data.exams);
      }
    }
    loadExamsList();
  }, []);

  // Fetch comparison data whenever selectedSlugs change
  useEffect(() => {
    async function fetchComparison() {
      if (selectedSlugs.length < 2) return;
      setLoading(true);
      setErrorMsg(null);
      const res = await api<{ comparedExams: any[]; comparison: any }>(
        `/catalog/compare?exams=${selectedSlugs.join(',')}`
      );
      if (res.ok && res.data.comparison) {
        setComparisonData(res.data);
      } else {
        setErrorMsg(res.data?.message || 'Could not load exam comparison');
      }
      setLoading(false);
    }
    fetchComparison();
  }, [selectedSlugs]);

  const handleToggleExam = (slug: string) => {
    let next: string[];
    if (selectedSlugs.includes(slug)) {
      if (selectedSlugs.length <= 2) return; // keep at least 2
      next = selectedSlugs.filter((s) => s !== slug);
    } else {
      if (selectedSlugs.length >= 3) {
        next = [selectedSlugs[0], selectedSlugs[1], slug]; // max 3
      } else {
        next = [...selectedSlugs, slug];
      }
    }
    setSelectedSlugs(next);
    setSearchParams({ exams: next.join(',') });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#030814] transition-colors duration-300">
      <Header
        title="Cross-Exam Comparison & Overlap Engine"
        subtitle="Compare examination patterns, eligibility, common subjects, and preparation synergy"
        onBack={() => navigate('/directory')}
        backLabel="Exam Directory"
      />

      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
        {/* Selection Bar */}
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                Select 2 or 3 Target Examinations
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                BANK-101 identifies common syllabus areas so you can prepare for multiple examinations without duplicating study effort.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {allExams.map((e) => {
                const isSelected = selectedSlugs.includes(e.slug);
                return (
                  <button
                    key={e.slug}
                    onClick={() => handleToggleExam(e.slug)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>{e.authority_code}</span>
                    <span className="font-normal opacity-80">{e.title.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Overlap Summary Card */}
        {comparisonData?.comparison && (
          <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-amber-500/10 border border-blue-500/30 p-6 md:p-8 rounded-3xl shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  Syllabus Synergy Analysis
                </span>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                  Common Syllabus Overlap: ~{comparisonData.comparison.overlapPercentage}%
                </h3>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  {comparisonData.comparison.preparationSynergyNote}
                </p>
              </div>

              <div className="flex gap-4">
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center min-w-[120px]">
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {comparisonData.comparison.commonSubjects?.length || 0}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Common Subjects</div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center min-w-[120px]">
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {comparisonData.comparedExams?.length || 0}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Exams</div>
                </div>
              </div>
            </div>

            {comparisonData.comparison.commonSubjects?.length > 0 && (
              <div className="pt-4 border-t border-blue-200/40 dark:border-blue-900/40 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Shared Preparation Modules:</span>
                {comparisonData.comparison.commonSubjects.map((sub: any) => (
                  <span
                    key={sub.id}
                    className="px-3 py-1 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 text-xs font-black flex items-center gap-1"
                  >
                    ⭐ {sub.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Side-by-Side Comparison Matrix */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-bold text-sm">
            Computing cross-examination comparison...
          </div>
        ) : errorMsg ? (
          <div className="p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold">
            {errorMsg}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comparisonData?.comparedExams?.map((exam: any) => (
              <div
                key={exam.id}
                className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-blue-600 text-white">
                      {exam.authority_code}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{exam.state_name}</span>
                  </div>

                  <div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white mb-1">{exam.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {exam.description}
                    </p>
                  </div>

                  {/* Eligibility */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                    <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">Eligibility:</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {exam.eligibility_summary || 'Standard graduation eligibility.'}
                    </p>
                  </div>

                  {/* Stages & Timing */}
                  <div className="space-y-2">
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200">Stages & Papers:</div>
                    {exam.stages?.map((stage: any) => (
                      <div key={stage.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                        <div className="font-black text-slate-900 dark:text-slate-100">
                          {stage.name}
                        </div>
                        <div className="text-[11px] text-slate-500">{stage.pattern_summary}</div>
                      </div>
                    ))}
                  </div>

                  {/* Negative Marking Scheme */}
                  <div className="space-y-1">
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200">Marking Schemes:</div>
                    {exam.papers?.map((p: any) => (
                      <div key={p.id} className="flex justify-between items-center text-[11px] text-slate-600 dark:text-slate-400">
                        <span>{p.title}:</span>
                        <span className={Number(p.negative_marking_ratio) > 0 ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}>
                          {Number(p.negative_marking_ratio) > 0 ? `-${p.negative_marking_ratio} negative` : 'No negative'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => navigate('/subjects')}
                    className="w-full py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-600 dark:text-blue-400 font-black text-xs transition-colors cursor-pointer"
                  >
                    Practice Questions
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

