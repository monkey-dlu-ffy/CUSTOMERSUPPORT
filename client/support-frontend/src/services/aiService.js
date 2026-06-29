// src/services/aiService.js

/**
 * Analyzes text and returns a sentiment category.
 * Replace the pseudo-code with your actual SDK call (e.g., Groq or Google Gen AI).
 */
export const analyzeSentiment = async (text) => {
  try {
    const prompt = `Analyze the sentiment of this customer support ticket. 
    Respond with exactly one word: POSITIVE, NEUTRAL, or NEGATIVE.
    Ticket Text: "${text}"`;

    // Example using a generic AI completion call
    // const response = await aiClient.chat.completions.create({ ... })
    // const sentiment = response.choices[0].message.content.trim().toUpperCase();

    // For demonstration, assuming the AI returned:
    const sentiment = 'NEGATIVE'; // In reality, this is dynamic based on the AI

    return sentiment;
  } catch (error) {
    console.error("AI sentiment analysis failed:", error);
    return 'NEUTRAL'; // Safe fallback
  }
};