const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  addReply,
  getTicketReplies,
  suggestReply,
  getTicketStats // <-- Imported from controller
} = require('../controllers/ticketController');

const { protect, authorize } = require('../middleware/authMiddleware');

// ---------- MULTER CONFIGURATION ----------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });
// ------------------------------------------

// --- Aggregation Analytics Route ---
// Placed above /:id base routes to avoid Express parameter collision
router.get('/stats', protect, authorize('Admin', 'Agent'), getTicketStats);

// Ticket routes
router.route('/')
  .get(protect, getTickets)
  .post(protect, createTicket);

router.route('/:id')
  .get(protect, getTicketById)
  .put(protect, updateTicket)
  .delete(protect, authorize('Admin','Customer'), deleteTicket);

// Ticket reply routes
router.route('/:id/replies')
  .get(protect, getTicketReplies)
  .post(
    protect,
    upload.single('attachment'),
    addReply
  );

// AI Suggestion Route
router.post('/:id/suggest-reply', protect, suggestReply);

module.exports = router;