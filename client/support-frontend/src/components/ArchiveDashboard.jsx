// src/components/ArchiveDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ticketService from '../services/ticketService';
import Sidebar from './stitch/Sidebar';
import Header from './stitch/Header';
import ChatModal from './stitch/ChatModal';
import { getPriorityStyle, getStatusStyle } from '../utils/themeUtils';

const ArchiveDashboard = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Chat/Thread States
  const [activeTicket, setActiveTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await ticketService.getTickets();
      // ONLY keep closed tickets
      setTickets(data.filter(t => t.status === 'Closed')); 
    } catch (err) {
      console.error('Failed to sync cluster data.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  const openChat = async (ticket) => {
    setActiveTicket(ticket);
    setChatLoading(true);
    try {
      const data = await ticketService.getReplies(ticket._id);
      setReplies(data);
    } catch (error) {
      console.error("Failed to load thread", error);
    } finally {
      setChatLoading(false);
    }
  };

  const closeChat = () => {
    setActiveTicket(null);
    setReplies([]);
    setReplyText('');
    setAttachment(null);
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const filteredTickets = tickets.filter(t => 
    !searchQuery || 
    t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen">
      <Sidebar 
        role="Customer"
        userName="Customer Profile"
        userEmail="Online"
        onLogout={handleLogout}
        activeLink="Previous Queries"
      />

      <main className="ml-64 min-h-screen flex flex-col">
        <Header 
          role="Customer"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="p-gutter flex-1 space-y-lg">
          <div>
            <h3 className="font-headline-lg text-headline-lg mb-xs">Previous Queries</h3>
            <p className="text-on-surface-variant">Your historical, closed support tickets.</p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col shadow-sm">
            <div className="grid grid-cols-[100px_3.5fr_1fr_120px_120px_180px] gap-gutter bg-surface-container-low border-b border-outline-variant px-gutter py-md">
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider">ID</div>
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider">Subject & Preview</div>
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider text-center">Status</div>
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider text-center">Priority</div>
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider">Closed On</div>
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider text-right">Actions</div>
            </div>

            <div className="divide-y divide-outline-variant overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 320px)' }}>
              {loading ? (
                <div className="p-xl text-center text-on-surface-variant">Fetching archive data...</div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-xl text-center text-on-surface-variant">No previous queries found.</div>
              ) : (
                filteredTickets.map((ticket) => (
                  <div 
                    key={ticket._id} 
                    className="grid grid-cols-[100px_3.5fr_1fr_120px_120px_180px] gap-gutter px-gutter py-md items-center hover:bg-surface-container-low transition-colors cursor-pointer"
                    onClick={() => openChat(ticket)}
                  >
                    <div className="font-label-md text-on-surface-variant font-mono">
                      #{ticket._id.substring(ticket._id.length - 8)}
                    </div>
                    
                    <div className="min-w-0">
                      <p className="font-title-lg truncate mb-xs text-on-surface">{ticket.title}</p>
                      <p className="font-body-md text-on-surface-variant truncate">{ticket.description}</p>
                    </div>

                    <div className="flex justify-center">
                      <span className={`px-md py-xs rounded-full text-label-sm font-bold ${getStatusStyle(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>

                    <div className="flex justify-center">
                      <span className={`px-md py-xs rounded-full text-label-sm font-bold uppercase ${getPriorityStyle(ticket.priority)}`}>
                        {ticket.priority || 'Medium'}
                      </span>
                    </div>

                    <div className="text-on-surface-variant font-label-md">
                      {formatTimeAgo(ticket.updatedAt)}
                    </div>

                    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                      {/* ONLY View Chat is allowed. No Delete. No Cycle. */}
                      <button 
                        onClick={() => openChat(ticket)}
                        className="p-xs text-secondary hover:bg-secondary/10 rounded-xl transition-all cursor-pointer"
                        title="View Record"
                      >
                        <span className="material-symbols-outlined text-[20px]">forum</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Read-Only Chat View */}
      <ChatModal 
        isOpen={!!activeTicket}
        onClose={closeChat}
        ticket={activeTicket}
        replies={replies}
        replyText={replyText}
        setReplyText={() => {}} // Disabled
        attachment={attachment}
        setAttachment={() => {}} // Disabled
        onSend={(e) => { e.preventDefault(); alert("This thread is closed and read-only."); }}
        chatLoading={chatLoading}
        role="Customer"
        isReadOnly={true} // If your ChatModal supports a read-only prop
      />
    </div>
  );
};

export default ArchiveDashboard;