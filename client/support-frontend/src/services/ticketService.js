import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/api/tickets`;

// Helper function to dynamically grab the current user's token from sessionStorage
const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

const createTicket = async (ticketData) => {
  const response = await axios.post(API_URL, ticketData, getAuthHeaders());
  return response.data;
};

const getTickets = async () => {
  const response = await axios.get(API_URL, getAuthHeaders());
  return response.data;
};

// 3. Update a Ticket (PUT)
const updateTicket = async (ticketId, updatedData) => {
  const response = await axios.put(`${API_URL}/${ticketId}`, updatedData, getAuthHeaders());
  return response.data;
};

// 4. Delete a Ticket (DELETE)
const deleteTicket = async (ticketId) => {
  const response = await axios.delete(`${API_URL}/${ticketId}`, getAuthHeaders());
  return response.data;
};

// --- NEW CHAT/THREAD FUNCTIONS ---

// 5. Get all replies for a specific ticket (GET)
const getReplies = async (ticketId) => {
  const response = await axios.get(`${API_URL}/${ticketId}/replies`, getAuthHeaders());
  return response.data;
};

// 6. Add a new reply to a ticket (POST)
const addReply = async (ticketId, message, file) => {
  const formData = new FormData();
  formData.append('message', message);
  if (file) {
    formData.append('attachment', file); 
  }

  // Axios automatically handles the multi-part boundary headers alongside your Auth header
  const response = await axios.post(`${API_URL}/${ticketId}/replies`, formData, getAuthHeaders());
  return response.data;
};

// 7. Generate AI Suggested Reply (POST)
const suggestReply = async (ticketId) => {
  // We send an empty object {} for the body since the backend just needs the ID from the URL
  const response = await axios.post(`${API_URL}/${ticketId}/suggest-reply`, {}, getAuthHeaders());
  return response.data;
};

// --- AGENT ASSIGNMENT FUNCTION ---

// 8. Get all users with the role of 'Agent' (GET)
const getAgents = async () => {
  // Pointing to your auth route where users are managed
  const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/agents`, getAuthHeaders());
  return response.data;
};

const ticketService = {
  createTicket,
  getTickets,
  updateTicket,
  deleteTicket,
  getReplies, 
  addReply,   
  suggestReply,
  getAgents // <-- Exported here!
};

export default ticketService;