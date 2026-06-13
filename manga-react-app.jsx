import React, { useState, useEffect, useContext, createContext } from 'react';

// Global Context for bookmarks and reading history
const AppContext = createContext();

const AppProvider = ({ children }) => {
  const [bookmarks, setBookmarks] = useState(() => {
    const saved = localStorage.getItem('mangaBookmarks');
    return saved ? JSON.parse(saved) : {};
  });

  const [readingHistory, setReadingHistory] = useState(() => {
    const saved = localStorage.getItem('readingHistory');
    return saved ? JSON.parse(saved) : {};
  });

  const toggleBookmark = (mangaId, title) => {
    setBookmarks(prev => {
      const updated = { ...prev };
      if (updated[mangaId]) {
        delete updated[mangaId];
      } else {
        updated[mangaId] = title;
      }
      localStorage.setItem('mangaBookmarks', JSON.stringify(updated));
      return updated;
    });
  };

  const addToHistory = (mangaId, title, chapterId, progress) => {
    setReadingHistory(prev => {
      const updated = {
        ...prev,
        [mangaId]: {
          title,
          chapterId,
          progress,
          timestamp: new Date().toISOString()
        }
      };
      localStorage.setItem('readingHistory', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AppContext.Provider value={{ bookmarks, readingHistory, toggleBookmark, addToHistory }}>
      {children}
    </AppContext.Provider>
  );
};

// Header Component
const Header = ({ currentPage, onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      onNavigate('search', { query });
    }
  };

  return (
    <header style={styles.header}>
      <div style={styles.headerContent}>
        <div style={styles.logo} onClick={() => onNavigate('home')}>
          📚 MangaPlus
        </div>
        
        <div style={styles.searchBar}>
          <input
            type="text"
            placeholder="Search manga..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
            style={styles.searchInput}
          />
          <button 
            onClick={() => handleSearch(searchQuery)}
            style={styles.searchBtn}
          >
            🔍
          </button>
        </div>

        <nav style={styles.nav}>
          <button 
            style={{...styles.navBtn, ...(currentPage === 'home' && styles.navBtnActive)}}
            onClick={() => onNavigate('home')}
          >
            Home
          </button>
          <button 
            style={{...styles.navBtn, ...(currentPage === 'latest' && styles.navBtnActive)}}
            onClick={() => onNavigate('latest')}
          >
            Latest
          </button>
          <button 
            style={{...styles.navBtn, ...(currentPage === 'bookmarks' && styles.navBtnActive)}}
            onClick={() => onNavigate('bookmarks')}
          >
            Bookmarks
          </button>
          <button 
            style={{...styles.navBtn, ...(currentPage === 'history' && styles.navBtnActive)}}
            onClick={() => onNavigate('history')}
          >
            History
          </button>
        </nav>
      </div>
    </header>
  );
};

// Manga Grid Component
const MangaGrid = ({ mangaList, loading, onMangaClick }) => {
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading manga...</p>
      </div>
    );
  }

  if (mangaList.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>No manga found</p>
      </div>
    );
  }

  return (
    <div style={styles.grid}>
      {mangaList.map(manga => (
        <MangaCard 
          key={manga.id} 
          manga={manga} 
          onClick={() => onMangaClick(manga)}
        />
      ))}
    </div>
  );
};

