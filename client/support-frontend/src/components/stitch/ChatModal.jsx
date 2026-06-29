import React, { useRef, useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;
import AgentReplyBox from '../AgentReplyBox';
import socket from '../../utils/socket';

export default function ChatModal({
  isOpen,
  onClose,
  ticket,
  replies,
  replyText,
  setReplyText,
  attachment,
  setAttachment,
  onSend,
  chatLoading,
  role,
  fetchReplies 
}) {
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Real-time structural states
  const [typingUser, setTypingUser] = useState(null);
  const myName = sessionStorage.getItem('userName') || 'Someone';

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [replies]);

  // Handle room joining and real-time typing events
  useEffect(() => {
    if (isOpen && ticket?._id) {
      // 1. Force entry into the explicit ticket room channels
      socket.emit('join_ticket', ticket._id);

      // 2. Intercept incoming streams from room participants
      socket.on('display_typing', (userName) => {
        setTypingUser(userName);
      });

      socket.on('remove_typing', () => {
        setTypingUser(null);
      });
    }

    return () => {
      socket.off('display_typing');
      socket.off('remove_typing');
      setTypingUser(null);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [isOpen, ticket]);

  if (!isOpen || !ticket) return null;

  // Helper to check if a reply is sent by the current user session.
  // Controls left (them) vs right (me) bubble alignment.
  const isMe = (reply) => {
    if (role === 'Customer' || role === 'User') {
      // Customer sees their own messages on the right
      return reply.senderRole === 'Customer' || reply.senderRole === 'User';
    } else if (role === 'Company_Owner') {
      // Owner sees their own messages on the right, customer on the left
      return reply.senderRole === 'Company_Owner';
    } else {
      // Agent / Admin: staff messages on right, customer on left
      return reply.senderRole === 'Agent' || reply.senderRole === 'Admin' || reply.senderRole === 'Company_Owner';
    }
  };


  // Debounced input change handling for customer layouts
  const handleCustomerTextChange = (e) => {
    setReplyText(e.target.value);

    // Blast typing signal upstream
    socket.emit('typing', { ticketId: ticket._id, userName: myName });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', ticket._id);
    }, 1500);
  };

  // Intercept the final payload transmission to clear typing frames immediately
  const handleCustomerSubmit = (e) => {
    e.preventDefault();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('stop_typing', ticket._id);
    onSend(e);
  };

  return (
    <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center z-50 p-gutter">
      <div 
        className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-2xl h-[80vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-primary px-gutter py-md text-on-primary flex justify-between items-center flex-shrink-0">
          <div className="overflow-hidden pr-md">
            <h3 className="font-title-lg text-title-lg font-bold truncate">Thread: {ticket.title}</h3>
            <p className="font-label-sm text-on-primary-container truncate">
              ID: {ticket._id} • Status: {ticket.status}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-on-primary-container hover:text-on-primary transition-colors cursor-pointer flex-shrink-0"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Original Issue Description */}
        <div className="bg-surface-container-low px-gutter py-md border-b border-outline-variant text-body-md text-on-surface flex-shrink-0">
          <span className="font-bold text-on-surface-variant block mb-xs">Original Issue Description:</span>
          <p className="whitespace-pre-line text-on-surface">{ticket.description || "No description provided."}</p>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-gutter bg-surface-container-lowest flex flex-col gap-md custom-scrollbar">
          {chatLoading ? (
            <div className="flex items-center justify-center h-full text-on-surface-variant font-body-md">
              <p>Loading message thread...</p>
            </div>
          ) : replies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-on-surface-variant text-center">
              <span className="material-symbols-outlined text-[48px] mb-xs text-outline-variant">forum</span>
              <p className="font-body-md">No replies yet. Start the conversation!</p>
            </div>
          ) : (
            replies.map((reply) => {
              const myMsg = isMe(reply);
              return (
                <div 
                  key={reply._id} 
                  className={`flex flex-col max-w-[80%] ${myMsg ? 'self-end items-end' : 'self-start items-start'}`}
                >
                  <span className="text-[11px] text-on-surface-variant mb-xs">
                    {reply.senderRole} • {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  
                  <div 
                    className={`px-md py-sm rounded-2xl text-body-md shadow-sm border ${
                      myMsg 
                        ? 'bg-secondary-container text-on-secondary-container border-secondary/20 rounded-tr-none' 
                        : 'bg-surface-container-low text-on-surface border-outline-variant/55 rounded-tl-none'
                    }`}
                  >
                    {reply.message && (
                      <p className="whitespace-pre-line mb-xs">{reply.message}</p>
                    )}

                    {reply.attachmentUrl && (
                      <div className="mt-sm overflow-hidden rounded-xl border border-outline-variant">
                        <img 
                          src={`${API_URL}${reply.attachmentUrl}`} 
                          alt="attachment" 
                          className="max-w-full max-h-60 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => window.open(`${API_URL}${reply.attachmentUrl}`, '_blank')}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* --- LIVE TYPING INDICATOR UI CONTAINER --- */}
        <div className="px-gutter h-6 bg-surface-container-low text-xs text-on-surface-variant italic flex items-center border-t border-outline-variant/30 flex-shrink-0">
          {typingUser && (
            <div className="flex items-center gap-1 animate-pulse text-secondary font-bold">
              <span className="material-symbols-outlined text-[14px]">bubble_chart</span>
              <span>{typingUser} is typing...</span>
            </div>
          )}
        </div>

        {/* --- DYNAMIC INPUT FOOTER AREA --- */}
        {role === 'Admin' || role === 'Agent' || role === 'Company_Owner' ? (
          <div className="bg-surface-container-low border-t border-outline-variant p-sm flex-shrink-0">
            <AgentReplyBox 
              ticketId={ticket._id} 
              onTyping={() => {
                socket.emit('typing', { ticketId: ticket._id, userName: myName });
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                  socket.emit('stop_typing', ticket._id);
                }, 1500);
              }}
              onReplyAdded={() => {
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                socket.emit('stop_typing', ticket._id);
                if (fetchReplies) fetchReplies(ticket._id); 
              }} 
            />
          </div>
        ) : (
          <form 
            onSubmit={handleCustomerSubmit} 
            className="p-gutter bg-surface-container-low border-t border-outline-variant flex items-center gap-sm flex-shrink-0"
          >
            {/* File attachment */}
            <input 
              type="file" 
              id="chat-file-upload" 
              accept="image/*" 
              onChange={(e) => setAttachment(e.target.files[0])}
              className="hidden" 
            />
            <label 
              htmlFor="chat-file-upload" 
              className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container transition-all cursor-pointer flex-shrink-0 ${
                attachment ? 'text-secondary bg-secondary/10' : 'text-on-surface-variant'
              }`}
              title="Attach Image"
            >
              <span className="material-symbols-outlined">attach_file</span>
            </label>

            {/* Text input */}
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder={attachment ? `Attached: ${attachment.name}` : "Type your reply..."} 
                value={replyText}
                onChange={handleCustomerTextChange}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-full pl-md pr-xl py-sm font-body-md focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all"
              />
              {attachment && (
                <button 
                  type="button" 
                  onClick={() => setAttachment(null)} 
                  className="absolute right-md top-1/2 -translate-y-1/2 text-error hover:text-error/85 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                </button>
              )}
            </div>

            {/* Submit */}
            <button 
              type="submit" 
              disabled={!replyText.trim() && !attachment}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                replyText.trim() || attachment
                  ? 'bg-secondary text-on-secondary shadow-md hover:bg-secondary/90'
                  : 'bg-surface-container-highest text-on-surface-variant opacity-60 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}