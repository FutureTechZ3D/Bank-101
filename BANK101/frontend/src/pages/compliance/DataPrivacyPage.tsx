import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import { api } from '../../lib/api';

interface ConsentRecord {
  id: number;
  purpose_code: string;
  consent_given: boolean;
  consent_timestamp: string;
  withdrawn_at: string | null;
}

export default function DataPrivacyPage() {
  const navigate = useNavigate();
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportData, setExportData] = useState<any | null>(null);
  const [showEraseModal, setShowEraseModal] = useState(false);
  const [eraseReason, setEraseReason] = useState('');
  const [erased, setErased] = useState(false);

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
    const res = await api<{ data: ConsentRecord[] }>('/compliance/consent');
    if (res.ok && res.data.data) {
      setConsents(res.data.data);
    }
  };

  const handleToggleConsent = async (purposeCode: string, currentVal: boolean) => {
    const res = await api('/compliance/consent', {
      method: 'POST',
      body: { purposeCode, consentGiven: !currentVal },
    });
    if (res.ok) {
      loadConsents();
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    const res = await api<{ data: any }>('/compliance/export');
    if (res.ok && res.data.data) {
      setExportData(res.data.data);

      // Trigger instant JSON file download
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `BANK101_Personal_Data_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
    setExporting(false);
  };

  const handleDataErasure = async () => {
    const res = await api('/compliance/forget-me', {
      method: 'POST',
      body: { reason: eraseReason },
    });
    if (res.ok) {
      setErased(true);
      setShowEraseModal(false);
    }
  };

  const isConsentGiven = (code: string) => {
    const rec = consents.find((c) => c.purpose_code === code);
    return rec ? rec.consent_given : true; // Default opted-in
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        title="Privacy & Indian DPDP Act Compliance Center"
        subtitle="Digital Personal Data Protection Act, 2023: Transparency, Consent Management & Data Subject Rights"
        onBack={() => navigate('/dashboard')}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Compliance Banner */}
        <div className="bg-emerald-950 text-white p-6 rounded-2xl shadow-sm border border-emerald-800 flex items-start gap-4">
          <span className="text-3xl">🛡️</span>
          <div>
            <h2 className="text-base font-bold">Indian DPDP Act (2023) Certified Platform</h2>
            <p className="text-xs text-emerald-200 mt-1 leading-relaxed">
              BANK-101 processes candidate data strictly in compliance with Section 6 (Consent Notice), Section 11 (Right
              to Access & Portability), and Section 12 (Right to Correction & Erasure). Educational data is never sold to
              third-party advertisers.
            </p>
          </div>
        </div>

        {/* ── 1. PURPOSE-SPECIFIC CONSENT MANAGEMENT ──────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>🔐</span> Purpose-Based Processing Consents
              </h3>
              <p className="text-xs text-slate-500">
                You retain full statutory authority to grant or revoke specific processing purposes at any time.
              </p>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Real-time Audit Log
            </span>
          </div>

          <div className="space-y-3">
            {[
              {
                code: 'EXAM_EVALUATION',
                title: 'Standard CBT Evaluation & Scoring',
                desc: 'Processing attempt answers, calculating scorecards, and ranking percentile generation.',
              },
              {
                code: 'AI_PERSONALIZATION',
                title: 'Grounded AI Tutor & Syllabus Pacing',
                desc: 'Analyzing topic weakness diagnostic patterns to generate adaptive study plans and predicted score ranges.',
              },
              {
                code: 'COMMUNICATION',
                title: 'Examination Commission Alerts & Notifications',
                desc: 'Dispatching notification alerts regarding revised commission syllabuses, answer key releases, and gazettes.',
              },
            ].map((purpose) => {
              const checked = isConsentGiven(purpose.code);
              return (
                <div
                  key={purpose.code}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{purpose.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{purpose.desc}</p>
                  </div>
                  <button
                    onClick={() => handleToggleConsent(purpose.code, checked)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
                      checked
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-300 text-slate-700 hover:bg-slate-400'
                    }`}
                  >
                    {checked ? '✓ Consented' : '✕ Revoked'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 2. RIGHT TO DATA PORTABILITY ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>📦</span> Right to Data Portability (Section 11)
              </h3>
              <p className="text-xs text-slate-500">
                Download a machine-readable JSON copy of your entire academic record, attempts, AI conversations, and consents.
              </p>
            </div>
            <button
              onClick={handleExportData}
              disabled={exporting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <span>{exporting ? 'Exporting Archive...' : '⬇ Export My Personal Data'}</span>
            </button>
          </div>

          {exportData && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-mono">
              <p className="font-bold text-emerald-700 mb-1">✓ Personal Data Archive Generated & Downloaded!</p>
              <p className="text-[11px] text-slate-500">
                Includes: {exportData.quizAttempts?.length || 0} CBT attempts,{' '}
                {exportData.aiTutorSessions?.length || 0} AI tutor consultations, and active consent records.
              </p>
            </div>
          )}
        </div>

        {/* ── 3. RIGHT TO ERASURE / RIGHT TO BE FORGOTTEN ─────────────────── */}
        <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-red-950 flex items-center gap-2">
                <span>⚠️</span> Right to Erasure / Right to be Forgotten (Section 12)
              </h3>
              <p className="text-xs text-slate-500">
                Permanently anonymize your identity, personal identifiers, and telephone records from BANK-101.
              </p>
            </div>
            <button
              onClick={() => setShowEraseModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              Request Data Erasure
            </button>
          </div>

          {erased && (
            <div className="p-4 bg-red-50 text-red-900 rounded-xl border border-red-200 text-xs">
              ✓ Your erasure request has been processed. Identifiable contact fields have been wiped and anonymized.
            </div>
          )}
        </div>

        {/* Erasure Modal */}
        {showEraseModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
              <h3 className="font-bold text-slate-900 text-base mb-2">Confirm Right to Erasure</h3>
              <p className="text-xs text-slate-500 mb-4">
                This action is irreversible under Indian DPDP law. Your username and phone number will be scrubbed, and you
                will need to register again to access the platform.
              </p>

              <textarea
                value={eraseReason}
                onChange={(e) => setEraseReason(e.target.value)}
                placeholder="Reason for erasure (optional)..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs mb-4"
                rows={3}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setShowEraseModal(false)}
                  className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDataErasure}
                  className="w-1/2 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-sm"
                >
                  Confirm Erasure
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

