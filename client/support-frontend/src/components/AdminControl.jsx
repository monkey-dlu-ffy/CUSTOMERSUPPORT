import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import ticketService from '../services/ticketService';
import Sidebar from './stitch/Sidebar';
import Header from './stitch/Header';
import ChatModal from './stitch/ChatModal';
import DeleteConfirmModal from './stitch/DeleteConfirmModal';
import Fuse from 'fuse.js';
import AssignModal from './stitch/AssignModal';
import socket from '../utils/socket';

const AdminControl = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [agents, setAgents] = useState([]);
  const [ticketToAssign, setTicketToAssign] = useState(null);

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

  // --- Chart Data States ---
  const [kpiStats, setKpiStats] = useState({ total: 0, unassigned: 0, urgent: 0, resolved: 0 });
  const [statusData, setStatusData] = useState([]);
  const [priorityData, setPriorityData] = useState([]);

  // Chart Colors
  const STATUS_COLORS = { 'Open': '#ef4444', 'In Progress': '#f59e0b', 'Resolved': '#10b981', 'Closed': '#64748b' };
  const PRIORITY_COLORS = { 'Urgent': '#b91c1c', 'High': '#ef4444', 'Medium': '#f59e0b', 'Low': '#3b82f6' };

  // The Bouncer & Initial Data Load
  useEffect(() => {
    const role = sessionStorage.getItem('userRole');
    const userId = sessionStorage.getItem('userId');

    if (role !== 'Admin') {
      navigate('/dashboard'); 
    } else {
      fetchGlobalTickets();
      fetchAgents();
    }

    // Register admin user with socket server
    const onConnect = () => {
      if (userId) socket.emit('register_user', userId);
    };
    if (socket.connected) onConnect();
    socket.on('connect', onConnect);

    // --- LIVE UPDATERS ---
    const handleNewTicket = (newTicket) => {
      setTickets(prev => {
        if (prev.some(t => t._id === newTicket._id)) return prev;
        return [newTicket, ...prev];
      });
    };

    const handleTicketUpdate = (updatedTicket) => {
      setTickets(prev => prev.map(t => t._id === updatedTicket._id ? updatedTicket : t));
      setActiveTicket(prev => prev && prev._id === updatedTicket._id ? updatedTicket : prev);
    };

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
      socket.off('connect', onConnect);
      socket.off('new_ticket_created', handleNewTicket);
      socket.off('ticket_updated',     handleTicketUpdate);
      socket.off('ticket_assigned',    handleTicketUpdate);
      socket.off('ticket_resolved',    handleTicketUpdate);
      socket.off('ticket_urgent',      handleTicketUpdate);
      socket.off('ticket_deleted',     handleTicketDelete);
    };
  }, [navigate]);

  // Reactive Charts: Update visualizations instantly when `tickets` state changes
  useEffect(() => {
    if (!tickets.length) return;

    setKpiStats({
      total: tickets.length,
      unassigned: tickets.filter(t => !t.assignedTo && t.status !== 'Closed').length,
      urgent: tickets.filter(t => t.priority === 'Urgent' && t.status !== 'Closed').length,
      resolved: tickets.filter(t => t.status === 'Resolved').length
    });

    const statusCounts = tickets.reduce((acc, ticket) => {
      const status = ticket.status || 'Open';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    setStatusData(Object.keys(statusCounts).map(key => ({ name: key, value: statusCounts[key] })));

    const priorityCounts = tickets.reduce((acc, ticket) => {
      if (ticket.status !== 'Closed' && ticket.status !== 'Resolved') {
          const priority = ticket.priority || 'Medium';
          acc[priority] = (acc[priority] || 0) + 1;
      }
      return acc;
    }, { 'Urgent': 0, 'High': 0, 'Medium': 0, 'Low': 0 });
    setPriorityData(Object.keys(priorityCounts).map(key => ({ name: key, Active: priorityCounts[key] })));

  }, [tickets]);

const fetchGlobalTickets = async () => {
    setLoading(true);
    try {
      const data = await ticketService.getTickets();
      
      // THE FIX: Check if data is an array. If not, look inside it for the array.
      const safeArray = Array.isArray(data) ? data : (data?.tickets || data?.data || []);
      
      setTickets(safeArray);
    } catch (error) {
      console.error("Failed to sync global cluster data", error);
      setTickets([]); // Fallback to an empty array so .filter() doesn't crash on error
    } finally {
      setLoading(false);
    }
  };

const fetchAgents = async () => {
    try {
      const data = await ticketService.getAgents();
      setAgents(data);
    } catch (error) {
      console.error("Failed to load agents list", error);
    }
  };

  // --- Status Handler ---
  const handleToggleStatus = async (id, currentStatus) => {
    const statusWorkflow = {
      'Open': 'In Progress',
      'In Progress': 'Resolved',
      'Resolved': 'Closed',
      'Closed': 'Open'
    };
    const nextStatus = statusWorkflow[currentStatus] || 'Open';
    
    try {
      const updated = await ticketService.updateTicket(id, { status: nextStatus });
      setTickets(tickets.map((t) => (t._id === id ? updated : t)));
    } catch (err) {
      console.error('Data state synchronization failure during status transition.');
    }
  };
  const executeAssign = async (ticketId, agentId) => {
    try {
      // Re-use your existing updateTicket logic!
      const updated = await ticketService.updateTicket(ticketId, { 
        assignedTo: agentId,
        status: 'In Progress' // Usually, assigning a ticket moves it to In Progress
      });
      setTickets(tickets.map((t) => (t._id === ticketId ? updated : t)));
      setTicketToAssign(null); // Close the modal
    } catch (err) {
      console.error('Failed to assign ticket.');
    }
  };

  // --- Deletion Handlers ---
  const promptDelete = (id) => setTicketToDelete(id);
  const cancelDelete = () => setTicketToDelete(null);

  const executeDelete = async () => {
    if (!ticketToDelete) return;
    try {
      await ticketService.deleteTicket(ticketToDelete);
      setTickets(tickets.filter((t) => t._id !== ticketToDelete));
      setTicketToDelete(null); 
    } catch (err) {
      console.error('Purge execution failed.');
      setTicketToDelete(null);
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
      case 'Urgent': return 'bg-error text-white font-black animate-pulse';
      case 'High': return 'bg-red-500 text-white font-bold';
      case 'Low': return 'bg-secondary-fixed-dim text-on-secondary-fixed';
      default: return 'bg-tertiary-fixed text-on-tertiary-fixed';
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Open': return 'bg-error-container text-on-error-container';
      case 'Resolved': return 'bg-secondary-container text-on-secondary-container';
      case 'Closed': return 'bg-surface-container-high text-on-surface-variant';
      default: return 'bg-surface-container-highest text-secondary';
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen">
      <Sidebar 
        role="Admin"
        userName="Admin Profile"
        userEmail="Online"
        onLogout={handleLogout}
        activeLink="Admin Control"
      />

      <main className="ml-64 min-h-screen flex flex-col bg-surface-container-lowest">
        <Header 
          role="Admin"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="p-gutter flex-1 space-y-lg overflow-y-auto custom-scrollbar">
          
          {/* SECTION 1: Metrics & Visualizations */}
          <div>
            <h2 className="font-headline-lg text-headline-lg font-bold text-slate-900 mb-xs">
  Command Center
</h2>
            <p className="text-on-surface-variant mb-md">High-level overview of support queue health and workload.</p>
            
            {loading ? (
              <div className="p-xl text-center text-on-surface-variant animate-pulse">
                Crunching numbers and generating charts...
              </div>
            ) : (
              <div className="space-y-md">
                {/* Row 1: KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
                  <KPICard title="Total Tickets" value={kpiStats.total} icon="confirmation_number" color="text-primary" />
                  <KPICard title="Unassigned (Active)" value={kpiStats.unassigned} icon="person_off" color="text-error" />
                  <KPICard title="Urgent Action Needed" value={kpiStats.urgent} icon="warning" color="text-red-500" />
                  <KPICard title="Awaiting Closure" value={kpiStats.resolved} icon="task_alt" color="text-secondary" />
                </div>

                {/* Row 2: Recharts Visualizations */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
                  {/* Status Pie Chart */}
                  <div className="bg-surface-container rounded-xl border border-outline-variant p-md flex flex-col shadow-sm h-80">
                    <h3 className="font-title-lg mb-sm text-center">Ticket Status Distribution</h3>
                    <div className="flex-1 w-full min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#8884d8'} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Priority Bar Chart */}
                  <div className="bg-surface-container rounded-xl border border-outline-variant p-md flex flex-col shadow-sm h-80">
                    <h3 className="font-title-lg mb-sm text-center">Active Workload by Priority</h3>
                    <div className="flex-1 w-full min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={priorityData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                          <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                          <Bar dataKey="Active" radius={[4, 4, 0, 0]}>
                            {priorityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || '#8884d8'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <hr className="border-outline-variant" />

          {/* SECTION 2: Original Ticket Master List */}
          <div className="space-y-md">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
              <div>
                <h3 className="font-headline-lg text-headline-lg mb-xs">Global Ticket Master List</h3>
                <p className="text-on-surface-variant">Global multi-tenant incident management console.</p>
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
              <div className="grid grid-cols-[100px_2.5fr_1fr_120px_120px_1.2fr_180px] gap-gutter bg-surface-container-low border-b border-outline-variant px-gutter py-md">
                <div className="font-label-md text-on-surface-variant uppercase tracking-wider">ID</div>
                <div className="font-label-md text-on-surface-variant uppercase tracking-wider">Subject & Preview</div>
                <div className="font-label-md text-on-surface-variant uppercase tracking-wider">Assignment</div>
                <div className="font-label-md text-on-surface-variant uppercase tracking-wider text-center">Status</div>
                <div className="font-label-md text-on-surface-variant uppercase tracking-wider text-center">Priority</div>
                <div className="font-label-md text-on-surface-variant uppercase tracking-wider">Updated</div>
                <div className="font-label-md text-on-surface-variant uppercase tracking-wider text-right">Actions</div>
              </div>
              

              <div className="divide-y divide-outline-variant max-h-[500px] overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="p-xl text-center text-on-surface-variant">
                    Establishing secure connection to Atlas cluster...
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="p-xl text-center text-on-surface-variant">
                    No active system tickets match criteria.
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
                        <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center font-bold text-secondary flex-shrink-0">
                          {ticket.assignedTo ? 'A' : 'U'}
                        </div>
                        <span className="truncate text-body-md">
                          {ticket.assignedTo ? 'Assigned' : 'Unassigned'}
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
                        <button 
                          onClick={() => openChat(ticket)}
                          className="p-xs text-secondary hover:bg-secondary/10 rounded-xl transition-all cursor-pointer"
                          title="View Thread"
                        >
                          {/* NEW Assign Button */}
  <button 
    onClick={() => setTicketToAssign(ticket)}
    className="p-xs text-primary hover:bg-primary/10 rounded-xl transition-all cursor-pointer"
    title="Assign to Agent"
  >
    <span className="material-symbols-outlined text-[20px]">person_check</span>
  </button>
  
  {/* Existing View Thread Button... */}
                          <span className="material-symbols-outlined text-[20px]">forum</span>
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(ticket._id, ticket.status)}
                          className="p-xs text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-all cursor-pointer"
                          title="Cycle Status"
                        >
                          <span className="material-symbols-outlined text-[20px]">sync</span>
                        </button>
                        <button 
                          onClick={() => promptDelete(ticket._id)}
                          className="p-xs text-error hover:bg-error/10 rounded-xl transition-all cursor-pointer"
                          title="Override Purge"
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
        </div>
      </main>

      {/* Modals */}
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
        role="Admin"
      />
      <AssignModal 
        isOpen={!!ticketToAssign}
        onClose={() => setTicketToAssign(null)}
        onAssign={executeAssign}
        ticket={ticketToAssign}
        agents={agents}
      />

      <DeleteConfirmModal 
        isOpen={!!ticketToDelete}
        onClose={cancelDelete}
        onConfirm={executeDelete}
        role="Admin"
      />
    </div>
  );
};

// Sub-component for clean KPI rendering
const KPICard = ({ title, value, icon, color }) => (
  <div className="bg-surface-container rounded-xl border border-outline-variant p-lg flex items-center gap-md shadow-sm transition-transform hover:-translate-y-1">
    <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-surface-container-highest ${color}`}>
      <span className="material-symbols-outlined text-[28px]">{icon}</span>
    </div>
    <div>
      <p className="text-on-surface-variant font-label-md mb-xs">{title}</p>
      <p className="font-headline-lg font-bold">{value}</p>
    </div>
  </div>
);

export default AdminControl;