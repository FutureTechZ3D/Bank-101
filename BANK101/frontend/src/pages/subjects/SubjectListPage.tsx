import { useNavigate } from 'react-router-dom';
import { useNavStore } from '../../app/store/navStore';
import Header from '../../components/common/Header';

const TEST_TYPES = [
  { label: 'Quiz Test', icon: 'edit_note', badge: 'Free', badgeClass: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400', desc: 'Topic-wise short tests (8 quizzes per topic)' },
  { label: 'Mock Test', icon: 'alarm', badge: 'Free', badgeClass: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400', desc: 'Full-length timed exam simulation' },
  { label: 'Model Exam', icon: 'description', badge: 'Free', badgeClass: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400', desc: 'Official exam pattern based test' },
  { label: 'Previous Year Paper', icon: 'history', badge: 'Pro', badgeClass: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20', desc: 'Actual past question papers' },
  { label: 'Current Year Pattern', icon: 'timeline', badge: 'Pro', badgeClass: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20', desc: 'AI-generated based on latest syllabus' },
  { label: 'Syllabus-Based Test', icon: 'menu_book', badge: 'Free', badgeClass: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400', desc: 'Chapter-wise complete coverage' },
];

export default function SubjectListPage() {
  const navigate = useNavigate();
  const { selectedExamType, setSelectedSubject } = useNavStore();

  const handleSelect = (subject: any) => {
    setSelectedSubject(subject);
    navigate('/topics');
  };

  if (!selectedExamType) {
    return (
      <div className="flex-1 p-10 text-slate-500 dark:text-slate-400 font-bold">
        No exam type selected.{' '}
        <button onClick={() => navigate('/exams')} className="text-blue-500 underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#030814] transition-colors duration-300">
      <Header
        title={`${selectedExamType.label} Subjects`}
        subtitle="Choose a subject to drill down into specific chapters."
        onBack={() => navigate('/exams')}
        backLabel="Exam Types"
      />
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">

        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Available Subjects</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {selectedExamType.subjects?.map((sub: any, idx: number) => (
              <button
                key={idx}
                onClick={() => handleSelect(sub)}
                className="group flex flex-col items-center text-center bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl hover:-translate-y-1 hover:shadow-xl hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer shadow-sm"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-350">{sub.icon || '📚'}</div>
                <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm mb-3">{sub.name}</div>
                <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-600/15 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-900/20">
                  {sub.topics?.length || 0} topics
                </div>
              </button>
            ))}
          </div>
        </section>

        <hr className="border-slate-200 dark:border-slate-800/80" />

        <section className="space-y-6">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Test Formats Available</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Multiple learning paths matching national test-prep standards.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEST_TYPES.map((t, idx) => (
              <div key={idx} className="bg-white dark:bg-[#0a0f1e]/80 border border-slate-200 dark:border-slate-800/60 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center border border-slate-100 dark:border-slate-800 flex-shrink-0">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">{t.icon}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">{t.label}</span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${t.badgeClass}`}>{t.badge}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
