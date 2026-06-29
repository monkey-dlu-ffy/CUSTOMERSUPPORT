import React, { useState } from 'react';
import ticketService from '../services/ticketService'; // Make sure this path is correct!

export default function AgentReplyBox({ ticketId, onReplyAdded, onTyping }) {
  const [replyMessage, setReplyMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // 1. Handle the AI Suggestion
  const handleSuggestReply = async () => {
    setIsGenerating(true);
    try {
      // Call the new service we just built
      const response = await ticketService.suggestReply(ticketId);
      
      // The AI returns the drafted text. Plop it into the text box!
      setReplyMessage(response.suggestion);
    } catch (error) {
      console.error("Failed to fetch AI suggestion", error);
      alert("AI suggestion failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };
  const handleInputChange = (e) => {
    const value = e.target.value;
    setReplyMessage(value);

    // This fires the trigger passed down from ChatModal
    if (onTyping) {
      onTyping();
    }
  };
  // 2. Handle the final Send
  const handleSend = async () => {
    if (!replyMessage.trim()) return;

    setIsSending(true);
    try {
      // Send the text to the backend (passing null for the file attachment for now)
      await ticketService.addReply(ticketId, replyMessage, null);
      
      // Clear the box and tell the parent component to refresh the chat log
      setReplyMessage('');
      if (onReplyAdded) onReplyAdded(); 
    } catch (error) {
      console.error("Failed to send reply", error);
      alert("Failed to send your message.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-sm bg-surface dark:bg-surface-container rounded-xl border border-outline-variant">
      
      {/* Header & AI Button */}
      <div className="flex justify-between items-center mb-xs">
        <label className="font-label-md font-semibold text-on-surface-variant">Reply</label>
        
        <button 
          onClick={handleSuggestReply}
          disabled={isGenerating || isSending}
          className={`flex items-center gap-xs px-sm py-xs rounded-lg transition-colors text-xs font-bold ${
            isGenerating 
              ? 'text-on-surface-variant bg-surface-variant cursor-not-allowed' 
              : 'text-primary hover:bg-primary-fixed-dim active:scale-95'
          }`}
        >
          <span className={`material-symbols-outlined text-sm ${isGenerating ? 'animate-spin' : ''}`} data-icon="auto_awesome">
            {isGenerating ? 'hourglass_empty' : 'auto_awesome'}
          </span>
          {isGenerating ? 'Drafting...' : 'AI Suggest'}
        </button>
      </div>

      {/* Text Input — compact, grows to max 160px */}
      <textarea 
        value={replyMessage}
        onChange={(e) => {
          setReplyMessage(e.target.value);
          if (onTyping) onTyping();
        }}
        disabled={isGenerating || isSending}
        className="w-full p-sm rounded-lg border border-outline bg-surface-container-lowest text-on-surface text-sm min-h-[72px] max-h-[160px] focus:ring-2 focus:ring-primary focus:outline-none resize-none overflow-y-auto"
        placeholder="Type your reply, or let AI draft one..."
      />

      {/* Submit Button */}
      <div className="flex justify-end mt-xs">
        <button 
          onClick={handleSend}
          disabled={!replyMessage.trim() || isSending || isGenerating}
          className="bg-primary text-on-primary px-md py-xs rounded-lg text-sm font-bold flex items-center gap-xs hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <span>{isSending ? 'Sending...' : 'Send Reply'}</span>
          <span className="material-symbols-outlined text-sm" data-icon="send">send</span>
        </button>
      </div>
    </div>
  );
}