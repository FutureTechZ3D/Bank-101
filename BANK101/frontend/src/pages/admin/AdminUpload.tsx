import { useState } from 'react';
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
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [datasetName, setDatasetName] = useState('Standard Question Bank Batch');
  const [content, setContent] = useState('');
  const [createQuiz, setCreateQuiz] = useState(true);
  const [quizTitle, setQuizTitle] = useState('National Practice Set');
  const [status, setStatus] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 md:p-10 text-white flex justify-center transition-colors duration-300">
      <div className="w-full max-w-4xl space-y-8">
        <header>
          <div className="flex items-center gap-2 mb-2 text-red-500 font-bold text-xs uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">cloud_upload</span>
            Dataset Ingestion Pipeline
          </div>
          <h1 className="font-black text-3xl text-white">Universal Question Ingestion Node</h1>
          <p className="text-slate-400 mt-2 text-xs leading-relaxed">
            Ingest question datasets via CSV or JSON with instant schema validation, numerical tolerance support, and atomic rollbacks.
          </p>
        </header>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          {/* Format and Templates */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Format:</span>
              <button
                onClick={() => { setFormat('json'); setValidationResult(null); }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  format === 'json' ? 'bg-red-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                JSON Payload
              </button>
              <button
                onClick={() => { setFormat('csv'); setValidationResult(null); }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  format === 'csv' ? 'bg-red-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                CSV / Spreadsheet
              </button>
            </div>

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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-medium text-xs focus:outline-none focus:border-red-500"
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
                  className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                />
                <input
                  type="text"
                  disabled={!createQuiz}
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="Test Name"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white font-medium text-xs focus:outline-none focus:border-red-500 disabled:opacity-40"
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
              rows={10}
              placeholder={format === 'json' ? 'Paste JSON array here...' : 'Paste CSV lines here...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-emerald-400 font-mono text-xs focus:outline-none focus:border-red-500 transition-colors resize-y leading-relaxed"
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
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-xs py-3.5 rounded-xl disabled:opacity-50 transition-all flex justify-center items-center gap-2 cursor-pointer uppercase tracking-wider shadow-md shadow-red-500/10"
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
