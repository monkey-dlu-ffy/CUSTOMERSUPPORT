const express = require('express');
const router = express.Router();

// Import your controllers
const { 
  register, 
  login, 
  getOrganizations,
  registerCompanyAndOwner, 
  createAgent, 
  createCustomer,
  getAgents,
  getCustomers
} = require('../controllers/authController');

// Import your brand new middleware
const { protect, authorize } = require('../middleware/authMiddleware'); // Adjust path if needed

// --- PUBLIC ROUTES ---
router.post('/register', register);
router.post('/login', login);
router.post('/register-company', registerCompanyAndOwner);
router.get('/organizations', getOrganizations); // For login org picker

// --- PROTECTED B2B ROUTES ---
// Only Company Owners can hit this endpoint
router.post(
  '/create-agent', 
  protect, 
  authorize('Company_Owner'), 
  createAgent
);

router.post(
  '/create-agent', 
  protect, 
  authorize('Company_Owner'), 
  createAgent
);
router.post(
  '/create-customer',
  protect,
  authorize('Company_Owner','Agent'),
  createCustomer
);

// Admins and Company Owners can fetch the agent list
router.get(
  '/agents', 
  protect, 
  authorize('Company_Owner', 'Admin','Agent'), 
  getAgents
);
router.get(
  '/customers',
  protect,
  authorize('Admin', 'Company_Owner', 'Agent'),
  getCustomers
);

module.exports = router;