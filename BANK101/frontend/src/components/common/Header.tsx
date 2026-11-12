
interface HeaderProps {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  subtitle?: string;
}

export default function Header({ title, onBack, backLabel, subtitle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#030814]/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/60 px-10 py-5 transition-colors duration-300">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white mb-2.5 font-bold transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          {backLabel || 'Back'}
        </button>
      )}
      
      <div className="flex flex-col">
        <h1 className="font-black text-xl md:text-2xl text-slate-900 dark:text-white tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
