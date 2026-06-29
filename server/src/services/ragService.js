const { GoogleGenerativeAI } = require('@google/generative-ai');
const KnowledgeBaseChunk = require('../models/Chunk');

// Initialize the Gemini Client using your secure environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const ragService = {
  syncArticleChunks: async (article) => {
    try {
      // 1. Clear out old vectors to prevent stale data
      await KnowledgeBaseChunk.deleteMany({ parentArticleId: article._id });

      // Only generate vectors if the article is actively published
      if (article.status !== 'Published') return;

      // 2. Split content into paragraphs (granular clean sections)
      const paragraphs = article.content.split('\n\n').filter(p => p.trim().length > 10);

      if (paragraphs.length === 0) return;

      // 3. Initialize the free Gemini Embedding Model
      const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

      // 4. Batch process embeddings
      const chunkDocs = [];
      for (const [index, textBlock] of paragraphs.entries()) {
        // Generate the 768-dimension vector
        const result = await embeddingModel.embedContent({
  content: { role: "user", parts: [{ text: textBlock.trim() }] },
  taskType: "RETRIEVAL_DOCUMENT",
  outputDimensionality: 768
});
        
        chunkDocs.push({
          organizationId: article.organizationId,
          parentArticleId: article._id,
          chunkIndex: index,
          text: textBlock.trim(),
          embedding: result.embedding.values 
        });
      }

      // 5. Save the vectorized chunks to your MongoDB Atlas collection
      await KnowledgeBaseChunk.insertMany(chunkDocs);
      console.log(`Successfully synced ${chunkDocs.length} chunks for article: ${article._id}`);

    } catch (error) {
      console.error('Failed to sync vector chunks:', error.message);
    }
  },

  purgeArticleChunks: async (articleId) => {
    try {
      await KnowledgeBaseChunk.deleteMany({ parentArticleId: articleId });
      console.log(`Purged chunks for deleted article: ${articleId}`);
    } catch (error) {
      console.error('Failed to purge vector chunks:', error.message);
    }
  }
};

module.exports = ragService;