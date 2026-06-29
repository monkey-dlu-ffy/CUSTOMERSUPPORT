import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ticketService from '../services/ticketService';
import Sidebar from './stitch/Sidebar';
import Header from './stitch/Header';
import ChatModal from './stitch/ChatModal';
import Fuse from 'fuse.js';
import socket from '../utils/socket';

const AgentDashboard = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [myUserId, setMyUserId] = useState('');

  // Filter & Search States
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // --- Chat State ---
  const [activeTicket, setActiveTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [attachment, setAttachment] = useState(null); 
  const [chatLoading, setChatLoading] = useState(false);

  // --- Initial Data Load ---
// --- Initial Data Load & Socket Registration ---
  useEffect(() => {
    const role = sessionStorage.getItem('userRole');
    const userId = sessionStorage.getItem('userId');

    // 1. Guard: Redirect if not authorized
    if (role !== 'Agent' && role !== 'Admin') {
      navigate('/dashboard');
      return;
    }

    setUserRole(role);
    setMyUserId(userId || '');
    fetchQueue();

    // 2. Bulletproof Socket Registration
    const onConnect = () => {
      console.log("Socket connected! Registering user:", userId);
      if (userId) {
        socket.emit('register_user', userId);
      }
    };

    if (socket.connected) {
      onConnect();
    }
    
    socket.on('connect', onConnect);

    return () => {
      socket.off('connect', onConnect);
    };
  }, [navigate]);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const data = await ticketService.getTickets();
      // Safely extract the array
      const safeArray = Array.isArray(data) ? data : (data?.tickets || data?.data || []);
      setTickets(safeArray);
    } catch (error) {
      console.error("Failed to sync queue data", error);
      setTickets([]); // Fallback
    } finally {
      setLoading(false);
    }
  };

  // --- LIVE UI UPDATERS ---
  useEffect(() => {
    // 1. When a new ticket is created by a customer, inject it at the top of the queue
    const handleNewTicket = (newTicket) => {
      setTickets(prev => {
        // Guard against duplicates
        if (prev.some(t => t._id === newTicket._id)) return prev;
        return [newTicket, ...prev];
      });
    };

    // 2. When any ticket is updated (status, priority, assignment), swap it in-place
    const handleTicketUpdate = (updatedTicket) => {
      setTickets(prev => prev.map(t => t._id === updatedTicket._id ? updatedTicket : t));
      // Also update the currently open chat modal if it's the same ticket
      setActiveTicket(prev => prev && prev._id === updatedTicket._id ? updatedTicket : prev);
    };

    // 3. When a ticket is deleted, remove it from the list
    const handleTicketDelete = ({ id }) => {
      setTickets(prev => prev.filter(t => t._id !== id));
      setActiveTicket(prev => prev && prev._id === id ? null : prev);
    };

    socket.on('new_ticket_created', handleNewTicket);
    socket.on('ticket_updated',     handleTicketUpdate);
    socket.on('ticket_assigned',    handleTicketUpdate);
    socket.on('ticket_resolved',    handleTicketUpdate);
    socket.on('ticket_urgent',      handleTicketUpdate);
    socket.on('ticket_deleted',     handleTicketDelete);

    return () => {
      socket.off('new_ticket_created', handleNewTicket);
      socket.off('ticket_updated',     handleTicketUpdate);
      socket.off('ticket_assigned',    handleTicketUpdate);
      socket.off('ticket_resolved',    handleTicketUpdate);
      socket.off('ticket_urgent',      handleTicketUpdate);
      socket.off('ticket_deleted',     handleTicketDelete);
    };
  }, []);
  // -----------------------------

  // --- Dashboard Handlers ---
  const handleToggleStatus = async (id, currentStatus) => {
    if (currentStatus === 'Closed' || currentStatus === 'Resolved') {
        alert("This ticket is pending customer approval or is already closed.");
        return;
    }

    const statusWorkflow = {
      'Open': 'In Progress',
      'In Progress': 'Resolved'
    };
    
    const nextStatus = statusWorkflow[currentStatus] || 'Open';
    
    try {
      const updated = await ticketService.updateTicket(id, { status: nextStatus });
      setTickets(tickets.map((t) => (t._id === id ? updated : t)));
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleClaimTicket = async (ticketId) => {
    try {
      const activeUserId = sessionStorage.getItem('userId'); 
      if (!activeUserId) {
        alert("Error: User ID not found in local storage. Please log out and back in.");
        return;
      }
      
      const updated = await ticketService.updateTicket(ticketId, { 
        assignedTo: activeUserId,
        status: 'In Progress' 
      });
      
      setTickets(tickets.map((t) => (t._id === ticketId ? updated : t)));
    } catch (err) {
      console.error('Failed to claim ticket', err);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login', { replace: true });
  };

  // --- Chat Handlers ---
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
  const getFilteredTickets = () => {
    let results = tickets.filter((ticket) => {
      if (statusFilter === 'All' && ticket.status === 'Closed') return false; 
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
      const weightA = priorityWeights[a.priority] || 3; 
      const weightB = priorityWeights[b.priority] || 3; 
      
      if (weightA !== weightB) {
        return weightA - weightB;
      }
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
        return 'bg-error text-white font-black animate-pulse';
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
      default: 
        return 'bg-surface-container-highest text-secondary';
    }
  };

  const getClaimantDisplay = (assignedTo) => {
    if (!assignedTo) return 'Unassigned';
    return assignedTo === myUserId ? 'Me' : 'Assigned';
  };

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen">
      {/* SideNavBar Shell */}
      <Sidebar 
        role={userRole || 'Agent'}
        userName="Agent Profile"
        userEmail="Online"
        onLogout={handleLogout}
        activeLink="Ticket Queue"
      />

      {/* Main Content Area */}
      <main className="ml-64 min-h-screen flex flex-col">
        {/* TopNavBar Shell */}
        <Header 
          role={userRole || 'Agent'}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Canvas */}
        <div className="p-gutter flex-1 space-y-lg">
          {/* Quick Stats & Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
            <div>
              <h3 className="font-headline-lg text-headline-lg mb-xs">Active Support Queue</h3>
              <p className="text-on-surface-variant">Manage and claim incoming tenant incidents.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-sm">
              {/* Status Smart Filters */}
              <div className="flex bg-surface-container rounded-lg p-xs border border-outline-variant">
                {['All', 'Open', 'In Progress', 'Resolved'].map((status) => (
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

              {/* Priority Filters */}
              <div className="flex bg-surface-container rounded-lg p-xs border border-outline-variant">
                {['All','Urgent', 'High', 'Medium', 'Low'].map((priority) => (
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
                        priority === 'High' ? 'bg-error' : priority === 'Medium' ? 'bg-tertiary-fixed-dim' : 'bg-secondary-fixed-dim'
                      }`}></span>
                    )}
                    {priority === 'Medium' ? 'Med' : priority}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* High Density Queue Table */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col shadow-sm">
            {/* Table Header */}
            <div className="grid grid-cols-[100px_2.5fr_1fr_120px_120px_1.2fr_180px] gap-gutter bg-surface-container-low border-b border-outline-variant px-gutter py-md">
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider">ID</div>
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider">Subject & Preview</div>
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider">Assignment</div>
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider text-center">Status</div>
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider text-center">Priority</div>
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider">Updated</div>
              <div className="font-label-md text-on-surface-variant uppercase tracking-wider text-right">Actions</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-outline-variant overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 320px)' }}>
              {loading ? (
                <div className="p-xl text-center text-on-surface-variant">
                  Syncing with active queue...
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-xl text-center text-on-surface-variant">
                  Queue is currently empty matching criteria.
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
                      <p className="font-title-lg truncate mb-xs text-on-surface">{ticket.title}</p>
                      <p className="font-body-md text-on-surface-variant truncate">{ticket.description}</p>
                    </div>

                    <div className="flex items-center gap-sm min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                        ticket.assignedTo ? 'bg-secondary-fixed text-secondary' : 'bg-surface-variant text-on-surface-variant'
                      }`}>
                        {ticket.assignedTo ? 'A' : 'U'}
                      </div>
                      <span className={`truncate text-body-md ${ticket.assignedTo === myUserId ? 'font-bold text-secondary' : ''}`}>
                        {getClaimantDisplay(ticket.assignedTo)}
                      </span>
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
                      {/* Claim Button */}
                      {!ticket.assignedTo && (
                        <button 
                          onClick={() => handleClaimTicket(ticket._id)}
                          className="p-xs text-secondary hover:bg-secondary/10 rounded-xl transition-all cursor-pointer"
                          title="Claim Ticket"
                        >
                          <span className="material-symbols-outlined text-[20px]">person_add</span>
                        </button>
                      )}

                      <button 
                        onClick={() => openChat(ticket)}
                        className="p-xs text-secondary hover:bg-secondary/10 rounded-xl transition-all cursor-pointer"
                        title="View Thread"
                      >
                        <span className="material-symbols-outlined text-[20px]">forum</span>
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(ticket._id, ticket.status)}
                        className="p-xs text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-all cursor-pointer"
                        title="Cycle Status"
                      >
                        <span className="material-symbols-outlined text-[20px]">sync</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Table Footer */}
            <div className="bg-surface-container px-gutter py-sm border-t border-outline-variant flex items-center justify-between flex-shrink-0">
              <p className="font-label-sm text-on-surface-variant">
                Showing {filteredTickets.length} of {tickets.length} tickets
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Live Chat Thread Modal */}
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
        role={userRole}
        fetchReplies={() => openChat(activeTicket)}
      />
    </div>
  );
};

export default AgentDashboard;