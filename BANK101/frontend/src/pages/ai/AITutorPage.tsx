import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import { api } from '../../lib/api';

interface Citation {
  sourceType: 'textbook' | 'pyq' | 'syllabus';
  title: string;
  publisher?: string;
  chapterNumber?: number;
  chapterTitle?: string;
  pages?: string;
  examYear?: number;
  questionNumber?: number;
}

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  created_at?: string;
}

interface ExamOption {
  id: number;
  code: string;
  title: string;
  slug: string;
}

export default function AITutorPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number>(1);
  const [language, setLanguage] = useState<'en' | 'ta'>('en');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load available exams & past sessions on mount
  useEffect(() => {
    async function loadData() {
      const examRes = await api<{ exams: ExamOption[] }>('/catalog/exams');
      if (examRes.ok && examRes.data.exams) {
        setExams(examRes.data.exams);
        if (examRes.data.exams.length > 0) {
          setSelectedExamId(examRes.data.exams[0].id);
        }
      }

      const sessRes = await api<{ data: any[] }>('/ai/tutor/sessions');
      if (sessRes.ok && sessRes.data.data) {
        setPastSessions(sessRes.data.data);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadSession = async (sessionId: number) => {
    setLoading(true);
    const res = await api<{ data: { session: any; messages: Message[] } }>(`/ai/tutor/sessions/${sessionId}`);
    if (res.ok && res.data.data) {
      setCurrentSessionId(sessionId);
      if (res.data.data.session.exam_id) setSelectedExamId(res.data.data.session.exam_id);
      if (res.data.data.session.language) setLanguage(res.data.data.session.language);
      setMessages(res.data.data.messages);
    }
    setLoading(false);
  };

  const startNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || loading) return;

    setInputQuery('');
    const userMsg: Message = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const res = await api<{ data: { sessionId: number; role: 'assistant'; content: string; citations: Citation[] } }>(
      '/ai/tutor/ask',
      {
        method: 'POST',
        body: {
          examId: selectedExamId,
          sessionId: currentSessionId || undefined,
          message: query,
          language,
        },
      }
    );

    if (res.ok && res.data.data) {
      setCurrentSessionId(res.data.data.sessionId);
      const assistantMsg: Message = {
        role: 'assistant',
        content: res.data.data.content,
        citations: res.data.data.citations,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Refresh past sessions
      const sessRes = await api<{ data: any[] }>('/ai/tutor/sessions');
      if (sessRes.ok && sessRes.data.data) {
        setPastSessions(sessRes.data.data);
      }
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an issue retrieving the grounded academic curriculum. Please try again.',
        },
      ]);
    }
    setLoading(false);
  };

  const quickPrompts = [
    {
      en: 'What are the main concepts in History and Indian Polity for this exam?',
      ta: 'தமிழ்நாடு வரலாறு மற்றும் தொல்லியல் சான்றுகள் பற்றி சுருக்கமாக கூறவும்.',
    },
    {
      en: 'Explain the fundamental structure of the Indian Constitution with textbook references.',
      ta: 'இந்திய அரசியலமைப்பின் முகப்புரை மற்றும் முக்கிய விதிகளின் சுருக்கம் தருக.',
    },
    {
      en: 'How to prepare Quantitative Aptitude and Simplification effectively?',
      ta: 'எண் கணிதம் மற்றும் சமன்பாடுகள் தீர்வுக்கு முக்கிய வழிமுறைகள் என்ன?',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        title="Grounded AI Tutor"
        subtitle="Syllabus-anchored learning with verified textbook citations"
        onBack={() => navigate('/dashboard')}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
        {/* Top Header & Controller Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              ← Back
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <h1 className="text-lg font-bold text-slate-900">Grounded AI Academic Tutor</h1>
                <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-medium">
                  Verified Citations
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Anchored strictly to NCERT, TN State Board textbooks, and official PYQs — zero hallucinations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Exam Selector */}
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(Number(e.target.value))}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.code} — {ex.title}
                </option>
              ))}
            </select>

            {/* Language Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  language === 'en' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🇬🇧 English
              </button>
              <button
                onClick={() => setLanguage('ta')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  language === 'ta' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🇮🇳 தமிழ்
              </button>
            </div>

            <button
              onClick={startNewSession}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              + New Chat
            </button>
          </div>
        </div>

        {/* Workspace Layout: Left Past Sessions, Right Chat Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1">
          {/* Past Sessions Sidebar */}
          <div className="hidden lg:flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Saved Conversations</h3>
            <div className="space-y-2 overflow-y-auto max-h-[600px] flex-1">
              {pastSessions.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No past sessions yet.</p>
              ) : (
                pastSessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s.id)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition ${
                      currentSessionId === s.id
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900 font-semibold'
                        : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>{s.exam_code || 'General'}</span>
                      <span>{s.language === 'ta' ? 'தமிழ்' : 'EN'}</span>
                    </div>
                    <p className="line-clamp-2">{s.initial_query || 'New study consultation'}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Stream & Interaction Area */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[650px]">
            {/* Messages Viewport */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-sm">
                    🎓
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mb-1">
                    {language === 'ta' ? 'வணக்கம்! நான் உங்கள் தேர்வு வழிகாட்டி.' : 'Syllabus-Grounded AI Tutor'}
                  </h2>
                  <p className="text-xs text-slate-500 max-w-md mb-6">
                    {language === 'ta'
                      ? 'உங்கள் பாடத்திட்டம், தமிழ்நாடு அரசு பாடப்புத்தகங்கள் மற்றும் முந்தைய ஆண்டு வினாத்தாள்களை அடிப்படையாகக் கொண்டு விளக்கம் தருகிறேன்.'
                      : 'Ask any syllabus question. Every explanation is cross-referenced with official textbooks and previous-year questions.'}
                  </p>

                  <div className="w-full max-w-lg space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Suggested Academic Questions
                    </p>
                    {quickPrompts.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(p[language])}
                        className="w-full text-left p-2.5 text-xs text-slate-700 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 rounded-lg border border-slate-200 transition"
                      >
                        💡 {p[language]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-sm whitespace-pre-wrap leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-none shadow-sm'
                          : 'bg-slate-50 border border-slate-200 text-slate-900 rounded-bl-none'
                      }`}
                    >
                      {m.content}
                    </div>

                    {/* Academic Citations Cards */}
                    {m.role === 'assistant' && m.citations && m.citations.length > 0 && (
                      <div className="max-w-[85%] mt-2 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          📚 Academic Citations & Provenance
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {m.citations.map((c, cIdx) => (
                            <div
                              key={cIdx}
                              className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-950"
                            >
                              <div className="flex items-center gap-1.5 font-semibold text-emerald-900 mb-0.5">
                                <span>{c.sourceType === 'textbook' ? '📖 Textbook' : '📝 Official PYQ'}</span>
                                {c.publisher && <span className="text-[10px] text-emerald-600">({c.publisher})</span>}
                              </div>
                              <p className="text-[11px] font-medium">{c.title}</p>
                              {c.chapterTitle && (
                                <p className="text-[10px] text-emerald-700 mt-0.5">
                                  Chapter {c.chapterNumber}: {c.chapterTitle} {c.pages ? `(pp. ${c.pages})` : ''}
                                </p>
                              )}
                              {c.examYear && (
                                <p className="text-[10px] text-emerald-700 mt-0.5">
                                  Year: {c.examYear} | Question #{c.questionNumber}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 p-3 rounded-lg w-fit">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-indigo-600 border-t-transparent" />
                  <span>Cross-referencing textbook chapters and past questions...</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={
                  language === 'ta'
                    ? 'பாடத்திட்டம், முந்தைய ஆண்டு வினாக்கள் பற்றி கேட்கவும்...'
                    : 'Ask about syllabus concepts, formulas, or official question framing...'
                }
                className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !inputQuery.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition shadow-sm flex items-center gap-1"
              >
                Send ↵
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
