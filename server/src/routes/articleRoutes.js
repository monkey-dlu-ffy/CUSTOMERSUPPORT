const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET /api/articles/organizations — Admin-only: fetch all companies for the dropdown
// Must be defined BEFORE /:id to avoid being shadowed
router.get(
  '/organizations',
  protect,
  authorize('Admin'),
  articleController.getOrganizations
);

// GET /api/articles/public?organizationId=xxx — Public: Published articles for a given org
// No auth required — readable by all users in the company (Customers, Agents, etc.)
router.get('/public', articleController.getPublicArticles);

// All article management routes require authentication
router.get('/', protect, authorize('Admin', 'Company_Owner'), articleController.getArticles);
router.post('/', protect, authorize('Admin', 'Company_Owner'), articleController.createArticle);
router.put('/:id', protect, authorize('Admin', 'Company_Owner'), articleController.updateArticle);
router.delete('/:id', protect, authorize('Admin', 'Company_Owner'), articleController.deleteArticle);

module.exports = router;