import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import { api } from '../../lib/api';

interface Batch {
  id: number;
  name: string;
  target_exam_title: string;
  target_exam_code: string;
  academic_year: string;
  student_count: number;
  assigned_tests_count: number;
}

interface Institution {
  id: number;
  name: string;
  slug: string;
  code: string;
  address: string;
  contact_email: string;
  subscription_tier: string;
  members_count: number;
  batches_count: number;
}

interface QuizOption {
  id: number;
  name: string;
  total_qs: number;
}

export default function InstitutionWorkspacePage() {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<QuizOption[]>([]);

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignBatchId, setAssignBatchId] = useState<number | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [assignDeadline, setAssignDeadline] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    async function loadData() {
      const res = await api<{ data: Institution[] }>('/institutions');
      if (res.ok && res.data.data) {
        setInstitutions(res.data.data);
        if (res.data.data.length > 0) {
          loadInstitutionDetails(res.data.data[0].slug);
        }
      }

      const qRes = await api<{ quizzes: QuizOption[] }>('/quizzes');
      if (qRes.ok && qRes.data.quizzes) {
        setQuizzes(qRes.data.quizzes);
        if (qRes.data.quizzes.length > 0) setSelectedQuizId(qRes.data.quizzes[0].id);
      }
    }
    loadData();
  }, []);

  const loadInstitutionDetails = async (slug: string) => {
    const res = await api<{ data: { institution: Institution; batches: Batch[]; userRole: string | null } }>(
      `/institutions/${slug}`
    );
    if (res.ok && res.data.data) {
      setSelectedInst(res.data.data.institution);
      setBatches(res.data.data.batches);
      setUserRole(res.data.data.userRole);
    }
  };

  const handleJoin = async (role: 'student' | 'faculty') => {
    if (!selectedInst) return;
    const res = await api('/institutions/join', {
      method: 'POST',
      body: { institutionId: selectedInst.id, role },
    });
    if (res.ok) {
      loadInstitutionDetails(selectedInst.slug);
    }
  };

  const handleEnroll = async (batchId: number) => {
    const res = await api(`/institutions/batches/${batchId}/enroll`, {
      method: 'POST',
      body: {},
    });
    if (res.ok && selectedInst) {
      loadInstitutionDetails(selectedInst.slug);
    }
  };

  const handleAssignTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignBatchId || !selectedQuizId) return;

    setAssigning(true);
    const res = await api(`/institutions/batches/${assignBatchId}/assign`, {
      method: 'POST',
      body: {
        quizId: selectedQuizId,
        deadline: assignDeadline || undefined,
        isMandatory: true,
      },
    });

    if (res.ok && selectedInst) {
      setShowAssignModal(false);
      loadInstitutionDetails(selectedInst.slug);
    }
    setAssigning(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        title="Institutional Workspaces & Coaching Centers"
        subtitle="Multi-tenant cohort management, curriculum assignment, and batch analytics"
        onBack={() => navigate('/dashboard')}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Academy Selector Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {institutions.map((inst) => (
            <div
              key={inst.id}
              onClick={() => loadInstitutionDetails(inst.slug)}
              className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                selectedInst?.id === inst.id
                  ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">🏫</span>
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    {inst.subscription_tier} tier
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base">{inst.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{inst.address}</p>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 mt-4 pt-3 border-t border-slate-100">
                <span>👥 {inst.members_count || 1} Members</span>
                <span>📚 {inst.batches_count || 2} Active Cohorts</span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Institution Detail Workspace */}
        {selectedInst && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{selectedInst.name}</h2>
                  {userRole && (
                    <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                      Your Role: {userRole.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Code: {selectedInst.code} | Contact: {selectedInst.contact_email}</p>
              </div>

              <div className="flex items-center gap-2">
                {!userRole ? (
                  <>
                    <button
                      onClick={() => handleJoin('student')}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
                    >
                      Join as Student
                    </button>
                    <button
                      onClick={() => handleJoin('faculty')}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                    >
                      Join as Faculty
                    </button>
                  </>
                ) : (
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    ✓ Verified Academy Member
                  </span>
                )}
              </div>
            </div>

            {/* Batches & Cohorts Table */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span>🎓</span> Active Cohort Batches
              </h3>

              <div className="space-y-3">
                {batches.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{b.name}</span>
                        <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded font-mono">
                          {b.academic_year}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Target Examination: <span className="font-semibold text-slate-700">{b.target_exam_title || 'General'}</span>
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
                        <span>👥 {b.student_count} Enrolled Students</span>
                        <span>•</span>
                        <span>📝 {b.assigned_tests_count} Assigned Assessments</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEnroll(b.id)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition"
                      >
                        Enroll in Batch
                      </button>

                      {userRole === 'faculty' && (
                        <button
                          onClick={() => {
                            setAssignBatchId(b.id);
                            setShowAssignModal(true);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition"
                        >
                          + Assign Mock Test
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal to Assign Mock Test to Batch */}
        {showAssignModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 text-base">📝 Assign Mock Test to Cohort</h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAssignTest} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Select Mock Examination</label>
                  <select
                    value={selectedQuizId || ''}
                    onChange={(e) => setSelectedQuizId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  >
                    {quizzes.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name} ({q.total_qs} Questions)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Submission Deadline</label>
                  <input
                    type="datetime-local"
                    value={assignDeadline}
                    onChange={(e) => setAssignDeadline(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assigning}
                    className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl"
                  >
                    {assigning ? 'Assigning...' : 'Assign to Batch'}
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

