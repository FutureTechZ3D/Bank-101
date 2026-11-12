import { useState, useEffect } from 'react';
import { api, errorText } from '../../lib/api';

const SAMPLE_CSV = `question_text,question_type,opt_a,opt_b,opt_c,opt_d,opt_e,correct_option,explanation,topic_name
"What is 25% of 600?",single_mcq,"120","150","160","180","","B","25% of 600 = 600 / 4 = 150","Simplification Practice"
"Find the value of square root of (169 + 56)",numerical,"","","","","","15","169 + 56 = 225. Root 225 = 15","Simplification Practice"
"Assertion A: All right angles are 90 degrees. Reason R: Perpendicular lines meet at 90 degrees.",assertion_reason,"Both A and R true and R is correct explanation","Both A and R true but R not correct explanation","A true R false","A false R true","","A","Perpendicularity defines right angles.","Reasoning Practice"`;

const SAMPLE_JSON = `[
  {
    "question_text": "Simplify: 120 / 4 + 18 * 2",
    "question_type": "single_mcq",
    "difficulty": "medium",
    "topic_name": "Simplification Practice",
    "options": [
      { "label": "A", "text": "66", "is_correct": true },
      { "label": "B", "text": "72", "is_correct": false },
      { "label": "C", "text": "60", "is_correct": false },
      { "label": "D", "text": "58", "is_correct": false }
    ],
    "explanation": "120/4 = 30. 18*2 = 36. 30 + 36 = 66."
  },
  {
    "question_text": "What is the cube root of 1728?",
    "question_type": "numerical",
    "difficulty": "easy",
    "numerical_answer": 12,
    "numerical_tolerance": 0.001,
    "explanation": "12^3 = 1728"
  }
]`;

