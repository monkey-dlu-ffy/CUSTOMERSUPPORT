// src/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const { getTicketsByStatus, getAverageResolutionTime } = require('../controllers/reportController');

// Define the endpoints for your frontend to call
router.get('/status', getTicketsByStatus);
router.get('/resolution-time', getAverageResolutionTime);

module.exports = router;