import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ticketService from '../services/ticketService';
import Sidebar from './stitch/Sidebar';
import Header from './stitch/Header';
import TicketModal from './stitch/TicketModal';
import ChatModal from './stitch/ChatModal';
import DeleteConfirmModal from './stitch/DeleteConfirmModal';
import Fuse from 'fuse.js';
import socket from '../utils/socket';

const Dashboard = () => {
  const navigate = useNavigate();

  // Core Data States
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form State for Ticket Creation (Priority removed)
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: ''
  });
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  
  // Filter & Search States
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Chat/Thread States
  const [activeTicket, setActiveTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    const userId = sessionStorage.getItem('userId');
    fetchTickets();

    // Register this user with the socket server for targeted events
    const onConnect = () => {
      if (userId) socket.emit('register_user', userId);
    };
    if (socket.connected) onConnect();
    socket.on('connect', onConnect);

    // --- LIVE UPDATERS ---
    // When an agent updates a ticket (status change, priority, etc.) update it in our list
    const handleTicketUpdate = (updatedTicket) => {
      setTickets(prev => prev.map(t => t._id === updatedTicket._id ? updatedTicket : t));
      // If this ticket is currently open in the chat modal, refresh it too
      setActiveTicket(prev => prev && prev._id === updatedTicket._id ? updatedTicket : prev);
    };

    // When a ticket is deleted by the customer or an admin, remove it from the list
    const handleTicketDelete = ({ id }) => {
      setTickets(prev => prev.filter(t => t._id !== id));
      setActiveTicket(prev => prev && prev._id === id ? null : prev);
    };

    // When an agent replies, refresh the open chat thread automatically
    const handleAgentReplied = (ticketId) => {
      setActiveTicket(prev => {
        if (prev && prev._id === ticketId) {
          ticketService.getReplies(ticketId).then(data => setReplies(data)).catch(() => {});
        }
        return prev;
      });
    };

    socket.on('ticket_updated', handleTicketUpdate);
    socket.on('ticket_resolved', handleTicketUpdate);
    socket.on('ticket_deleted', handleTicketDelete);
    socket.on('agent_replied', handleAgentReplied);

    return () => {
      socket.off('connect', onConnect);
      socket.off('ticket_updated', handleTicketUpdate);
      socket.off('ticket_resolved', handleTicketUpdate);
      socket.off('ticket_deleted', handleTicketDelete);
      socket.off('agent_replied', handleAgentReplied);
    };
  }, []);

const fetchTickets = async () => { // Or whatever your fetch function is named
    setLoading(true);
    try {
      const data = await ticketService.getTickets(); // Or getMyTickets()
      
      // THE FIX: Safely extract the array from the backend response
      const safeArray = Array.isArray(data) ? data : (data?.tickets || data?.data || []);
      setTickets(safeArray);
      
    } catch (error) {
      console.error("Failed to load tickets", error);
      setTickets([]); // Fallback to an empty array
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.title || !newTicket.description) {
      setError('Required field validation failed: Title and Description are mandatory.');
      return;
    }

    try {
      setError('');
      const created = await ticketService.createTicket(newTicket);
      setTickets([created, ...tickets]); 
      setNewTicket({ title: '', description: '' }); // Priority removed from reset
      setIsTicketModalOpen(false);
      setSuccessMessage('Ticket recorded and initialized successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not write database record.');
    }
  };

