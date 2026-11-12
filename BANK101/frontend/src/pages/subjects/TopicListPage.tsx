import { useNavigate } from 'react-router-dom';
import { useNavStore } from '../../app/store/navStore';
import Header from '../../components/common/Header';

export default function TopicListPage() {
  const navigate = useNavigate();
  const { selectedSubject, setSelectedTopic } = useNavStore();

  const handleSelect = (topicName: string) => {
    setSelectedTopic({ name: topicName });
    navigate('/quizzes');
  };

  if (!selectedSubject) {
    return (
      <div className="flex-1 p-10 text-slate-500 dark:text-slate-400 font-bold">
        No subject selected.{' '}
        <button onClick={() => navigate('/subjects')} className="text-blue-500 underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#030814] transition-colors duration-300">
      <Header
        title={`${selectedSubject.name} Chapters`}
        subtitle="Select a topic to begin your preparation modules."
        onBack={() => navigate('/subjects')}
        backLabel="Subjects"
      />
      <div className="p-6 md:p-10 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {selectedSubject.topics?.map((top: any, idx: number) => (
            <button
              key={idx}
              onClick={() => handleSelect(typeof top === 'string' ? top : top.name)}
              className="group text-left bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all flex items-center justify-between cursor-pointer shadow-sm relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-950 flex items-center justify-center font-bold text-xs text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                  {idx + 1}
                </span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[180px]">{typeof top === 'string' ? top : top.name}</span>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-lg group-hover:translate-x-1 transition-transform group-hover:text-blue-500">chevron_right</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
