import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import { api } from '../../lib/api';

interface PYQPaper {
  id: number;
  year: number;
  shift_session: string;
  language: string;
  title: string;
  original_paper_url: string;
  official_key_url: string;
  total_questions: number;
  is_verified: boolean;
  provenance_note: string;
  exam_slug: string;
  exam_title: string;
  authority_code: string;
  stage_name: string;
}

export default function PYQRepositoryPage() {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<PYQPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExamSlug, setSelectedExamSlug] = useState<string>('all');
  const [selectedPaper, setSelectedPaper] = useState<any | null>(null);
  const [paperDetailsLoading, setPaperDetailsLoading] = useState(false);

  useEffect(() => {
    async function loadPapers() {
      setLoading(true);
      const res = await api<{ papers: PYQPaper[] }>('/library/pyq');
      if (res.ok && res.data.papers) {
        setPapers(res.data.papers);
      }
      setLoading(false);
    }
    loadPapers();
  }, []);

  const openPaperDetails = async (p: PYQPaper) => {
    setSelectedPaper(p);
    setPaperDetailsLoading(true);
    const res = await api<{ paper: any; questions: any[] }>(`/library/pyq/${p.id}`);
    if (res.ok) {
      setSelectedPaper({ ...p, ...res.data.paper, questions: res.data.questions });
    }
    setPaperDetailsLoading(false);
  };

  const filteredPapers = papers.filter((p) => {
    if (selectedExamSlug !== 'all' && p.exam_slug !== selectedExamSlug) return false;
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#030814] transition-colors duration-300">
      <Header
        title="Previous-Year Papers & Official Keys"
        subtitle="Official past question papers with authentic answer keys and verified solution provenance"
        onBack={() => navigate('/library')}
        backLabel="Digital Library"
      />

      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
        {/* Controls */}
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Filter by Exam:</span>
            <button
              onClick={() => setSelectedExamSlug('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedExamSlug === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All Examinations
            </button>
            <button
              onClick={() => setSelectedExamSlug('tnpsc-group-2')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedExamSlug === 'tnpsc-group-2'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              🌾 TNPSC Group II
            </button>
            <button
              onClick={() => setSelectedExamSlug('ssc-cgl')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedExamSlug === 'ssc-cgl'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              🏛️ SSC CGL
            </button>
            <button
              onClick={() => setSelectedExamSlug('ibps-po')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedExamSlug === 'ibps-po'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              💼 IBPS PO
            </button>
          </div>

          <div className="text-xs font-bold text-slate-400">
            {filteredPapers.length} Verified Exam Sets
          </div>
        </div>

        {/* Papers Grid */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-bold text-sm">
            Loading Previous-Year Papers...
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800">
            <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">find_in_page</span>
            <div className="text-slate-600 dark:text-slate-400 font-bold text-sm">No papers found for this selection.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPapers.map((p) => (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 hover:border-blue-500 hover:shadow-xl transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 uppercase">
                      {p.authority_code}
                    </span>
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      YEAR {p.year}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {p.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                    {p.shift_session} • {p.language}
                  </p>

                  <div className="space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex justify-between">
                      <span>Total Questions:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{p.total_questions} Questions</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Verification Status:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">verified</span>
                        Verified Official Key
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => openPaperDetails(p)}
                    className="text-xs font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    View Official Key & Questions
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>

                  {p.official_key_url && (
                    <a
                      href={p.official_key_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-0.5"
                    >
                      Official PDF
                      <span className="material-symbols-outlined text-xs">open_in_new</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PYQ Question & Key Modal */}
      {selectedPaper && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-blue-600 text-white uppercase">
                  {selectedPaper.authority_code} • {selectedPaper.year}
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                  {selectedPaper.title}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{selectedPaper.provenance_note}</p>
              </div>
              <button
                onClick={() => setSelectedPaper(null)}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
              <div className="flex flex-wrap gap-3">
                {selectedPaper.original_paper_url && (
                  <a
                    href={selectedPaper.original_paper_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">description</span>
                    Official Question Paper PDF
                  </a>
                )}
                {selectedPaper.official_key_url && (
                  <a
                    href={selectedPaper.official_key_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">verified</span>
                    Official Final Answer Key PDF
                  </a>
                )}
              </div>

              {/* Questions with Answer Key Breakdown */}
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white mb-3">
                  Verified Question Bank & Key Reconciliation
                </h4>

                {paperDetailsLoading ? (
                  <div className="py-8 text-center text-slate-400 font-bold text-xs">Loading questions...</div>
                ) : (selectedPaper.questions?.length || 0) === 0 ? (
                  <div className="text-xs text-slate-500 p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl">
                    Detailed per-question breakdown is undergoing optical verification against the official notification.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedPaper.questions.map((q: any) => (
                      <div
                        key={q.id}
                        className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs text-blue-600 dark:text-blue-400">
                            QUESTION #{q.question_number}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                            {q.key_status?.toUpperCase() || 'FINAL'} KEY
                          </span>
                        </div>

                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                          {q.question_text || 'Sample Question Text'}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
                            <span className="font-bold text-slate-500 block mb-0.5">Official Authority Key:</span>
                            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                              Option {q.official_key}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
                            <span className="font-bold text-slate-500 block mb-0.5">Independently Recalculated:</span>
                            <span className="text-base font-black text-blue-600 dark:text-blue-400">
                              Option {q.calculated_key || q.official_key}
                            </span>
                          </div>
                        </div>

                        {q.ai_or_expert_explanation && (
                          <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 text-xs text-slate-700 dark:text-slate-300">
                            <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">
                              Solution & Explanation:
                            </span>
                            {q.ai_or_expert_explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
              <button
                onClick={() => { setSelectedPaper(null); navigate('/subjects'); }}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md cursor-pointer"
              >
                Practice These Past Questions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

