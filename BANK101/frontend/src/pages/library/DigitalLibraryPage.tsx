import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import { api } from '../../lib/api';

interface Book {
  id: number;
  category: string;
  title: string;
  authors: string;
  publisher: string;
  publication_year: number;
  language: string;
  edition: string;
  source_url: string;
  download_url: string | null;
  license_code: string;
  license_name: string;
  can_redistribute: boolean;
  chapters_count: number;
}

export default function DigitalLibraryPage() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [bookDetailsLoading, setBookDetailsLoading] = useState(false);

  useEffect(() => {
    async function loadBooks() {
      setLoading(true);
      const res = await api<{ books: Book[] }>('/library/books');
      if (res.ok && res.data.books) {
        setBooks(res.data.books);
      }
      setLoading(false);
    }
    loadBooks();
  }, []);

  const openBookDetails = async (b: Book) => {
    setSelectedBook(b);
    setBookDetailsLoading(true);
    const res = await api<{ book: any; chapters: any[]; targetExams: any[] }>(`/library/books/${b.id}`);
    if (res.ok) {
      setSelectedBook({ ...b, ...res.data.book, chapters: res.data.chapters, targetExams: res.data.targetExams });
    }
    setBookDetailsLoading(false);
  };

  const categories = ['all', 'NCERT Textbooks', 'Tamil Nadu State Board', 'Open Educational Resources', 'Public Domain Texts'];

  const filteredBooks = books.filter((b) => {
    if (selectedCategory !== 'all' && b.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        b.title.toLowerCase().includes(q) ||
        b.authors.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#030814] transition-colors duration-300">
      <Header
        title="Digital Academic Library"
        subtitle="Open educational textbooks, Tamil Nadu SCERT & NCERT resources with verified license rights"
        onBack={() => navigate('/dashboard')}
        backLabel="Dashboard"
      />

      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
        {/* Search & Category Filter */}
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Category:</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'All Collections' : cat}
                </button>
              ))}
            </div>

            <button
              onClick={() => navigate('/pyq')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">history_edu</span>
              Previous-Year Papers (PYQ)
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 relative">
            <span className="material-symbols-outlined absolute left-3 top-6 text-slate-400 text-lg">search</span>
            <input
              type="text"
              placeholder="Search by title, author, subject, or publication..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Books Grid */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-bold text-sm">
            Loading Academic Library Resources...
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800">
            <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">menu_book</span>
            <div className="text-slate-600 dark:text-slate-400 font-bold text-sm">No books found matching this filter.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((b) => (
              <div
                key={b.id}
                className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 hover:border-blue-500 hover:shadow-xl transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                      {b.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      b.can_redistribute
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                    }`}>
                      {b.can_redistribute ? 'Open Download' : 'Official Portal Link'}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {b.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                    Authors: {b.authors}
                  </p>

                  <div className="space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex justify-between">
                      <span>Publisher:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[170px]">{b.publisher}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Language:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{b.language}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Chapters Index:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{b.chapters_count} Chapters</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => openBookDetails(b)}
                    className="text-xs font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    View Chapters
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>

                  {b.download_url ? (
                    <a
                      href={b.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">download</span>
                      Download
                    </a>
                  ) : (
                    <a
                      href={b.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">open_in_new</span>
                      Official Link
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Book Detail & Chapter Hierarchy Modal */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-blue-600 text-white uppercase tracking-wider">
                  {selectedBook.category}
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                  {selectedBook.title}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{selectedBook.authors}</p>
              </div>
              <button
                onClick={() => setSelectedBook(null)}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
              {/* License Badge Section */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300">License Terms:</span>
                  <span className="font-black text-blue-600 dark:text-blue-400">{selectedBook.license_name}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {selectedBook.can_redistribute
                    ? 'Free to read, host and download under open educational licensing.'
                    : 'Copyright protected. BANK-101 connects you directly to the official government / educational repository to protect academic copyright.'}
                </p>
              </div>

              {/* Chapters List */}
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-500 text-base">format_list_numbered</span>
                  Chapter & Syllabus Topic Index
                </h4>

                {bookDetailsLoading ? (
                  <div className="py-8 text-center text-slate-400 font-bold text-xs">Loading chapters...</div>
                ) : (selectedBook.chapters?.length || 0) === 0 ? (
                  <div className="text-xs text-slate-500 font-medium p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl">
                    No chapter breakdown indexed yet. Refer to full textbook via official link.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedBook.chapters.map((ch: any) => (
                      <div
                        key={ch.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">{ch.title}</div>
                          {ch.topic_name && (
                            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                              Mapped Topic: {ch.topic_name}
                            </div>
                          )}
                        </div>
                        {ch.page_start && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            pp. {ch.page_start}–{ch.page_end}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3">
              <a
                href={selectedBook.download_url || selectedBook.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">
                  {selectedBook.download_url ? 'download' : 'open_in_new'}
                </span>
                {selectedBook.download_url ? 'Download Textbook' : 'Open in Official Repository'}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

