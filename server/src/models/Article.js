const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  organizationId: {
    type: String,
    required: true,
    index: true // Indexed for rapid traditional fetching
  },
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Draft', 'Published'],
    default: 'Draft'
  },
  content: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Article', articleSchema);