// Manga Card Component
const MangaCard = ({ manga, onMangaClick }) => {
  const { bookmarks, toggleBookmark } = useContext(AppContext);
  const isBookmarked = bookmarks[manga.id];

  return (
    <div 
      style={styles.mangaCard}
      onClick={onMangaClick}
    >
      <div style={styles.mangaCover}>
        {manga.imageUrl ? (
          <img src={manga.imageUrl} alt={manga.title} style={styles.coverImg} />
        ) : (
          <div style={styles.coverPlaceholder}>
            {manga.title.charAt(0)}
          </div>
        )}
      </div>
      <div style={styles.mangaInfo}>
        <h3 style={styles.mangaTitle}>{manga.title}</h3>
        <p style={styles.mangaChapters}>New Chapters</p>
        <div style={styles.mangaFooter}>
          <span style={styles.mangaRating}>★ 4.5</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(manga.id, manga.title);
            }}
            style={styles.bookmarkBtn}
          >
            {isBookmarked ? '♥' : '♡'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Manga Details & Reader Component
const MangaReader = ({ manga, onClose, onBack }) => {
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const { addToHistory } = useContext(AppContext);

  useEffect(() => {
    fetchChapters();
  }, [manga.id]);

  const fetchChapters = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.mangaplus.shueisha.co.jp/v2/manga/${manga.id}`
      );
      const data = await response.json();
      
      if (data.success) {
        const chapterList = data.response.manga.chaptersDescending || [];
        setChapters(chapterList);
        if (chapterList.length > 0) {
          loadChapter(chapterList[0].chapterId);
        }
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChapter = async (chapterId) => {
    try {
      setLoading(true);
      setCurrentPageIndex(0);
      const response = await fetch(
        `https://api.mangaplus.shueisha.co.jp/v2/viewer/${chapterId}`
      );
      const data = await response.json();
      
      if (data.success) {
        const pageList = data.response.pages || [];
        setPages(pageList);
        setSelectedChapter(chapterId);
        addToHistory(manga.id, manga.title, chapterId, 0);
      }
    } catch (error) {
      console.error('Error loading chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  const prevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  if (!pages.length) {
    return (
      <div style={styles.readerContainer}>
        <div style={styles.readerHeader}>
          <button onClick={onBack} style={styles.backBtn}>← Back</button>
          <h2 style={styles.readerTitle}>{manga.title}</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <div style={styles.readerContent}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Loading chapters...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentPage = pages[currentPageIndex];

  return (
    <div style={styles.readerContainer}>
      <div style={styles.readerHeader}>
        <button onClick={onBack} style={styles.backBtn}>← Back</button>
        <h2 style={styles.readerTitle}>{manga.title}</h2>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
      </div>
      
      <div style={styles.readerContent}>
        {currentPage?.imageUrl && (
          <img 
            src={currentPage.imageUrl} 
            alt={`Page ${currentPageIndex + 1}`}
            style={styles.readerImage}
          />
        )}
      </div>

      <div style={styles.readerControls}>
        <button 
          onClick={prevPage}
          disabled={currentPageIndex === 0}
          style={{...styles.controlBtn, ...(currentPageIndex === 0 && styles.controlBtnDisabled)}}
        >
          ← Previous
        </button>
        <span style={styles.pageCounter}>
          Page {currentPageIndex + 1} / {pages.length}
        </span>
        <button 
          onClick={nextPage}
          disabled={currentPageIndex === pages.length - 1}
          style={{...styles.controlBtn, ...(currentPageIndex === pages.length - 1 && styles.controlBtnDisabled)}}
        >
          Next →
        </button>
      </div>

      {chapters.length > 0 && (
        <div style={styles.chapterSelector}>
          <select 
            value={selectedChapter || ''} 
            onChange={(e) => loadChapter(e.target.value)}
            style={styles.selectDropdown}
          >
            <option value="">Select Chapter</option>
            {chapters.map(ch => (
              <option key={ch.chapterId} value={ch.chapterId}>
                {ch.name || `Chapter ${ch.chapterId}`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

// Home Page Component
const HomePage = ({ onMangaClick, onNavigate }) => {
  const [mangaList, setMangaList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchManga();
  }, []);

  const fetchManga = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        'https://api.mangaplus.shueisha.co.jp/v2/web/web_home_v3'
      );
      const data = await response.json();

      if (data.success) {
        const mangaArray = [];
        const sections = data.response.sections || [];
        
        sections.forEach(section => {
          section.items?.forEach(item => {
            if (item.mangaTitle) {
              mangaArray.push({
                id: item.mangaTitle.mangaId,
                title: item.mangaTitle.name,
                description: item.mangaTitle.description || '',
                imageUrl: item.mangaTitle.portraitImageUrl || ''
              });
            }
          });
        });

        setMangaList(mangaArray.slice(0, 30));
      }
    } catch (error) {
      console.error('Error fetching manga:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={styles.sectionTitle}>Featured Manga</div>
      <MangaGrid 
        mangaList={mangaList} 
        loading={loading}
        onMangaClick={onMangaClick}
      />
    </div>
  );
};

// Bookmarks Page Component
const BookmarksPage = ({ onMangaClick }) => {
  const { bookmarks } = useContext(AppContext);
  const bookmarkList = Object.entries(bookmarks).map(([id, title]) => ({
    id: parseInt(id),
    title,
    imageUrl: ''
  }));

  if (bookmarkList.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>No bookmarks yet. Start bookmarking your favorite manga!</p>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.sectionTitle}>My Bookmarks</div>
      <MangaGrid 
        mangaList={bookmarkList}
        loading={false}
        onMangaClick={onMangaClick}
      />
    </div>
  );
};

// Reading History Page Component
const HistoryPage = ({ onMangaClick }) => {
  const { readingHistory } = useContext(AppContext);
  const historyList = Object.entries(readingHistory)
    .map(([id, data]) => ({
      id: parseInt(id),
      title: data.title,
      imageUrl: '',
      lastRead: new Date(data.timestamp)
    }))
    .sort((a, b) => b.lastRead - a.lastRead);

  if (historyList.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>No reading history. Start reading manga!</p>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.sectionTitle}>Reading History</div>
      <MangaGrid 
        mangaList={historyList}
        loading={false}
        onMangaClick={onMangaClick}
      />
    </div>
  );
};

// Main App Component
const MangaApp = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedManga, setSelectedManga] = useState(null);
  const [searchResults, setSearchResults] = useState([]);

  const handleNavigate = (page, params = {}) => {
    setCurrentPage(page);
    if (page === 'search' && params.query) {
      searchManga(params.query);
    }
  };

  const searchManga = async (query) => {
    try {
      const response = await fetch(
        `https://api.mangaplus.shueisha.co.jp/v2/web/web_home_v3`
      );
      const data = await response.json();

      if (data.success) {
        const mangaArray = [];
        const sections = data.response.sections || [];
        
        sections.forEach(section => {
          section.items?.forEach(item => {
            if (item.mangaTitle) {
              mangaArray.push({
                id: item.mangaTitle.mangaId,
                title: item.mangaTitle.name,
                description: item.mangaTitle.description || '',
                imageUrl: item.mangaTitle.portraitImageUrl || ''
              });
            }
          });
        });

        const filtered = mangaArray.filter(m =>
          m.title.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Error searching manga:', error);
    }
  };

  const handleMangaClick = (manga) => {
    setSelectedManga(manga);
  };

  return (
    <div style={styles.app}>
      <Header currentPage={currentPage} onNavigate={handleNavigate} />
      
      <div style={styles.container}>
        {selectedManga ? (
          <MangaReader
            manga={selectedManga}
            onClose={() => setSelectedManga(null)}
            onBack={() => setSelectedManga(null)}
          />
        ) : (
          <>
            {currentPage === 'home' && (
              <HomePage onMangaClick={handleMangaClick} onNavigate={handleNavigate} />
            )}
            {currentPage === 'latest' && (
              <HomePage onMangaClick={handleMangaClick} onNavigate={handleNavigate} />
            )}
            {currentPage === 'bookmarks' && (
              <BookmarksPage onMangaClick={handleMangaClick} />
            )}
            {currentPage === 'history' && (
              <HistoryPage onMangaClick={handleMangaClick} />
            )}
            {currentPage === 'search' && (
              <>
                <div style={styles.sectionTitle}>Search Results</div>
                <MangaGrid 
                  mangaList={searchResults}
                  loading={false}
                  onMangaClick={handleMangaClick}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Styles Object
const styles = {
  app: {
    backgroundColor: '#0f1419',
    color: '#e4e6eb',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    backgroundColor: '#1a1f26',
    borderBottom: '1px solid #3a3f47',
    padding: '15px 20px',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px'
  },
  logo: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ff6b6b',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  searchBar: {
    flex: 1,
    maxWidth: '400px',
    display: 'flex',
    gap: '8px'
  },
  searchInput: {
    flex: 1,
    padding: '10px 15px',
    backgroundColor: '#2a2f37',
    border: '1px solid #3a3f47',
    borderRadius: '6px',
    color: '#e4e6eb',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s'
  },
  searchBtn: {
    padding: '10px 15px',
    backgroundColor: '#2a2f37',
    border: '1px solid #3a3f47',
    borderRadius: '6px',
    color: '#e4e6eb',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  nav: {
    display: 'flex',
    gap: '20px'
  },
  navBtn: {
    background: 'none',
    border: 'none',
    color: '#e4e6eb',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '5px 10px',
    borderRadius: '4px',
    transition: 'all 0.2s'
  },
  navBtnActive: {
    color: '#ff6b6b',
    backgroundColor: '#2a2f37'
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '30px 20px'
  },
  sectionTitle: {
    fontSize: '22px',
    marginBottom: '20px',
    color: '#fff',
    fontWeight: '600'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '20px',
    marginBottom: '40px'
  },
  mangaCard: {
    backgroundColor: '#1a1f26',
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.3s',
    border: '1px solid #3a3f47'
  },
  mangaCover: {
    width: '100%',
    aspectRatio: '3/4',
    backgroundColor: 'linear-gradient(135deg, #2a2f37 0%, #3a3f47 100%)',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  coverImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
    color: '#8a8d96'
  },
  mangaInfo: {
    padding: '12px'
  },
  mangaTitle: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#fff',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  mangaChapters: {
    fontSize: '12px',
    color: '#8a8d96',
    marginBottom: '8px'
  },
  mangaFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  mangaRating: {
    fontSize: '12px',
    color: '#ffd700'
  },
  bookmarkBtn: {
    background: 'none',
    border: 'none',
    color: '#ff6b6b',
    fontSize: '18px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#8a8d96'
  },
  spinner: {
    display: 'inline-block',
    width: '40px',
    height: '40px',
    border: '3px solid #3a3f47',
    borderTopColor: '#ff6b6b',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#8a8d96'
  },
  readerContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column'
  },
  readerHeader: {
    backgroundColor: '#1a1f26',
    padding: '15px 20px',
    borderBottom: '1px solid #3a3f47',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#e4e6eb',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '8px 12px'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#e4e6eb',
    cursor: 'pointer',
    fontSize: '24px',
    padding: '0'
  },
  readerTitle: {
    fontSize: '16px',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center'
  },
  readerContent: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  readerImage: {
    maxWidth: '90%',
    maxHeight: '90%',
    margin: 'auto',
    display: 'block'
  },
  readerControls: {
    backgroundColor: '#1a1f26',
    padding: '15px 20px',
    borderTop: '1px solid #3a3f47',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px'
  },
  controlBtn: {
    backgroundColor: '#2a2f37',
    border: '1px solid #3a3f47',
    color: '#e4e6eb',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  controlBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  pageCounter: {
    textAlign: 'center',
    flex: 1,
    fontSize: '14px',
    color: '#8a8d96'
  },
  chapterSelector: {
    backgroundColor: '#1a1f26',
    padding: '15px 20px',
    borderTop: '1px solid #3a3f47'
  },
  selectDropdown: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#2a2f37',
    border: '1px solid #3a3f47',
    borderRadius: '6px',
    color: '#e4e6eb',
    cursor: 'pointer'
  }
};

// Styled Components
const StyledApp = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        background: #0f1419;
        color: #e4e6eb;
      }
      
      input:focus {
        outline: none;
        border-color: #ff6b6b !important;
        background-color: #343a42 !important;
      }
      
      button:hover:not(:disabled) {
        background-color: #3a3f47 !important;
        border-color: #ff6b6b !important;
        color: #ff6b6b !important;
      }
      
      select {
        outline: none;
      }
      
      select:focus {
        border-color: #ff6b6b !important;
      }
      
      ::-webkit-scrollbar {
        width: 8px;
      }
      
      ::-webkit-scrollbar-track {
        background: #1a1f26;
      }
      
      ::-webkit-scrollbar-thumb {
        background: #3a3f47;
        border-radius: 4px;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: #4a4f57;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <AppProvider>
      <MangaApp />
    </AppProvider>
  );
};

export default StyledApp;