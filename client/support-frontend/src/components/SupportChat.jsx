import { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");

const INITIAL_MESSAGE = [
  { role: 'bot', text: 'Hello! I am your AI support assistant. How can I help you today?' }
];

const SupportChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGE);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Use the real MongoDB organizationId stored on login
  // This is the actual _id of the Organization document — matches what chunks store
  const currentUserId = sessionStorage.getItem('userId');
  const currentOrgId = sessionStorage.getItem('organizationId');

  // Reset chat whenever the logged-in user changes (e.g. after logout + new login)
  useEffect(() => {
    setMessages(INITIAL_MESSAGE);
    setInput('');
    setIsOpen(false);
  }, [currentUserId]);

  // Auto-scroll to the newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat/bot-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          organizationId: currentOrgId
        })
      });

      const data = await response.json();

      if (response.status === 429) {
        // Rate limit — show a friendly wait message
        const waitSec = Math.ceil((data.retryAfterMs || 10000) / 1000);
        setMessages((prev) => [...prev, {
          role: 'bot',
          text: `⏳ The AI assistant is currently busy. Please wait ${waitSec} seconds and try again.`
        }]);
      } else if (response.ok) {
        setMessages((prev) => [...prev, { role: 'bot', text: data.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: 'bot', text: 'Oops! The server encountered an error. Please try again.' }]);
        console.error("Backend Error:", data);
      }
    } catch (error) {
      console.error('Chat connection failed:', error);
      setMessages((prev) => [...prev, { role: 'bot', text: 'Network error. Please check your connection and try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {/* The Chat Window */}
      {isOpen && (
        <div className="bg-surface-container-lowest w-80 md:w-96 h-[500px] mb-4 rounded-2xl shadow-2xl border border-outline-variant flex flex-col overflow-hidden transition-all duration-300">
          {/* Header */}
          <div className="bg-primary text-on-primary p-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">smart_toy</span>
              <h3 className="font-title-md font-bold">AI Support</h3>
            </div>
            <div className="flex items-center gap-2">
              {/* Clear chat button */}
              <button
                onClick={() => setMessages(INITIAL_MESSAGE)}
                title="Clear chat"
                className="hover:text-primary-container transition-colors opacity-80 hover:opacity-100"
              >
                <span className="material-symbols-outlined text-[20px]">restart_alt</span>
              </button>
              <button onClick={() => setIsOpen(false)} className="hover:text-primary-container transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          {/* Message History */}
          <div className="flex-1 p-4 overflow-y-auto bg-surface flex flex-col gap-3 custom-scrollbar">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[85%] p-3 rounded-xl text-body-md ${
                  msg.role === 'user'
                    ? 'bg-primary text-on-primary self-end rounded-br-sm'
                    : 'bg-surface-variant text-on-surface self-start rounded-bl-sm border border-outline-variant'
                }`}
              >
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div className="bg-surface-variant text-on-surface max-w-[85%] p-3 rounded-xl rounded-bl-sm self-start border border-outline-variant flex items-center gap-2">
                <div className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-3 bg-surface-container-low border-t border-outline-variant shrink-0 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 bg-surface-container-lowest border border-outline focus:border-primary p-2 rounded-lg outline-none text-body-md text-on-surface transition-colors"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-primary text-on-primary p-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center w-10 h-10"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </form>
        </div>
      )}

      {/* The Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-primary text-on-primary w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform ${isOpen ? 'scale-0 opacity-0 absolute' : 'scale-100 opacity-100 relative'}`}
      >
        <span className="material-symbols-outlined text-3xl">chat</span>
      </button>
    </div>
  );
};

export default SupportChat;