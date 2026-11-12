import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import { api } from '../../lib/api';

interface Authority {
  id: number;
  code: string;
  name: string;
  website_url: string;
  description: string;
  state_name: string;
  state_code: string;
  is_national: boolean;
  active_exams_count: number;
}

interface Exam {
  id: number;
  code: string;
  title: string;
  slug: string;
  description: string;
  eligibility_summary: string;
  authority_code: string;
  authority_name: string;
  state_name: string;
  category_name: string;
  stages_count: number;
  active_syllabus_version: string;
}

export default function ExamDirectoryPage() {
  const navigate = useNavigate();
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScope, setSelectedScope] = useState<'all' | 'national' | 'tn'>('all');
  const [selectedAuthority, setSelectedAuthority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalExam, setActiveModalExam] = useState<any | null>(null);
  const [syllabusTree, setSyllabusTree] = useState<any[] | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [authRes, examRes] = await Promise.all([
        api<{ authorities: Authority[] }>('/catalog/authorities'),
        api<{ exams: Exam[] }>('/catalog/exams'),
      ]);
      if (authRes.ok && authRes.data.authorities) setAuthorities(authRes.data.authorities);
      if (examRes.ok && examRes.data.exams) setExams(examRes.data.exams);
      setLoading(false);
    }
    loadData();
  }, []);

  const openExamDetails = async (exam: Exam) => {
    setModalLoading(true);
    setActiveModalExam(exam);
    const [detailRes, sylRes] = await Promise.all([
      api<{ exam: any; stages: any[]; syllabus: any }>(`/catalog/exams/${exam.slug}`),
      api<{ syllabusTree: any[] }>(`/catalog/exams/${exam.slug}/syllabus`),
    ]);
    if (detailRes.ok) {
      setActiveModalExam({ ...exam, ...detailRes.data.exam, stages: detailRes.data.stages, syllabus: detailRes.data.syllabus });
    }
    if (sylRes.ok) {
      setSyllabusTree(sylRes.data.syllabusTree || []);
    }
    setModalLoading(false);
  };

  const filteredExams = exams.filter((e) => {
    if (selectedScope === 'national' && e.state_name !== 'Central / All-India') return false;
    if (selectedScope === 'tn' && e.state_name !== 'Tamil Nadu') return false;
    if (selectedAuthority !== 'all' && e.authority_code !== selectedAuthority) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        e.authority_name.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#030814] transition-colors duration-300">
      <Header
        title="Universal Examination Directory"
        subtitle="National & State competitive exam taxonomies, patterns, and official syllabuses"
        onBack={() => navigate('/dashboard')}
        backLabel="Dashboard"
      />

      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
        {/* Top Control Bar */}
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Scope Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Region:</span>
              <button
                onClick={() => setSelectedScope('all')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  selectedScope === 'all'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                All India & States
              </button>
              <button
                onClick={() => setSelectedScope('tn')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  selectedScope === 'tn'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                🌾 Tamil Nadu Priority
              </button>
              <button
                onClick={() => setSelectedScope('national')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  selectedScope === 'national'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                🏛️ Central / All-India
              </button>
            </div>

            {/* Cross-Exam Compare CTA */}
            <button
              onClick={() => navigate('/compare')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs hover:shadow-lg hover:shadow-blue-500/25 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">compare_arrows</span>
              Compare Syllabuses
            </button>
          </div>

          {/* Search & Authority Filters */}
          <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-3 top-3 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Search by exam name, post, code, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={selectedAuthority}
              onChange={(e) => setSelectedAuthority(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Authorities</option>
              {authorities.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.name} ({a.state_code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Authorities Banner Bar */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {authorities.map((a) => (
            <button
              key={a.code}
              onClick={() => setSelectedAuthority(selectedAuthority === a.code ? 'all' : a.code)}
              className={`flex-shrink-0 px-4 py-2 rounded-2xl border text-left transition-all ${
                selectedAuthority === a.code
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-black text-xs text-blue-600 dark:text-blue-400">{a.code}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-slate-500">
                  {a.state_code}
                </span>
              </div>
              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                {a.name}
              </div>
            </button>
          ))}
        </div>

        {/* Exam Cards Grid */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-bold text-sm">
            Loading Universal Examination Taxonomy...
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800">
            <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">find_in_page</span>
            <div className="text-slate-600 dark:text-slate-400 font-bold text-sm">No examinations match your criteria.</div>
            <button onClick={() => { setSelectedScope('all'); setSelectedAuthority('all'); setSearchQuery(''); }} className="mt-3 text-xs font-bold text-blue-600 underline">
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 hover:border-blue-500 hover:shadow-xl transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                      {exam.authority_code}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                      📍 {exam.state_name}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {exam.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 mb-4">
                    {exam.description || 'Comprehensive examination assessment blueprint.'}
                  </p>

                  <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                      <span>Stages:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{exam.stages_count} Stages</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                      <span>Syllabus:</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400 truncate max-w-[170px]">
                        {exam.active_syllabus_version || 'Official Notification'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => openExamDetails(exam)}
                    className="text-xs font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    View Syllabus & Pattern
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                  <button
                    onClick={() => navigate('/compare?exams=' + exam.slug)}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    title="Compare with another exam"
                  >
                    Compare
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exam Detail & Syllabus Modal */}
      {activeModalExam && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-gradient-to-r from-blue-600/5 to-transparent">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-blue-600 text-white">
                    {activeModalExam.authority_code}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {activeModalExam.state_name} • {activeModalExam.category_name}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  {activeModalExam.title}
                </h2>
              </div>
              <button
                onClick={() => { setActiveModalExam(null); setSyllabusTree(null); }}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-8 flex-1">
              {modalLoading ? (
                <div className="py-12 text-center text-slate-400 font-bold">Loading exam structure...</div>
              ) : (
                <>
                  {/* Eligibility Section */}
                  {activeModalExam.eligibility_summary && (
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-5 rounded-2xl">
                      <div className="font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">verified_user</span>
                        Eligibility Criteria
                      </div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                        {activeModalExam.eligibility_summary}
                      </p>
                    </div>
                  )}

                  {/* Examination Stages & Papers */}
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-500">layers</span>
                      Examination Stages & Pattern
                    </h4>

                    <div className="space-y-4">
                      {activeModalExam.stages?.map((stage: any) => (
                        <div
                          key={stage.id}
                          className="border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-900/30"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-black text-sm text-slate-900 dark:text-white">
                              Stage {stage.stage_order}: {stage.name}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{stage.pattern_summary}</p>

                          {stage.papers?.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {stage.papers.map((p: any) => (
                                <div key={p.id} className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-1">
                                  <div className="font-black text-slate-800 dark:text-slate-200">{p.title}</div>
                                  <div className="text-slate-500 flex justify-between">
                                    <span>Duration: {p.duration_minutes} mins</span>
                                    <span>Total: {p.total_marks} marks</span>
                                  </div>
                                  {Number(p.negative_marking_ratio) > 0 && (
                                    <div className="text-red-500 font-bold text-[10px]">
                                      Negative marking: -{p.negative_marking_ratio} marks
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Syllabus Tree */}
                  {syllabusTree && syllabusTree.length > 0 && (
                    <div>
                      <h4 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500">menu_book</span>
                        Syllabus Tree & Topics
                      </h4>

                      <div className="space-y-4">
                        {syllabusTree.map((subject: any) => (
                          <div key={subject.subject_id} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-950">
                            <div className="flex items-center justify-between font-black text-sm text-blue-600 dark:text-blue-400 mb-3">
                              <span>Subject: {subject.subject_name}</span>
                              {subject.weightage_percent > 0 && (
                                <span className="text-[11px] px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 font-bold">
                                  Weightage: ~{subject.weightage_percent}%
                                </span>
                              )}
                            </div>

                            {subject.units?.map((u: any) => (
                              <div key={u.id} className="ml-3 pl-3 border-l-2 border-slate-200 dark:border-slate-800 space-y-2 mt-3">
                                <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                  {u.title}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{u.description}</p>

                                {u.topics?.map((t: any) => (
                                  <div key={t.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-xs flex items-center justify-between">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                      • {t.name}
                                    </span>
                                    {t.quiz_count > 0 && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                                        {t.quiz_count} practice tests available
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3">
              <button
                onClick={() => navigate('/compare?exams=' + activeModalExam.slug + ',ssc-cgl')}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Compare with SSC CGL
              </button>
              <button
                onClick={() => { setActiveModalExam(null); navigate('/subjects'); }}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md cursor-pointer"
              >
                Practice Exam Questions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

