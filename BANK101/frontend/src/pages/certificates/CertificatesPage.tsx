import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../app/store/authStore';
import Header from '../../components/common/Header';

export default function CertificatesPage() {
  const { token } = useAuthStore();
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api('/certificates').then((r) => r.data)
      .then((d) => {
        setCerts(d.success && Array.isArray(d.certificates) ? d.certificates : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load certificates:', err);
        setLoading(false);
      });
  }, [token]);

  const handlePrint = (c: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>BANK-101 Certificate - ${c.certificate_id}</title>
          <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Inter:wght@400;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #fafafa; }
            .cert-border { border: 15px double #b59410; padding: 40px; width: 800px; height: 500px; text-align: center; background-color: #ffffff; box-shadow: 0 0 30px rgba(0,0,0,0.1); position: relative; }
            .cert-title { font-family: 'Cinzel', serif; font-size: 44px; color: #1e293b; margin-top: 20px; }
            .cert-subtitle { font-size: 14px; text-transform: uppercase; letter-spacing: 4px; color: #d97706; font-weight: 700; margin-top: 10px; }
            .cert-recipient { font-size: 26px; font-weight: bold; border-bottom: 2px solid #e2e8f0; display: inline-block; padding-bottom: 5px; margin: 30px 0 10px; min-width: 300px; }
            .cert-text { font-size: 16px; line-height: 1.6; color: #475569; margin: 20px 50px; }
            .cert-meta { display: flex; justify-content: space-between; margin: 50px 80px 0; font-size: 13px; color: #64748b; }
            .meta-line { border-top: 1px solid #cbd5e1; width: 150px; padding-top: 5px; margin: 0 auto 5px; }
            .cert-id { position: absolute; bottom: 20px; left: 0; right: 0; font-size: 10px; color: #94a3b8; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="cert-border">
            <div style="font-size: 32px; font-weight: 900; color: #1e3a8a;">B</div>
            <div class="cert-subtitle">Certificate of Academic Excellence</div>
            <div class="cert-title">BANK-101 PORTAL</div>
            <p class="cert-text">This is to certify that the candidate has successfully completed the timed assessment module</p>
            <div class="cert-recipient">${c.quiz_name}</div>
            <p class="cert-text">
              Achieving a score of <strong>${c.score} out of ${c.total}</strong> (${c.percentage}%) and demonstrating proficiency in the subject matter.
            </p>
            <div class="cert-meta">
              <div>
                <div class="meta-line"></div>
                <strong>Date Issued</strong><br/>
                ${new Date(c.issued_at).toLocaleDateString()}
              </div>
              <div>
                <div class="meta-line"></div>
                <strong>Verification Authority</strong><br/>
                BANK-101 Board
              </div>
            </div>
            <div class="cert-id">VERIFICATION ID: ${c.certificate_id}</div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#030814] transition-colors duration-300">
      <Header
        title="My Certificates"
        subtitle="Earn printable certificates by scoring 80% or higher on practice modules."
      />

      <div className="p-6 md:p-10 max-w-5xl mx-auto">
        {loading ? (
          <div className="text-slate-500 font-bold animate-pulse text-xs">Querying Certificate Records...</div>
        ) : certs.length === 0 ? (
          <div className="bg-white dark:bg-[#0a0f1e] border border-slate-200 dark:border-slate-800 p-10 rounded-2xl text-center text-xs shadow-sm">
            <span className="material-symbols-outlined text-4xl mb-3 block text-slate-400">card_membership</span>
            No certificates earned yet.
            <p className="font-normal text-slate-400 mt-2">Finish any quiz with a grade of 80% or above to unlock your certificate document.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certs.map((c) => (
              <div
                key={c.id}
                className="bg-white dark:bg-[#0a0f1e] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6 relative overflow-hidden"
              >
                {/* Gold border top decoration */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 to-amber-600" />
                
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="material-symbols-outlined text-amber-500 text-3xl font-fill">military_tech</span>
                    <span className="text-[9px] font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded uppercase">
                      Grade: {c.percentage}%
                    </span>
                  </div>

                  <h3 className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                    {c.quiz_name}
                  </h3>
                  
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-tight">
                    ID: {c.certificate_id}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                    Issued: {new Date(c.issued_at).toLocaleDateString()}
                  </span>
                  
                  <button
                    onClick={() => handlePrint(c)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">print</span>
                    Print/PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
