import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ticketService from '../services/ticketService';
import Sidebar from './stitch/Sidebar';
import Header from './stitch/Header';
import ChatModal from './stitch/ChatModal';

export default function Archive() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dynamic User State
  const [userRole, setUserRole] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');

  // Chat State
  const [activeTicket, setActiveTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    const role = sessionStorage.getItem('userRole');
    const name = sessionStorage.getItem('userName'); // Assuming you store this during login
    const email = sessionStorage.getItem('userEmail'); // Assuming you store this during login
    
    if (!role) {
      navigate('/login', { replace: true });
    } else {
      setUserRole(role);
      // Fallbacks just in case they aren't in sessionStorage yet
      setUserName(name || 'Workspace User');
      setUserEmail(email || 'Online');
      fetchArchive();
    }
  }, [navigate]);

 const fetchArchive = async () => {
    setLoading(true);
    try {
      const data = await ticketService.getTickets();
      const safeArray = Array.isArray(data) ? data : (data?.tickets || data?.data || []);
      setTickets(safeArray);
    } catch (error) {
      console.error("Failed to fetch archive", error);
      setTickets([]); 
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login', { replace: true });
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

  // THE FIX: Enforce 'Closed' or 'Resolved' status so active tickets don't leak into the archive
  const filteredTickets = tickets.filter(t => {
    const isArchived = t.status === 'Closed' || t.status === 'Resolved';
    const matchesSearch = !searchQuery || 
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t._id?.toLowerCase().includes(searchQuery.toLowerCase());
      
    return isArchived && matchesSearch;
  }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen flex">
      <Sidebar 
        role={userRole}
        userName={userName}
        userEmail={userEmail}
        onLogout={handleLogout}
        activeLink="Previous Queries" 
      />

      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <Header 
          role={userRole}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="p-gutter flex-1 space-y-lg">
          <div>
            <h3 className="font-headline-lg text-headline-lg mb-xs">Previous Queries</h3>
            <p className="text-on-surface-variant">View historical and closed tickets.</p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm">
             <div className="grid grid-cols-[100px_3fr_120px_1.5fr] gap-gutter bg-surface-container-low border-b border-outline-variant px-gutter py-md">
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider">ID</div>
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider">Subject</div>
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider text-center">Status</div>
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider text-right">Closed On</div>
            </div>

            <div className="divide-y divide-outline-variant">
              {loading ? (
                <div className="p-xl text-center text-on-surface-variant">Loading archive...</div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-xl text-center text-on-surface-variant">No closed tickets found.</div>
              ) : (
                filteredTickets.map(ticket => (
                  <div 
                    key={ticket._id} 
                    onClick={() => openChat(ticket)}
                    className="grid grid-cols-[100px_3fr_120px_1.5fr] gap-gutter px-gutter py-md items-center hover:bg-surface-container-low transition-colors cursor-pointer"
                  >
                    <div className="font-label-md text-on-surface-variant font-mono">
                      #{ticket._id.substring(ticket._id.length - 8)}
                    </div>
                    <div className="font-title-md truncate">{ticket.title}</div>
                    <div className="flex justify-center">
                      <span className="px-md py-xs rounded-full text-label-sm font-bold bg-surface-container-high text-on-surface-variant">
                        {ticket.status}
                      </span>
                    </div>
                    <div className="text-right text-on-surface-variant font-label-md">
                      {new Date(ticket.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Read-Only Chat Modal */}
      <ChatModal 
        isOpen={!!activeTicket}
        onClose={() => { setActiveTicket(null); setReplies([]); }}
        ticket={activeTicket}
        replies={replies}
        replyText=""
        setReplyText={() => {}} 
        attachment={null}
        setAttachment={() => {}} 
        onSend={(e) => e.preventDefault()} 
        chatLoading={chatLoading}
        role={userRole}
      />
    </div>
  );
}