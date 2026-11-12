import { useNavigate } from 'react-router-dom';
import { useNavStore } from '../../app/store/navStore';
import Header from '../../components/common/Header';

export default function ExamTypesPage() {
  const navigate = useNavigate();
  const { selectedCategory, setSelectedExamType } = useNavStore();

  const handleSelect = (type: any) => {
    setSelectedExamType(type);
    navigate('/subjects');
  };

  if (!selectedCategory) {
    return (
      <div className="flex-1 p-10 text-slate-500 dark:text-slate-400 font-bold">
        No exam category selected.{' '}
        <button onClick={() => navigate('/dashboard')} className="text-blue-500 underline">Go to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#030814] transition-colors duration-300">
      <Header
        title="Select Exam Type"
        subtitle={`Select your career target under ${selectedCategory.label}`}
        onBack={() => navigate('/dashboard')}
        backLabel="Dashboard"
      />
      <div className="p-6 md:p-10 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {selectedCategory.types?.map((type: any) => (
            <button
              key={type.id}
              onClick={() => handleSelect(type)}
              className="group text-left bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-8 rounded-[2rem] hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer shadow-sm relative overflow-hidden"
            >
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {type.label}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-medium">
                {type.sub || 'Curated syllabus questions matching the latest patterns.'}
              </p>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                Explore subjects
                <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
