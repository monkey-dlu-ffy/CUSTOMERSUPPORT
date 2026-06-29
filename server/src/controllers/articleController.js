const Article = require('../models/Article');
const Organization = require('../models/Organization');
const ragService = require('../services/ragService');

const articleController = {

  // GET /api/articles/public?organizationId=xxx — No auth required, Published only
  getPublicArticles: async (req, res) => {
    try {
      const { organizationId } = req.query;
      if (!organizationId) {
        return res.status(400).json({ message: 'organizationId query parameter is required.' });
      }
      const articles = await Article.find({
        organizationId: String(organizationId),
        status: 'Published'
      }).sort({ createdAt: -1 });
      res.status(200).json(articles);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch public articles', error: error.message });
    }
  },

  // GET /api/articles — Admins see all or filter by org; Company_Owner only sees their own org
  getArticles: async (req, res) => {
    try {
      const { role, organizationId: userOrgId } = req.user;
      let filter = {};

      if (role === 'Admin') {
        // Admin can optionally filter by a specific org via query param
        if (req.query.organizationId) {
          filter.organizationId = req.query.organizationId;
        }
        // If no filter, Admin sees ALL articles across all orgs
      } else {
        // Company_Owner (and anyone else) can only see their own org's articles
        filter.organizationId = String(userOrgId);
      }

      const articles = await Article.find(filter).sort({ createdAt: -1 });
      res.status(200).json(articles);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch articles', error: error.message });
    }
  },

  // GET /api/articles/organizations — Only for Admins, returns all orgs for the dropdown
  getOrganizations: async (req, res) => {
    try {
      if (req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Forbidden: Admins only.' });
      }
      const orgs = await Organization.find({}).sort({ name: 1 }).select('_id name domain');
      res.status(200).json(orgs);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch organizations', error: error.message });
    }
  },

  // POST /api/articles — Company_Owner auto-gets their org; Admin must supply organizationId
  createArticle: async (req, res) => {
    try {
      const { role, organizationId: userOrgId } = req.user;
      const { title, category, content, status, organizationId: bodyOrgId } = req.body;

      let organizationId;
      if (role === 'Company_Owner') {
        // Enforce: always use the owner's own org — ignore whatever the client sends
        organizationId = String(userOrgId);
      } else if (role === 'Admin') {
        // Admin must explicitly pick a company
        if (!bodyOrgId) {
          return res.status(400).json({ message: 'Admin must select a company for this article.' });
        }
        organizationId = bodyOrgId;
      } else {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to create articles.' });
      }

      const newArticle = new Article({ title, category, content, status, organizationId });
      const savedArticle = await newArticle.save();

      // Trigger RAG chunk synchronization asynchronously
      await ragService.syncArticleChunks(savedArticle);

      res.status(201).json(savedArticle);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create article', error: error.message });
    }
  },

  // PUT /api/articles/:id — Company_Owner can only update their own org's articles
  updateArticle: async (req, res) => {
    try {
      const { role, organizationId: userOrgId } = req.user;
      const article = await Article.findById(req.params.id);

      if (!article) {
        return res.status(404).json({ message: 'Article not found.' });
      }

      // Company_Owner can only edit articles belonging to their own org
      if (role === 'Company_Owner' && String(article.organizationId) !== String(userOrgId)) {
        return res.status(403).json({ message: 'Forbidden: This article does not belong to your organization.' });
      }

      const { title, category, content, status, organizationId: bodyOrgId } = req.body;

      // Determine final organizationId: Company_Owner keeps their own, Admin can update it
      const organizationId = role === 'Admin' && bodyOrgId ? bodyOrgId : article.organizationId;

      const updatedArticle = await Article.findByIdAndUpdate(
        req.params.id,
        { title, category, content, status, organizationId },
        { new: true }
      );

      if (updatedArticle) {
        await ragService.syncArticleChunks(updatedArticle);
      }

      res.status(200).json(updatedArticle);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update article', error: error.message });
    }
  },

  // DELETE /api/articles/:id — Company_Owner can only delete their own org's articles
  deleteArticle: async (req, res) => {
    try {
      const { role, organizationId: userOrgId } = req.user;
      const article = await Article.findById(req.params.id);

      if (!article) {
        return res.status(404).json({ message: 'Article not found.' });
      }

      if (role === 'Company_Owner' && String(article.organizationId) !== String(userOrgId)) {
        return res.status(403).json({ message: 'Forbidden: This article does not belong to your organization.' });
      }

      await Article.findByIdAndDelete(req.params.id);

      // Clean up orphaned vector embeddings
      await ragService.purgeArticleChunks(req.params.id);

      res.status(200).json({ message: 'Article deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete article', error: error.message });
    }
  }
};

module.exports = articleController;