const handleToggleStatus = async (id, currentStatus) => {
    // 1. Block interactions if already Closed
    if (currentStatus === 'Closed') {
        alert("This ticket is permanently closed. Please open a new ticket for further assistance.");
        return;
    }

    // 2. Strict Workflow Enforcement: Customers can only act if the Agent resolved it.
    if (currentStatus !== 'Resolved') {
        alert("This ticket is currently being worked on by our team. You can close it once an agent marks it as 'Resolved'.");
        return;
    }

    // 3. If we made it here, the ticket is 'Resolved', so clicking cycle officially 'Closes' it.
    try {
      const updated = await ticketService.updateTicket(id, { status: 'Closed' });
      setTickets(tickets.map((t) => (t._id === id ? updated : t)));
    } catch (err) {
      setError('Data state synchronization failure during status transition.');
    }
  };

  const promptDelete = (id) => {
    setTicketToDelete(id);
  };

  const cancelDelete = () => {
    setTicketToDelete(null);
  };

  const executeDelete = async () => {
    if (!ticketToDelete) return; 
    
    try {
      await ticketService.deleteTicket(ticketToDelete);
      setTickets(tickets.filter((t) => t._id !== ticketToDelete));
      setTicketToDelete(null); 
    } catch (err) {
      setError('Purge execution failed on database target.');
      setTicketToDelete(null); 
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

  const closeChat = () => {
    setActiveTicket(null);
    setReplies([]);
    setReplyText('');
    setAttachment(null);
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() && !attachment) return;
    
    try {
      const newReply = await ticketService.addReply(activeTicket._id, replyText, attachment);
      setReplies([...replies, newReply]); 
      setReplyText(''); 
      setAttachment(null);
    } catch (error) {
      console.error("Failed to send reply", error);
    }
  };

  // Dynamic Computing of Filters and Priority Sorting
  // This forces it into an array, preventing the crash!
// Dynamic Computing of Filters and Priority Sorting
  const getFilteredTickets = () => {
    const safeTickets = Array.isArray(tickets) ? tickets : [];
    
    let results = safeTickets.filter((ticket) => {
      if (ticket.status === 'Closed') return false;
      const matchesStatus = statusFilter === 'All' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'All' || (ticket.priority || 'Medium') === priorityFilter;
      return matchesStatus && matchesPriority;
    });

    if (searchQuery.trim()) {
      const fuse = new Fuse(results, {
        keys: [
          { name: 'title', weight: 0.7 },
          { name: 'description', weight: 0.3 },
          { name: '_id', weight: 0.1 }
        ],
        threshold: 0.3,
        ignoreLocation: true
      });
      results = fuse.search(searchQuery).map(result => result.item);
    }

    return results.sort((a, b) => {
      const priorityWeights = { 'Urgent': 1, 'High': 2, 'Medium': 3, 'Low': 4 };
      const weightA = priorityWeights[a.priority || 'Medium'];
      const weightB = priorityWeights[b.priority || 'Medium'];
      if (weightA !== weightB) return weightA - weightB;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  };

  const filteredTickets = getFilteredTickets();

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-error text-white font-black animate-pulse'; // Distinct UI for Urgent
      case 'High':
        return 'bg-red-500 text-white font-bold';
      case 'Low':
        return 'bg-secondary-fixed-dim text-on-secondary-fixed';
      default:
        return 'bg-tertiary-fixed text-on-tertiary-fixed';
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Open':
        return 'bg-error-container text-on-error-container';
      case 'Resolved':
        return 'bg-secondary-container text-on-secondary-container';
      case 'Closed':
        return 'bg-surface-container-high text-on-surface-variant';
      default: // In Progress
        return 'bg-surface-container-highest text-secondary';
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen">
      <Sidebar 
        role="Customer"
        userName="Customer Profile"
        userEmail="Online"
        onNewTicketClick={() => setIsTicketModalOpen(true)}
        onLogout={handleLogout}
        activeLink="Ticket Queue"
      />

      <main className="ml-64 min-h-screen flex flex-col">
        <Header 
          role="Customer"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="p-gutter flex-1 space-y-lg">
          {error && (
            <div className="bg-error-container text-on-error-container p-md rounded-xl text-body-md border border-error/20">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="bg-secondary-container text-on-secondary-container p-md rounded-xl text-body-md border border-secondary/20">
              {successMessage}
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
            <div>
              <h3 className="font-headline-lg text-headline-lg mb-xs">Ticket Queue</h3>
              <p className="text-on-surface-variant">Manage and triage your logged support requests in real-time.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-sm">
              <div className="flex bg-surface-container rounded-lg p-xs border border-outline-variant">
                {['All', 'Open', 'In Progress', 'Resolved', 'Closed'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-md py-xs text-label-md rounded transition-all cursor-pointer ${
                      statusFilter === status
                        ? 'bg-surface-container-lowest shadow-sm text-secondary font-bold'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="h-8 w-px bg-outline-variant mx-xs"></div>

              <div className="flex bg-surface-container rounded-lg p-xs border border-outline-variant">
                {/* Added Urgent to UI Filters */}
                {['All', 'Urgent', 'High', 'Medium', 'Low'].map((priority) => (
                  <button
                    key={priority}
                    onClick={() => setPriorityFilter(priority)}
                    className={`px-md py-xs text-label-md rounded transition-all flex items-center gap-xs cursor-pointer ${
                      priorityFilter === priority
                        ? 'bg-surface-container-lowest shadow-sm text-secondary font-bold'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {priority !== 'All' && (
                      <span className={`w-2 h-2 rounded-full ${
                        priority === 'Urgent' || priority === 'High' ? 'bg-error' : priority === 'Medium' ? 'bg-tertiary-fixed-dim' : 'bg-secondary-fixed-dim'
                      }`}></span>
                    )}
                    {priority === 'Medium' ? 'Med' : priority}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col shadow-sm">
            <div className="grid grid-cols-[100px_2.5fr_1fr_120px_120px_1.2fr_180px] gap-gutter bg-surface-container-low border-b border-outline-variant px-gutter py-md">
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider">ID</div>
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider">Subject & Preview</div>
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider">Customer</div>
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider text-center">Status</div>
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider text-center">Priority</div>
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider">Updated</div>
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider text-right">Actions</div>
            </div>

            <div className="divide-y divide-outline-variant overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 320px)' }}>
              {loading ? (
                <div className="p-xl text-center text-on-surface-variant">
                  Fetching tickets from cluster database...
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-xl text-center text-on-surface-variant">
                  No recorded incidents match the filter criteria.
                </div>
              ) : (
                filteredTickets.map((ticket) => (
                  <div 
                    key={ticket._id} 
                    className="grid grid-cols-[100px_2.5fr_1fr_120px_120px_1.2fr_180px] gap-gutter px-gutter py-md items-center hover:bg-surface-container-low transition-colors cursor-pointer group"
                    onClick={() => openChat(ticket)}
                  >
                    <div className="font-label-md text-on-surface-variant font-mono">
                      #{ticket._id.substring(ticket._id.length - 8)}
                    </div>
                    
                    <div className="min-w-0">
                      <p className="font-title-lg truncate mb-xs text-on-surface">
                        {ticket.category && <span className="text-xs mr-2 px-2 py-1 bg-surface-variant rounded-md text-on-surface-variant">{ticket.category.replace('_', ' ')}</span>}
                        {ticket.title}
                      </p>
                      <p className="font-body-md text-on-surface-variant truncate">{ticket.description}</p>
                    </div>

                    <div className="flex items-center gap-sm min-w-0">
                      <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center font-bold text-secondary flex-shrink-0">
                        C
                      </div>
                      <span className="truncate text-body-md">Me</span>
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
                      {formatTimeAgo(ticket.updatedAt || ticket.createdAt)}
                    </div>

                    <div 
                      className="flex justify-end gap-xs"
                      onClick={(e) => e.stopPropagation()} 
                    >
                      <button 
                        onClick={() => openChat(ticket)}
                        className="p-xs text-secondary hover:bg-secondary/10 rounded-xl transition-all cursor-pointer"
                        title="View Thread"
                      >
                        <span className="material-symbols-outlined text-[20px]">forum</span>
                      </button>
                      {/* Cycle Status Button - Only show if NOT closed */}
  {ticket.status !== 'Closed' && (
    <button 
      onClick={() => handleToggleStatus(ticket._id, ticket.status)}
      className="p-xs text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-all cursor-pointer"
      title="Cycle Status"
    >
      <span className="material-symbols-outlined text-[20px]">sync</span>
    </button>
  )}
                      <button 
                        onClick={() => promptDelete(ticket._id)}
                        className="p-xs text-error hover:bg-error/10 rounded-xl transition-all cursor-pointer"
                        title="Purge"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-surface-container px-gutter py-sm border-t border-outline-variant flex items-center justify-between flex-shrink-0">
              <p className="font-label-sm text-on-surface-variant">
                Showing {filteredTickets.length} of {tickets.length} tickets
              </p>
            </div>
          </div>
        </div>
      </main>

      <TicketModal 
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        onSubmit={handleCreateTicket}
        newTicket={newTicket}
        setNewTicket={setNewTicket}
        error={error}
      />

      <ChatModal 
        isOpen={!!activeTicket}
        onClose={closeChat}
        ticket={activeTicket}
        replies={replies}
        replyText={replyText}
        setReplyText={setReplyText}
        attachment={attachment}
        setAttachment={setAttachment}
        onSend={handleSendReply}
        chatLoading={chatLoading}
        role="Customer"
      />

      <DeleteConfirmModal 
        isOpen={!!ticketToDelete}
        onClose={cancelDelete}
        onConfirm={executeDelete}
        role="Customer"
      />
    </div>
  );
};

export default Dashboard;