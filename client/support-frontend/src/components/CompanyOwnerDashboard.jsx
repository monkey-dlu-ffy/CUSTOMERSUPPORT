import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ticketService from '../services/ticketService';
import Sidebar from './stitch/Sidebar';
import Header from './stitch/Header';
import ChatModal from './stitch/ChatModal';
import AssignModal from './stitch/AssignModal';
import authService from '../services/authService';
import Fuse from 'fuse.js';
import socket from '../utils/socket';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend 
} from 'recharts';
const API_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");
const CompanyOwnerDashboard = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // View Control
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets', 'team', or 'customers'
  
  // Modals & Chat
  const [activeTicket, setActiveTicket] = useState(null);
  const [ticketToAssign, setTicketToAssign] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract Company Domain from the logged-in owner's email
  const ownerEmail = sessionStorage.getItem('userEmail') || '';
  const companyDomain = ownerEmail.includes('@') ? ownerEmail.split('@')[1] : 'company.com';

  // Hire Agent State
  const [isHireModalOpen, setIsHireModalOpen] = useState(false);
  const [agentUsername, setAgentUsername] = useState(''); // Added to control the username input
  const [newAgent, setNewAgent] = useState({ name: '', email: '', password: '' });
  const [hireError, setHireError] = useState('');
  const [hireLoading, setHireLoading] = useState(false);

  // Customer State
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const role = sessionStorage.getItem('userRole');
    if (role !== 'Company_Owner') {
      navigate('/login', { replace: true });
    } else {
      fetchOrgData();
    }
  }, [navigate]);

  const fetchOrgData = async () => {
    setLoading(true);
    try {
      const [ticketsData, agentsData, customersData] = await Promise.all([
        ticketService.getTickets(),
        ticketService.getAgents(),
        authService.getCustomers()
      ]);
      
      setTickets(Array.isArray(ticketsData) ? ticketsData : (ticketsData?.data || []));
      setAgents(Array.isArray(agentsData) ? agentsData : (agentsData?.data || []));
      setCustomers(Array.isArray(customersData) ? customersData : (customersData?.data || []));
    } catch (error) {
      console.error("Failed to load organization data", error);
    } finally {
      setLoading(false);
    }
  };
  // --- LIVE UI UPDATERS ---
  useEffect(() => {
    const userId = sessionStorage.getItem('userId');

    // Register company owner with socket server for targeted events
    const onConnect = () => {
      if (userId) socket.emit('register_user', userId);
    };
    if (socket.connected) onConnect();
    socket.on('connect', onConnect);

    // When a new ticket is created by a customer, inject it at the top
    const handleNewTicket = (newTicket) => {
      setTickets(prev => {
        if (prev.some(t => t._id === newTicket._id)) return prev;
        return [newTicket, ...prev];
      });
    };

    // When any ticket is updated (status, priority, assignment), swap it in-place
    const handleTicketUpdate = (updatedTicket) => {
      setTickets(prev => prev.map(t => t._id === updatedTicket._id ? updatedTicket : t));
    };

    // When a ticket is deleted, remove it from the list
    const handleTicketDelete = ({ id }) => {
      setTickets(prev => prev.filter(t => t._id !== id));
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
  }, []);

  const executeAssign = async (ticketId, agentId) => {
    try {
      const updated = await ticketService.updateTicket(ticketId, { 
        assignedTo: agentId,
        status: 'In Progress' 
      });
      setTickets(tickets.map((t) => (t._id === ticketId ? updated : t)));
      setTicketToAssign(null);
    } catch (err) {
      console.error('Failed to assign ticket.');
    }
  };

  const handleHireAgent = async (e) => {
    e.preventDefault();
    setHireError('');
    setHireLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/auth/create-agent`,
        newAgent,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setAgents([...agents, response.data.agent]);
      setIsHireModalOpen(false);
      setNewAgent({ name: '', email: '', password: '' });
      setAgentUsername(''); // Reset the username field
    } catch (err) {
      setHireError(err.response?.data?.message || 'Failed to create agent account.');
    } finally {
      setHireLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login', { replace: true });
  };

  const openChat = async (ticket) => {
    setActiveTicket(ticket);
    try {
      const data = await ticketService.getReplies(ticket._id);
      setReplies(data);
    } catch (error) {
      console.error("Failed to load thread", error);
    }
  };

  const closeChat = () => {
    setActiveTicket(null);
    setReplies([]);
    setReplyText('');
  };

  const getFilteredTickets = () => {
    let results = tickets.filter((t) => statusFilter === 'All' || t.status === statusFilter);
    if (searchQuery.trim()) {
      const fuse = new Fuse(results, { keys: ['title', 'description', '_id'], threshold: 0.3 });
      results = fuse.search(searchQuery).map(res => res.item);
    }
    return results;
  };

  const filteredTickets = getFilteredTickets();

  // --- CHART & METRIC CALCULATIONS ---
  const totalTickets = tickets.length;
  const unassignedTickets = tickets.filter(t => !t.assignedTo && t.status !== 'Closed').length;
  const urgentActionNeeded = tickets.filter(t => t.priority === 'Urgent' && t.status !== 'Closed').length;
  const awaitingClosure = tickets.filter(t => t.status === 'Resolved').length;

  // Pie Chart Data
  const statusCounts = tickets.reduce((acc, ticket) => {
    acc[ticket.status] = (acc[ticket.status] || 0) + 1;
    return acc;
  }, {});
  
  const statusData = Object.keys(statusCounts).map(key => ({
    name: key,
    value: statusCounts[key]
  }));

  const STATUS_COLORS = {
    'Open': '#3b82f6', 
    'In Progress': '#f59e0b', 
    'Resolved': '#10b981', 
    'Closed': '#6b7280'  
  };

  // Bar Chart Data
  const activeTickets = tickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved');
  const priorityCounts = activeTickets.reduce((acc, ticket) => {
    let p = ticket.priority || 'Medium'; 
    if (p === 'Normal') p = 'Medium'; 
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, { Low: 0, Medium: 0, High: 0, Urgent: 0 }); 

  const priorityData = Object.keys(priorityCounts).map(key => ({
    name: key,
    Tickets: priorityCounts[key]
  }));

  const PRIORITY_COLORS = {
    'Low': '#22c55e',     // Green
    'Medium': '#eab308',  // Yellow
    'High': '#f97316',    // Orange
    'Urgent': '#ef4444'   // Red
  };

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen">
      
      <style>{`
        @keyframes urgentBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .animate-urgent-blink {
          animation: urgentBlink 1.2s ease-in-out infinite;
        }
      `}</style>

      <Sidebar 
        role="Company_Owner"
        userName="Company_Owner"
        onLogout={handleLogout}
        activeLink={activeTab === 'tickets' ? 'Workspace' : 'Team'}
      />

      <main className="ml-64 min-h-screen flex flex-col bg-surface-container-lowest">
        <Header role="Company_Owner" searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        <div className="p-gutter flex-1 space-y-lg overflow-y-auto custom-scrollbar">
          
          {/* --- TOP ROW: KPI CARDS --- */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
            <div className="bg-surface-container rounded-xl p-lg border border-outline-variant shadow-sm flex flex-col justify-between">
              <p className="text-on-surface-variant font-label-md uppercase tracking-wider">Total Tickets</p>
              <p className="font-headline-lg font-bold text-primary">{totalTickets}</p>
            </div>
            
            <div className="bg-surface-container rounded-xl p-lg border border-outline-variant shadow-sm flex flex-col justify-between">
              <p className="text-on-surface-variant font-label-md uppercase tracking-wider">Unassigned (Active)</p>
              <p className="font-headline-lg font-bold text-error">{unassignedTickets}</p>
            </div>
            
            <div className="bg-surface-container rounded-xl p-lg border border-outline-variant shadow-sm flex flex-col justify-between">
              <p className="text-on-surface-variant font-label-md uppercase tracking-wider">Urgent Action Needed</p>
              <p className={`font-headline-lg font-bold text-error-container-text ${urgentActionNeeded > 0 ? 'animate-urgent-blink text-error' : ''}`}>
                {urgentActionNeeded}
              </p>
            </div>
            
            <div className="bg-surface-container rounded-xl p-lg border border-outline-variant shadow-sm flex flex-col justify-between">
              <p className="text-on-surface-variant font-label-md uppercase tracking-wider">Awaiting Closure</p>
              <p className="font-headline-lg font-bold text-secondary">{awaitingClosure}</p>
            </div>
          </div>

          {/* --- SECOND ROW: GRAPHS --- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-xl">
            {/* Graph 1: Status Distribution */}
            <div className="bg-surface-container-lowest rounded-xl p-lg border border-outline-variant shadow-sm">
              <h4 className="font-title-md mb-md text-on-surface-variant">Ticket Status Distribution</h4>
              <div className="h-[300px] w-full">
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-on-surface-variant">No ticket data available</div>
                )}
              </div>
            </div>

            {/* Graph 2: Active Workload by Priority */}
            <div className="bg-surface-container-lowest rounded-xl p-lg border border-outline-variant shadow-sm">
              <h4 className="font-title-md mb-md text-on-surface-variant">Active Workload by Priority</h4>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                    <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="Tickets" radius={[4, 4, 0, 0]} barSize={40}>
                      {priorityData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={PRIORITY_COLORS[entry.name]} 
                          className={entry.name === 'Urgent' ? 'animate-urgent-blink' : ''} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Internal Navigation Tabs */}
          <div className="flex border-b border-outline-variant gap-lg">
            <button 
              onClick={() => setActiveTab('tickets')}
              className={`pb-sm font-title-md transition-colors ${activeTab === 'tickets' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Ticket Queue
            </button>
            <button 
              onClick={() => setActiveTab('team')}
              className={`pb-sm font-title-md transition-colors ${activeTab === 'team' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Team Management
            </button>
            <button
                onClick={() => setActiveTab('customers')}
                className={`pb-sm font-title-md transition-colors ${activeTab === 'customers' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Customer Management
            </button>
          </div>

          {/* VIEW 1: TICKETS */}
          {activeTab === 'tickets' && (
            <div className="space-y-md animate-fade-in">
              <div className="flex justify-between items-end">
                <h3 className="font-headline-lg text-headline-lg">Organization Tickets</h3>
                <div className="flex bg-surface-container rounded-lg p-xs border border-outline-variant">
                  {['All', 'Open', 'In Progress', 'Resolved', 'Closed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-md py-xs text-label-md rounded ${statusFilter === status ? 'bg-surface-container-lowest shadow-sm font-bold text-secondary' : 'text-on-surface-variant'}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-[100px_2fr_1fr_120px_150px] gap-gutter bg-surface-container-low border-b border-outline-variant px-gutter py-md">
                  <div className="font-label-md text-on-surface-variant uppercase">ID</div>
                  <div className="font-label-md text-on-surface-variant uppercase">Subject</div>
                  <div className="font-label-md text-on-surface-variant uppercase">Assigned Agent</div>
                  <div className="font-label-md text-on-surface-variant uppercase">Status</div>
                  <div className="font-label-md text-on-surface-variant uppercase text-right">Manage</div>
                </div>

                <div className="divide-y divide-outline-variant max-h-[500px] overflow-y-auto">
                  {loading ? (
                    <div className="p-xl text-center">Loading organization data...</div>
                  ) : filteredTickets.map((ticket) => (
                    <div key={ticket._id} className="grid grid-cols-[100px_2fr_1fr_120px_150px] gap-gutter px-gutter py-md items-center hover:bg-surface-container-low transition-colors">
                      <div className="font-mono text-sm">#{ticket._id.substring(ticket._id.length - 8)}</div>
                      <div className="truncate font-title-md">{ticket.title}</div>
                      <div className="text-body-md">
                        {ticket.assignedTo ? 'Assigned' : <span className="text-error font-bold">Unassigned</span>}
                      </div>
                      <div>
                        <span className="px-sm py-xs rounded-full text-xs font-bold bg-surface-variant">{ticket.status}</span>
                      </div>
                      <div className="flex justify-end gap-xs">
                        <button 
                          onClick={() => setTicketToAssign(ticket)}
                          className="p-xs text-primary hover:bg-primary/10 rounded-xl transition-all"
                          title="Assign to Agent"
                        >
                          <span className="material-symbols-outlined text-[20px]">person_check</span>
                        </button>
                        <button 
                          onClick={() => openChat(ticket)}
                          className="p-xs text-secondary hover:bg-secondary/10 rounded-xl transition-all"
                          title="View Thread"
                        >
                          <span className="material-symbols-outlined text-[20px]">forum</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: TEAM MANAGEMENT */}
          {activeTab === 'team' && (
            <div className="space-y-md animate-fade-in">
              <div className="flex justify-between items-end">
                <h3 className="font-headline-lg text-headline-lg">Active Agents</h3>
                <button 
                  onClick={() => setIsHireModalOpen(true)}
                  className="bg-primary text-on-primary px-md py-sm rounded-lg font-bold flex items-center gap-xs hover:bg-primary/90"
                >
                  <span className="material-symbols-outlined black">person_add</span>
                  Hire New Agent
                </button>
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-[1fr_1fr_1fr] gap-gutter bg-surface-container-low border-b border-outline-variant px-gutter py-md">
                  <div className="font-label-md text-on-surface-variant uppercase">Name</div>
                  <div className="font-label-md text-on-surface-variant uppercase">Email</div>
                  <div className="font-label-md text-on-surface-variant uppercase">Role</div>
                </div>
                <div className="divide-y divide-outline-variant">
                  {agents.length === 0 ? (
                    <div className="p-xl text-center text-on-surface-variant">No agents hired yet.</div>
                  ) : agents.map((agent) => (
                    <div key={agent._id} className="grid grid-cols-[1fr_1fr_1fr] gap-gutter px-gutter py-md items-center">
                      <div className="font-title-md">{agent.name}</div>
                      <div className="text-body-md text-on-surface-variant">{agent.email}</div>
                      <div><span className="px-sm py-xs bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold">{agent.role}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: CUSTOMER MANAGEMENT */}
          {activeTab === 'customers' && (
            <div className="space-y-md animate-fade-in">
              <div className="flex justify-between items-end">
                <h3 className="font-headline-lg text-headline-lg">
                  Customers
                </h3>
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-[1fr_1fr_120px] gap-gutter bg-surface-container-low border-b border-outline-variant px-gutter py-md">
                  <div className="font-label-md text-on-surface-variant uppercase">Name</div>
                  <div className="font-label-md text-on-surface-variant uppercase">Email</div>
                  <div className="font-label-md text-on-surface-variant uppercase">Role</div>
                </div>

                <div className="divide-y divide-outline-variant">
                  {customers.map((customer) => (
                    <div
                      key={customer._id}
                      className="grid grid-cols-[1fr_1fr_120px] gap-gutter px-gutter py-md items-center"
                    >
                      <div className="font-title-md">{customer.name}</div>
                      <div className="text-body-md text-on-surface-variant">{customer.email}</div>
                      <div>
                        <span className="px-sm py-xs rounded-full text-xs font-bold bg-primary-container text-on-primary-container">
                          Customer
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Hire Agent Modal Overlay */}
      {isHireModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface text-black rounded-2xl w-full max-w-md overflow-hidden shadow-lg border border-outline-variant">
            <div className="p-lg border-b border-outline-variant flex justify-between items-center">
              <h2 className="font-headline-sm text-slate-900">Hire New Agent</h2>
              <button onClick={() => {
                setIsHireModalOpen(false);
                setHireError('');
              }} className="text-on-surface-variant hover:text-error">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleHireAgent} className="p-lg space-y-md">
              {hireError && <div className="p-sm bg-error-container text-on-error-container rounded-md text-sm">{hireError}</div>}
              <div>
                <label className="block text-label-md mb-xs">Full Name</label>
                <input 
                  type="text" required
                  className="w-full p-sm border border-outline-variant rounded-md bg-surface-container-lowest"
                  value={newAgent.name} onChange={(e) => setNewAgent({...newAgent, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-label-md mb-xs">Email Address</label>
                <div className="flex">
                  <input
                    type="text"
                    required
                    placeholder=""
                    className="flex-1 p-sm border border-outline-variant rounded-l-md bg-surface-container-lowest focus:outline-none"
                    value={agentUsername}
                    onChange={(e) => {
                      setAgentUsername(e.target.value);
                      setNewAgent({
                        ...newAgent,
                        email: `${e.target.value}@${companyDomain}`
                      });
                    }}
                  />
                  <span className="px-sm py-sm border border-l-0 border-outline-variant rounded-r-md bg-surface-container text-on-surface-variant">
                    @{companyDomain}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-label-md mb-xs">Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full p-sm border border-outline-variant rounded-md bg-surface-container-lowest"
                  value={newAgent.password}
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, password: e.target.value })
                  }
                />
              </div>
              <div className="pt-md flex justify-end gap-sm">
                <button type="button" onClick={() => setIsHireModalOpen(false)} className="px-md py-sm rounded-md hover:bg-surface-container-high">Cancel</button>
                <button type="submit" disabled={hireLoading} className="px-md py-sm bg-primary text-on-primary rounded-md font-bold">
                  {hireLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Existing Modals */}
      <ChatModal isOpen={!!activeTicket} onClose={closeChat} ticket={activeTicket} replies={replies} replyText={replyText} setReplyText={setReplyText} role="Company_Owner" />
      <AssignModal isOpen={!!ticketToAssign} onClose={() => setTicketToAssign(null)} onAssign={executeAssign} ticket={ticketToAssign} agents={agents} />
    </div>
  );
};

export default CompanyOwnerDashboard;