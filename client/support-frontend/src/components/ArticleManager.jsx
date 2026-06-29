import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import articleService from '../services/articleService';
import Sidebar from './stitch/Sidebar';
import Header from './stitch/Header';
import Fuse from 'fuse.js';

const CATEGORIES = ['Getting Started', 'Account & Billing', 'Troubleshooting', 'Security', 'General FAQ'];

const ArticleManager = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [organizations, setOrganizations] = useState([]); // For Admin's company dropdown
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Get role and org info from sessionStorage (server enforces scoping — this is just for UI hints)
  const userRole = sessionStorage.getItem('userRole');
  const userOrgId = sessionStorage.getItem('organizationId'); // stored on login

  const isAdmin = userRole === 'Admin';

  const [formData, setFormData] = useState({
    title: '',
    category: CATEGORIES[0],
    content: '',
    status: 'Draft',
    organizationId: '' // Admin will select; Company_Owner's will be set server-side
  });

  useEffect(() => {
    if (userRole !== 'Admin' && userRole !== 'Company_Owner') {
      navigate('/dashboard');
      return;
    }
    fetchArticles();
    // Only Admins need the org dropdown
    if (isAdmin) {
      fetchOrganizations();
    }
  }, [navigate]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const data = await articleService.getArticles();
      const safeArray = Array.isArray(data) ? data : (data?.articles || data?.data || []);
      setArticles(safeArray);
    } catch (error) {
      console.error("Failed to fetch articles", error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const data = await articleService.getOrganizations();
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch organizations", error);
    }
  };

  // --- CRUD Handlers ---
  const handleOpenModal = (article = null) => {
    if (article) {
      setEditingId(article._id);
      setFormData({
        title: article.title,
        category: article.category,
        content: article.content,
        status: article.status,
        organizationId: article.organizationId || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        category: CATEGORIES[0],
        content: '',
        status: 'Draft',
        organizationId: isAdmin ? (organizations[0]?._id || '') : (userOrgId || '')
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isAdmin && !formData.organizationId) {
      alert('Please select a company for this article.');
      return;
    }

    try {
      if (editingId) {
        const updated = await articleService.updateArticle(editingId, formData);
        setArticles(articles.map(a => a._id === editingId ? updated : a));
      } else {
        const created = await articleService.createArticle(formData);
        setArticles([created, ...articles]);
      }
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save article", error);
      alert(error?.response?.data?.message || "Error saving article. Check console.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this article?")) return;
    try {
      await articleService.deleteArticle(id);
      setArticles(articles.filter(a => a._id !== id));
    } catch (error) {
      console.error("Failed to delete", error);
      alert(error?.response?.data?.message || "Error deleting article.");
    }
  };

  // Helper: get org name for display in the articles table
  const getOrgName = (orgId) => {
    const org = organizations.find(o => String(o._id) === String(orgId));
    return org ? org.name : orgId || '—';
  };

  // --- FUZZY SEARCH & FILTER LOGIC ---
  const getFilteredArticles = () => {
    const safeArticles = Array.isArray(articles) ? articles : [];

    let results = categoryFilter === 'All'
      ? safeArticles
      : safeArticles.filter(a => a?.category === categoryFilter);

    if (searchQuery.trim()) {
      const fuse = new Fuse(results, {
        keys: [
          { name: 'title', weight: 0.7 },
          { name: 'content', weight: 0.3 }
        ],
        threshold: 0.4,
        ignoreLocation: true
      });
      results = fuse.search(searchQuery).map(result => result.item);
    }

    return results || [];
  };

  const filteredArticles = getFilteredArticles();

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen">
      <Sidebar
        role={userRole}
        userName={userRole === 'Admin' ? 'Admin Profile' : 'Company Owner'}
        onLogout={() => { sessionStorage.clear(); navigate('/login'); }}
        activeLink="Knowledge Base"
      />

      <main className="ml-64 min-h-screen flex flex-col bg-surface-container-lowest">
        <Header role={userRole} searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        <div className="p-gutter flex-1 space-y-lg overflow-y-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
            <div>
              <h2 className="font-headline-lg text-headline-lg mb-xs">Knowledge Base Manager</h2>
              <p className="text-on-surface-variant">
                {isAdmin
                  ? 'Create and manage help articles for any company.'
                  : 'Create and manage help articles for your company.'}
              </p>
            </div>

            <button onClick={() => handleOpenModal()} className="bg-primary text-on-primary px-lg py-sm rounded-xl font-bold flex items-center gap-xs hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-[20px]">add</span>
              New Article
            </button>
          </div>

          <div className="flex bg-surface-container rounded-lg p-xs border border-outline-variant w-fit">
            {['All', ...CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-md py-xs text-label-md rounded transition-all cursor-pointer ${
                  categoryFilter === cat ? 'bg-surface-container-lowest shadow-sm text-secondary font-bold' : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            {/* Table header — show "Company" column only for Admin */}
            <div className={`grid ${isAdmin ? 'grid-cols-[2fr_1.5fr_1fr_1fr_120px]' : 'grid-cols-[2fr_1.5fr_1fr_120px]'} gap-gutter bg-surface-container-low border-b border-outline-variant px-gutter py-md font-label-md text-on-surface-variant uppercase tracking-wider`}>
              <div>Title</div>
              <div>Category</div>
              {isAdmin && <div>Company</div>}
              <div className="text-center">Status</div>
              <div className="text-right">Actions</div>
            </div>

            <div className="divide-y divide-outline-variant max-h-[600px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-xl text-center text-on-surface-variant">Loading articles...</div>
              ) : filteredArticles.length === 0 ? (
                <div className="p-xl text-center text-on-surface-variant">No articles found.</div>
              ) : (
                filteredArticles.map(article => (
                  <div key={article._id} className={`grid ${isAdmin ? 'grid-cols-[2fr_1.5fr_1fr_1fr_120px]' : 'grid-cols-[2fr_1.5fr_1fr_120px]'} gap-gutter px-gutter py-md items-center hover:bg-surface-container-low transition-colors`}>
                    <div className="font-title-md text-on-surface truncate">{article.title}</div>
                    <div className="text-on-surface-variant truncate">
                      <span className="bg-surface-variant px-sm py-1 rounded-md text-label-sm">{article.category}</span>
                    </div>
                    {isAdmin && (
                      <div className="text-on-surface-variant text-label-sm truncate">
                        {getOrgName(article.organizationId)}
                      </div>
                    )}
                    <div className="flex justify-center">
                      <span className={`px-sm py-1 rounded-full text-label-sm font-bold ${article.status === 'Published' ? 'bg-secondary-container text-secondary' : 'bg-surface-variant text-on-surface-variant'}`}>
                        {article.status}
                      </span>
                    </div>
                    <div className="flex justify-end gap-xs">
                      <button onClick={() => handleOpenModal(article)} className="p-xs text-secondary hover:bg-secondary/10 rounded-xl transition-all" title="Edit">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button onClick={() => handleDelete(article._id)} className="p-xs text-error hover:bg-error/10 rounded-xl transition-all" title="Delete">
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-md">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-4xl overflow-hidden shadow-xl border border-outline-variant flex flex-col max-h-[90vh]">
            <div className="p-lg border-b border-outline-variant flex justify-between items-center bg-surface-container-low shrink-0">
              <h3 className="font-headline-sm text-on-surface">{editingId ? 'Edit Article' : 'Create New Article'}</h3>
              <button onClick={handleCloseModal} className="text-on-surface-variant hover:text-error transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-lg flex flex-col gap-md overflow-y-auto">
              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-on-surface-variant">Article Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="bg-surface-container p-sm rounded-lg border border-outline-variant focus:border-primary outline-none"
                  required
                />
              </div>

              <div className={`grid ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'} gap-md`}>
                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-on-surface-variant">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="bg-surface-container p-sm rounded-lg border border-outline-variant focus:border-primary outline-none"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-on-surface-variant">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="bg-surface-container p-sm rounded-lg border border-outline-variant focus:border-primary outline-none"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                  </select>
                </div>

                {/* Company Selector — Admin only */}
                {isAdmin ? (
                  <div className="flex flex-col gap-xs">
                    <label className="font-label-md text-on-surface-variant">
                      Company <span className="text-error">*</span>
                    </label>
                    <select
                      value={formData.organizationId}
                      onChange={(e) => setFormData({...formData, organizationId: e.target.value})}
                      className="bg-surface-container p-sm rounded-lg border border-outline-variant focus:border-primary outline-none"
                      required
                    >
                      <option value="">— Select a company —</option>
                      {organizations.map(org => (
                        <option key={org._id} value={org._id}>
                          {org.name} {org.domain ? `(${org.domain})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  /* Company_Owner: show their org as a read-only badge */
                  <div className="flex flex-col gap-xs">
                    <label className="font-label-md text-on-surface-variant">Company</label>
                    <div className="bg-surface-container-high p-sm rounded-lg border border-outline-variant flex items-center gap-xs">
                      <span className="material-symbols-outlined text-[16px] text-secondary">domain</span>
                      <span className="text-on-surface-variant font-label-md">Your Company (auto-assigned)</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-xs pb-12">
                <label className="font-label-md text-on-surface-variant">Content</label>
                <div className="bg-white text-black rounded-lg overflow-hidden border border-outline-variant">
                  <textarea
                    className="w-full p-2 border rounded-md min-h-[300px] bg-white text-black outline-none focus:ring-2 focus:ring-primary"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Write your article content here..."
                    required
                  />
                </div>
              </div>

              <div className="pt-xl flex justify-end gap-sm border-t border-outline-variant mt-sm shrink-0">
                <button type="button" onClick={handleCloseModal} className="px-lg py-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" className="bg-primary text-on-primary px-lg py-sm rounded-xl font-bold hover:opacity-90 transition-opacity">
                  {editingId ? 'Save Changes' : 'Publish Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleManager;