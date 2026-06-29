const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  parentArticleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  embedding: {
    type: [Number],
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('KnowledgeBaseChunk', chunkSchema);