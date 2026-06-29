import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/api/articles/`;

const getHeaders = () => ({
  headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
});

const articleService = {
  getArticles: async () => {
    const response = await axios.get(API_URL, getHeaders());
    return response.data;
  },

  // Admin-only: fetch all organizations for the company selector dropdown
  getOrganizations: async () => {
    const response = await axios.get(`${API_URL}organizations`, getHeaders());
    return response.data;
  },

  // Public: fetch Published articles for a given org — no auth required
  // Used by HelpCenter, Customers, Agents, etc.
  getPublicArticles: async (organizationId) => {
    const response = await axios.get(`${API_URL}public`, { params: { organizationId } });
    return response.data;
  },


  createArticle: async (articleData) => {
    const response = await axios.post(API_URL, articleData, getHeaders());
    return response.data;
  },

  updateArticle: async (id, articleData) => {
    const response = await axios.put(`${API_URL}${id}`, articleData, getHeaders());
    return response.data;
  },

  deleteArticle: async (id) => {
    const response = await axios.delete(`${API_URL}${id}`, getHeaders());
    return response.data;
  }
};

export default articleService;