export default function AdminUpload() {
  const [pipelineStats, setPipelineStats] = useState<any>(null);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<any>(null);

  // Manual Ingestion states
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [datasetName, setDatasetName] = useState('Standard Question Bank Batch');
  const [content, setContent] = useState('');
  const [createQuiz, setCreateQuiz] = useState(true);
  const [quizTitle, setQuizTitle] = useState('National Practice Set');
  const [status, setStatus] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api('/admin/pipeline/stats');
      if (res.ok && res.data.success) {
        setPipelineStats(res.data.stats);
      }
    } catch {
      // Fallback silently if not available
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRunPipeline = async (scope: string = 'all') => {
    setPipelineLoading(true);
    setPipelineResult(null);
    try {
      const res = await api('/admin/pipeline/run', {
        method: 'POST',
        body: { scope },
      });
      if (!res.ok) throw new Error(errorText(res, 'Pipeline execution failed'));
      setPipelineResult(res.data.summary);
      await fetchStats();
    } catch (e: any) {
      alert(`Pipeline error: ${e.message}`);
    } finally {
      setPipelineLoading(false);
    }
  };

  const handlePreview = async () => {
    setStatus(null);
    setValidationResult(null);
    if (!content.trim()) {
      return setStatus({ type: 'error', msg: 'Please provide dataset content to preview.' });
    }

    setLoading(true);
    try {
      const res = await api('/admin/datasets/preview', {
        method: 'POST',
        body: { format, content },
      });
      if (!res.ok) throw new Error(errorText(res, 'Validation failed'));
      setValidationResult(res.data.validation);
      setStatus({
        type: res.data.validation.valid ? 'success' : 'warning',
        msg: res.data.validation.valid
          ? `✓ Validation Passed! All ${res.data.validation.totalRows} records are valid.`
          : `⚠️ Found ${res.data.validation.invalidRows} errors out of ${res.data.validation.totalRows} records.`,
      });
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setStatus(null);
    if (!content.trim()) {
      return setStatus({ type: 'error', msg: 'Please provide dataset content to import.' });
    }

    setLoading(true);
    try {
      const res = await api('/admin/datasets/import', {
        method: 'POST',
        body: {
          format,
          content,
          dataset_name: datasetName,
          create_quiz: createQuiz,
          quiz_title: quizTitle,
        },
      });
      if (!res.ok) throw new Error(errorText(res, 'Import commit failed'));
      setStatus({
        type: 'success',
        msg: `🎉 Success! Imported ${res.data.importedCount} questions in a single atomic transaction. ${
          res.data.quizId ? `New test created (ID #${res.data.quizId}).` : ''
        }`,
      });
      setValidationResult(null);
      setContent('');
      await fetchStats();
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 md:p-10 text-white flex justify-center transition-colors duration-300">
      <div className="w-full max-w-5xl space-y-8">
        <header>
          <div className="flex items-center gap-2 mb-2 text-blue-500 font-bold text-xs uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">hub</span>
            Unified Examination & Academic Ingestion Engine
          </div>
          <h1 className="font-black text-3xl text-white">Academic Knowledge Pipeline</h1>
          <p className="text-slate-400 mt-2 text-xs leading-relaxed">
            Automated open-source ingestion engine for NCERT, Tamil Nadu SCERT textbooks, UPSC/TNPSC/SSC past-year papers, and custom dataset ingestion.
          </p>
        </header>

        {/* ── SECTION 1: LIVE REPOSITORY METRICS ────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Questions in Bank</div>
            <div className="text-2xl font-black text-blue-400 mt-1">{pipelineStats?.total_questions ?? '...'}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">MCQs & Numerical Problems</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">CBT Mock Tests</div>
            <div className="text-2xl font-black text-amber-400 mt-1">{pipelineStats?.total_quizzes ?? '...'}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">National & State Mock Exams</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Digital Books</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{pipelineStats?.total_books ?? '...'}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{pipelineStats?.total_chapters ?? '...'} Indexed Chapters</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Official PYQs</div>
            <div className="text-2xl font-black text-purple-400 mt-1">{pipelineStats?.total_pyq_papers ?? '...'}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{pipelineStats?.total_pyq_questions ?? '...'} Verified PYQ Items</div>
          </div>
        </div>

        {/* ── SECTION 2: ONE-CLICK AUTOMATED OPEN-SOURCE HARVESTER ──────────── */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 border border-blue-900/40 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-400 text-xs font-black uppercase tracking-wider">
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                Automated Open-Source Academic Harvester
              </div>
              <h2 className="text-xl font-black text-white mt-1">Populate Platform with Verified Open Content</h2>
              <p className="text-slate-400 text-xs mt-1">
                Fetches, validates, and indexes NCERT textbooks (Classes 6-12), Tamil Nadu SCERT (Samacheer Kalvi), UPSC/TNPSC past papers, and curated bilingual question banks.
              </p>
            </div>

            <button
              onClick={() => handleRunPipeline('all')}
              disabled={pipelineLoading}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-6 py-3.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30 whitespace-nowrap disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">download_for_offline</span>
              {pipelineLoading ? 'Harvesting & Ingesting...' : 'Harvest & Ingest All Data'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80">
            <button
              onClick={() => handleRunPipeline('questions')}
              disabled={pipelineLoading}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-sm">quiz</span>
              Ingest Questions & Mocks Only
            </button>
            <button
              onClick={() => handleRunPipeline('books')}
              disabled={pipelineLoading}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-sm">menu_book</span>
              Ingest NCERT & SCERT Books Only
            </button>
            <button
              onClick={() => handleRunPipeline('pyqs')}
              disabled={pipelineLoading}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-sm">history_edu</span>
              Ingest Official PYQs Only
            </button>
          </div>

          {/* Pipeline execution summary banner */}
          {pipelineResult && (
            <div className="bg-emerald-950/30 border border-emerald-900/60 p-4 rounded-2xl space-y-2">
              <div className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Ingestion Completed Successfully in {(pipelineResult.duration_ms / 1000).toFixed(2)}s
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-300 font-mono">
                <div>+ {pipelineResult.total_questions_imported} Questions</div>
                <div>+ {pipelineResult.total_mock_tests_created} Mock Tests</div>
                <div>+ {pipelineResult.total_books_imported} Books ({pipelineResult.total_chapters_imported} Chs)</div>
                <div>+ {pipelineResult.total_pyq_papers_imported} PYQ Papers</div>
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 3: MANUAL CSV / JSON INGESTION NODE ───────────────────── */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-black text-white">Custom Dataset File Ingestion Node</h2>
              <p className="text-slate-400 text-xs mt-0.5">Upload custom question banks via CSV or JSON format with instant validation.</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Format:</span>
              <button
                onClick={() => { setFormat('json'); setValidationResult(null); }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  format === 'json' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                JSON Payload
              </button>
              <button
                onClick={() => { setFormat('csv'); setValidationResult(null); }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  format === 'csv' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                CSV / Spreadsheet
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                setContent(format === 'json' ? SAMPLE_JSON : SAMPLE_CSV);
                setValidationResult(null);
                setStatus(null);
              }}
              className="text-xs font-bold text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">data_object</span>
              Load Sample {format.toUpperCase()}
            </button>
          </div>

          {/* Dataset Name & Test creation toggle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Dataset Collection Name
              </label>
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-medium text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Publish as Playable Mock Test
              </label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="checkbox"
                  id="createQuiz"
                  checked={createQuiz}
                  onChange={(e) => setCreateQuiz(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
                <input
                  type="text"
                  disabled={!createQuiz}
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="Test Name"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white font-medium text-xs focus:outline-none focus:border-blue-500 disabled:opacity-40"
                />
              </div>
            </div>
          </div>

          {/* Payload textarea */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Raw {format.toUpperCase()} Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder={format === 'json' ? 'Paste JSON array here...' : 'Paste CSV lines here...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-emerald-400 font-mono text-xs focus:outline-none focus:border-blue-500 transition-colors resize-y leading-relaxed"
            />
          </div>

          {/* Status banner */}
          {status && (
            <div
              className={`p-4 rounded-xl font-bold text-xs ${
                status.type === 'error'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : status.type === 'warning'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {status.msg}
            </div>
          )}

          {/* Validation Errors Box */}
          {validationResult?.errors?.length > 0 && (
            <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-xl space-y-2">
              <div className="text-xs font-black text-red-400 uppercase">Validation Issues Detected:</div>
              <ul className="text-xs text-red-300 space-y-1 max-h-40 overflow-y-auto">
                {validationResult.errors.map((err: any, idx: number) => (
                  <li key={idx} className="font-mono text-[11px]">
                    • Line {err.row}: {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row gap-3 pt-2">
            <button
              onClick={handlePreview}
              disabled={loading || !content.trim()}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-3.5 rounded-xl disabled:opacity-50 transition-all flex justify-center items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">fact_check</span>
              {loading ? 'Validating...' : '1. Preview & Validate'}
            </button>

            <button
              onClick={handleImport}
              disabled={loading || !content.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs py-3.5 rounded-xl disabled:opacity-50 transition-all flex justify-center items-center gap-2 cursor-pointer uppercase tracking-wider shadow-md shadow-blue-500/10"
            >
              <span className="material-symbols-outlined text-base">publish</span>
              {loading ? 'Processing...' : '2. Execute Atomic Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
