import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import articleService from '../services/articleService';
import Sidebar from './stitch/Sidebar';
import Header from './stitch/Header';

const CATEGORIES = ['Getting Started', 'Account & Billing', 'Troubleshooting', 'Security', 'General FAQ'];

const HelpCenter = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Reading State
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [userRole, setUserRole] = useState('Customer');

  useEffect(() => {
    const role = sessionStorage.getItem('userRole') || 'Customer';
    setUserRole(role);
    fetchPublishedArticles();
  }, []);

  const fetchPublishedArticles = async () => {
    setLoading(true);
    try {
      // Use the real MongoDB organizationId saved on login — works for all roles
      const orgId = sessionStorage.getItem('organizationId');
      if (!orgId) {
        // Admin has no single org; show nothing or handle separately
        setArticles([]);
        setLoading(false);
        return;
      }
      const data = await articleService.getPublicArticles(orgId);
      const safeArray = Array.isArray(data) ? data : [];
      // Server already filters to Published; just set directly
      setArticles(safeArray);
    } catch (error) {
      console.error("Failed to fetch articles", error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  // --- FUZZY SEARCH LOGIC ---
  const getFilteredArticles = () => {
    let results = categoryFilter === 'All' 
      ? articles 
      : articles.filter(a => a.category === categoryFilter);

    if (searchQuery.trim()) {
      const fuse = new Fuse(results, {
        keys: [
          { name: 'title', weight: 0.8 },
          { name: 'content', weight: 0.2 }
        ],
        threshold: 0.4,
        ignoreLocation: true
      });
      results = fuse.search(searchQuery).map(result => result.item);
    }
    return results;
  };

  const filteredArticles = getFilteredArticles();

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen flex">
      <Sidebar 
        role={userRole} 
        userName={`${userRole} Profile`} 
        onLogout={() => { sessionStorage.clear(); navigate('/login'); }} 
        activeLink="Help Center" 
      />

      <main className="ml-64 flex-1 flex flex-col bg-surface-container-lowest min-h-screen">
        <Header role={userRole} searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        <div className="p-gutter flex-1 space-y-lg overflow-y-auto custom-scrollbar">
          
          {/* Header Area */}
          <div className="bg-primary-container text-on-primary-container p-xl rounded-2xl flex flex-col items-center text-center shadow-sm">
            <span className="material-symbols-outlined text-[48px] mb-sm">support_agent</span>
            <h1 className="font-headline-lg text-headline-lg font-bold mb-xs">How can we help you today?</h1>
            <p className="text-on-primary-container/80 max-w-2xl">Search our knowledge base for quick answers, troubleshooting guides, and tutorials.</p>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-sm justify-center">
            {['All', ...CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-md py-sm text-label-md rounded-full transition-all cursor-pointer border ${
                  categoryFilter === cat 
                    ? 'bg-primary text-on-primary border-primary shadow-sm' 
                    : 'bg-surface-container border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Article Grid */}
          {loading ? (
            <div className="text-center p-xl text-on-surface-variant animate-pulse">Loading help articles...</div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center p-xl text-on-surface-variant bg-surface-container rounded-xl border border-outline-variant">
              <span className="material-symbols-outlined text-[40px] mb-sm opacity-50">search_off</span>
              <p>We couldn't find any articles matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
              {filteredArticles.map(article => (
                <div 
                  key={article._id} 
                  onClick={() => setSelectedArticle(article)}
                  className="bg-surface-container-low border border-outline-variant rounded-xl p-md flex flex-col gap-sm cursor-pointer hover:bg-surface-container-high hover:-translate-y-1 transition-all shadow-sm group"
                >
                  <div className="flex justify-between items-start">
                    <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded-md text-label-sm font-medium">
                      {article.category}
                    </span>
                    <span className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                  </div>
                  <h3 className="font-title-lg text-on-surface font-bold line-clamp-2">{article.title}</h3>
                  
                  {/* We strip HTML tags just to show a plain text preview on the card */}
                  <p className="text-body-md text-on-surface-variant line-clamp-3">
                    {article.content.replace(/<[^>]*>?/gm, '')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Reading Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-md backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-outline-variant flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-lg border-b border-outline-variant flex justify-between items-start bg-surface-container-low sticky top-0">
              <div>
                <span className="text-secondary font-label-md uppercase tracking-wider mb-xs block">{selectedArticle.category}</span>
                <h2 className="font-headline-md text-on-surface font-bold">{selectedArticle.title}</h2>
              </div>
              <button onClick={() => setSelectedArticle(null)} className="text-on-surface-variant hover:text-error bg-surface-container p-xs rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            {/* The dangerouslySetInnerHTML block to render React-Quill formatting */}
            <div className="p-xl overflow-y-auto custom-scrollbar text-body-lg text-on-surface">
              <div 
                className="prose prose-slate max-w-none 
                  [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mb-4 [&>h1]:mt-6
                  [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mb-4 [&>h2]:mt-6
                  [&>h3]:text-xl [&>h3]:font-bold [&>h3]:mb-3 [&>h3]:mt-5
                  [&>p]:mb-4 [&>p]:leading-relaxed
                  [&>ul]:list-disc [&>ul]:ml-6 [&>ul]:mb-4 [&>li]:mb-1
                  [&>ol]:list-decimal [&>ol]:ml-6 [&>ol]:mb-4
                  [&>a]:text-primary [&>a]:underline"
                dangerouslySetInnerHTML={{ __html: selectedArticle.content }} 
              />
            </div>
            
            <div className="p-md bg-surface-container-low border-t border-outline-variant text-center">
              <button onClick={() => setSelectedArticle(null)} className="bg-primary text-on-primary px-xl py-sm rounded-full font-bold hover:opacity-90 transition-opacity">
                Close Article
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpCenter;