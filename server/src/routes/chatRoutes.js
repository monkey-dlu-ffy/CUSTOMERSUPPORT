const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const KnowledgeBaseChunk = require('../models/Chunk');

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Retry helper with exponential backoff ---
// Handles 429 rate-limit errors gracefully instead of crashing
const withRetry = async (fn, maxRetries = 3, baseDelayMs = 2000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err?.message?.includes('429') || err?.status === 429;
      if (is429 && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1); // 2s, 4s, 8s
        console.warn(`Rate limit hit. Retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw err; // Rethrow on final attempt or non-429 errors
      }
    }
  }
};

router.post('/bot-query', async (req, res) => {
  const { message, organizationId } = req.body;

  if (!message || !organizationId) {
    return res.status(400).json({ message: 'Missing message or organizationId context' });
  }

  try {
    // 1. Convert the incoming customer message into a vector embedding (768 dimensions)
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

    const embeddingResult = await withRetry(() =>
      embeddingModel.embedContent({
        content: { role: "user", parts: [{ text: message }] },
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: 768
      })
    );
    const queryVector = embeddingResult.embedding.values;

    // 2. Query MongoDB Atlas Vector Search
    // organizationId from client is the real MongoDB _id string — matches what chunks store
    const matchedChunks = await KnowledgeBaseChunk.aggregate([
      {
        $vectorSearch: {
          index: "vector_index_spec",
          path: "embedding",
          queryVector: queryVector,
          numCandidates: 50,
          limit: 5,
          filter: { organizationId: { $eq: organizationId } }
        }
      }
    ]);

    // 3. Compile matched chunks into context
    const knowledgeContext = matchedChunks.map(chunk => chunk.text).join('\n\n');

    // 4. Use Gemini model for response generation
    // Check https://aistudio.google.com/ for the latest available models
    const chatModel = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

    // 5. Build a grounded prompt
    let systemInstruction;
    if (knowledgeContext.trim()) {
      systemInstruction = `You are a helpful customer support assistant. Answer the customer's question using ONLY the knowledge base articles below. Be concise, friendly, and accurate. If the answer is not covered in the knowledge base, politely say so and suggest they submit a support ticket.\n\nKnowledge Base:\n${knowledgeContext}`;
    } else {
      systemInstruction = `You are a helpful customer support assistant. You currently have no relevant articles in the knowledge base that match this query. Politely tell the customer you couldn't find a specific answer and encourage them to submit a support ticket for personalized help.`;
    }

    // 6. Generate response with retry
    const chatResult = await withRetry(() =>
      chatModel.generateContent({
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\nCustomer Question: ${message}` }] }
        ]
      })
    );

    const botReply = chatResult.response.text();
    res.status(200).json({ reply: botReply });

  } catch (error) {
    console.error('Gemini RAG Router Error:', error.message);

    // Return a friendly rate-limit message to the user instead of a generic error
    const is429 = error?.message?.includes('429') || error?.message?.includes('Too Many Requests');
    if (is429) {
      return res.status(429).json({
        message: 'The AI assistant is temporarily busy due to high demand. Please wait a moment and try again.',
        retryAfterMs: 10000
      });
    }

    res.status(500).json({ message: 'Bot processing error', error: error.message });
  }
});

module.exports = router;

