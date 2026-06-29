const Ticket = require('../models/Ticket');
const Reply = require('../models/Reply');
const Groq = require('groq-sdk');
const User = require('../models/User');

// --- AI Service Logic ---

const analyzeTicketWithGroq = async (title, description) => {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY }); 
    
    const prompt = `
      You are an expert customer support triage system. Carefully read and understand the following ticket.
      Title: "${title}"
      Description: "${description}"
      
      Respond STRICTLY in JSON format with exactly three keys:
      1. "category": Choose the single best fit from ["Billing", "Technical_Issue", "Account_Access", "Feature_Request", "General_Inquiry"].
      2. "sentiment": Analyze the customer's tone. Must be one of ["POSITIVE", "NEUTRAL", "NEGATIVE"].
      3. "priority": Determine the actual urgency of the issue based on business impact. Must be exactly one of ["Low", "Medium", "High", "Urgent"].
         - "Urgent": Total system outages, critical security breaches, or severe financial data loss.
         - "High": Core features are broken for this user, preventing them from working.
         - "Medium": Standard bugs, billing questions, or annoyances with workarounds.
         - "Low": Feature requests, general feedback, or minor typos.
         Note: A negative sentiment does NOT automatically mean the issue is Urgent if the actual problem is minor.
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'system', content: prompt }],
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' }
    });

    return JSON.parse(chatCompletion.choices[0].message.content);
  } catch (error) {
    console.error("AI Classification Error Details:", error);
    return { priority: 'Medium', category: 'General_Inquiry', sentiment: 'NEUTRAL' }; 
  }
};

const generateAgentReplyWithGroq = async (title, description) => {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY }); 
    
    const prompt = `
      You are a professional, empathetic, and highly skilled customer support agent.
      Write a suggested reply to the customer based on their ticket.
      
      Ticket Title: "${title}"
      Ticket Description: "${description}"
      
      Guidelines:
      1. Be polite and acknowledge their problem.
      2. Keep it concise (2-3 short paragraphs max).
      3. Do NOT invent specific company policies or fake links. Use placeholders like [Insert Link] or [Insert Steps] if you need the agent to fill something in.
      4. End with a professional sign-off.
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'system', content: prompt }],
      model: 'llama-3.1-8b-instant',
    });

    return chatCompletion.choices[0].message.content;
  } catch (error) {
    console.error("AI Reply Generation Error:", error);
    throw new Error("Failed to generate AI reply.");
  }
};

// --- Controllers ---

// @desc    Create new ticket
// @route   POST /api/tickets
const createTicket = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication failed. Please log in again.'
      });
    }

    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        message: 'Please include all required fields'
      });
    }

    const aiAnalysis = await analyzeTicketWithGroq(title, description);

    // 1. You create the variable named 'ticket'
    const ticket = await Ticket.create({
      title,
      description,
      priority: aiAnalysis.priority,
      category: aiAnalysis.category,
      status: 'Open',
      createdBy: req.user._id,
      organizationId: req.user.organizationId
    });
    
    // --- REAL-TIME: Notify Owners and Agents ---
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    console.log("\n--- DEBUG: NEW TICKET CREATED ---");
    console.log("1. Ticket Org ID:", ticket.organizationId);
    console.log("2. Currently Online Users:", Array.from(connectedUsers.keys()));
    // 2. THE FIX: Look at 'ticket.organizationId' instead of newTicket
    if (io && connectedUsers && ticket.organizationId) {
      // Find all Agents and Owners in this specific organization
      const staffMembers = await User.find({
        organizationId: ticket.organizationId,
        role: { $in: ['Agent', 'Company_Owner','Admin'] }
      });
      console.log(`3. Found ${staffMembers.length} staff members in the DB for this Org.`);
      staffMembers.forEach(staff => {
        const staffIdStr = staff._id.toString();
        const socketId = connectedUsers.get(staffIdStr);
        console.log(` - Checking Staff: ${staff.email} (${staff.role}) | ID: ${staffIdStr} | Socket: ${socketId ? 'ONLINE ✅' : 'OFFLINE ❌'}`);
        if (socketId) {
          // 3. THE FIX: Send the 'ticket' variable to the frontend
          io.to(socketId).emit('new_ticket_created', ticket);
          console.log(`   -> SUCCESS: Fired socket ping to ${staff.role}`);
        }
      });
    }else {
      console.log("4. SKIPPED: Missing io, connectedUsers, or ticket.organizationId");
    }
    console.log("-----------------------------------\n");

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Crash details:', error);

    res.status(500).json({
      message: 'Server error creating ticket',
      error: error.message
    });
  }
};  
// @desc    Get tickets based on role permissions
// @route   GET /api/tickets

const getTickets = async (req, res) => {
  try {
    console.log("ROLE:", req.user.role);
    console.log("ORG:", req.user.organizationId);

    let tickets;

    if (req.user.role === 'Admin') {
      tickets = await Ticket.find()
        .sort({ createdAt: -1 });
    }
    else if (
      req.user.role === 'Company_Owner' ||
      req.user.role === 'Agent'
    ) {
      tickets = await Ticket.find({
        organizationId: req.user.organizationId
      }).sort({ createdAt: -1 });
    }
    else {
      tickets = await Ticket.find({
        createdBy: req.user._id
      }).sort({ createdAt: -1 });
    }

    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({
      message: 'Server error fetching tickets',
      error: error.message
    });
  }
};

// @desc    Get a single ticket
// @route   GET /api/tickets/:id
const getTicketById = async (req, res) => {
  try {
    let ticket;

    if (req.user.role === 'Admin') {
      ticket = await Ticket.findById(req.params.id);
    } else {
      ticket = await Ticket.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId
      });
    }

    if (!ticket) {
      return res.status(404).json({
        message: 'Ticket not found'
      });
    }

    res.status(200).json(ticket);
  } catch (error) {
    res.status(500).json({
      message: 'Server error fetching ticket',
      error: error.message
    });
  }
};

// @desc    Update ticket
// @route   PUT /api/tickets/:id
// Make sure you have your User model required at the top of your file!
// const User = require('../models/User');

const updateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Authorization check
    if (req.user.role === 'Company_Owner') {
      if (ticket.tenantId?.toString() !== req.user.tenantId?.toString()) {
        return res.status(403).json({
          message: 'Not authorized for this tenant'
        });
      }
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: 'after', runValidators: true } 
    );
    
    // --- REAL-TIME NOTIFICATION INJECTION ---
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');

    if (io && connectedUsers && updatedTicket.organizationId) {
      // Broadcast the full updated ticket to ALL online staff + the ticket creator
      const orgMembers = await User.find({
        organizationId: updatedTicket.organizationId
      });

      orgMembers.forEach(member => {
        const memberIdStr = member._id.toString();
        const socketId = connectedUsers.get(memberIdStr);
        if (socketId) {
          io.to(socketId).emit('ticket_updated', updatedTicket);
        }
      });

      // 1. Was it ASSIGNED to an Agent? — Send targeted notification too
      if (req.body.assignedTo) {
        const agentSocketId = connectedUsers.get(req.body.assignedTo);
        if (agentSocketId) io.to(agentSocketId).emit('ticket_assigned', updatedTicket);
      }

      // 2. Was it marked as RESOLVED? — Notify the customer who created it
      if (req.body.status === 'Resolved') {
        const creatorSocketId = connectedUsers.get(updatedTicket.createdBy.toString());
        if (creatorSocketId) io.to(creatorSocketId).emit('ticket_resolved', updatedTicket);
      }

      // 3. Was it escalated to URGENT? — Extra alert to company owners
      if (req.body.priority === 'Urgent') {
        const owners = await User.find({ 
          organizationId: updatedTicket.organizationId, 
          role: 'Company_Owner' 
        });
        owners.forEach(owner => {
          const ownerSocketId = connectedUsers.get(owner._id.toString());
          if (ownerSocketId) io.to(ownerSocketId).emit('ticket_urgent', updatedTicket);
        });
      }
    }
    // ----------------------------------------

    res.status(200).json(updatedTicket);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating ticket', error: error.message });
  }
};

// @desc    Delete ticket
// @route   DELETE /api/tickets/:id
const deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const organizationId = ticket.organizationId;
    await ticket.deleteOne();

    // --- REAL-TIME: Broadcast deletion to all online org members ---
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');

    if (io && connectedUsers && organizationId) {
      const orgMembers = await User.find({ organizationId });
      orgMembers.forEach(member => {
        const socketId = connectedUsers.get(member._id.toString());
        if (socketId) {
          io.to(socketId).emit('ticket_deleted', { id: req.params.id, organizationId });
        }
      });
    }
    // -------------------------------------------------------------

    res.status(200).json({ message: 'Ticket removed successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting ticket', error: error.message });
  }
};

// @desc    Add a reply to a ticket
// @route   POST /api/tickets/:id/replies
// @desc    Add a reply to a ticket
// @route   POST /api/tickets/:id/replies
const addReply = async (req, res) => {
  try {
    const { message } = req.body;
    const ticketId = req.params.id;

    const attachmentUrl = req.file
      ? `/uploads/${req.file.filename}`
      : null;

    if (!message && !attachmentUrl) {
      return res.status(400).json({
        message: 'A message or image is required'
      });
    }

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        message: 'Ticket not found'
      });
    }

    const reply = await Reply.create({
      ticketId,
      organizationId: ticket.organizationId,
      senderId: req.user._id,
      senderRole: req.user.role,
      message: message || '',
      attachmentUrl
    });

    // --- REAL-TIME: Notify ALL org members of the new reply ---
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');

    if (io && connectedUsers && ticket) {
      const senderIdStr = req.user._id.toString();

      // Payload for the in-app toast notification
      const replyPayload = {
        ticketId: ticket._id,
        ticketTitle: ticket.title,
        senderRole: req.user.role,
        message: reply.message || '📎 Attachment',
      };

      // Notify all staff in this org (agents, owners, admins) — skip the sender
      const staffMembers = await User.find({
        organizationId: ticket.organizationId,
        role: { $in: ['Agent', 'Company_Owner', 'Admin'] }
      });

      staffMembers.forEach(staff => {
        const staffIdStr = staff._id.toString();
        if (staffIdStr === senderIdStr) return;
        const socketId = connectedUsers.get(staffIdStr);
        if (socketId) {
          io.to(socketId).emit('new_reply', replyPayload);
        }
      });

      // Notify the customer who owns the ticket (if they didn't send this reply)
      const customerIdStr = ticket.createdBy.toString();
      if (customerIdStr !== senderIdStr) {
        const customerSocketId = connectedUsers.get(customerIdStr);
        if (customerSocketId) {
          io.to(customerSocketId).emit('new_reply', replyPayload);
          io.to(customerSocketId).emit('agent_replied', ticket._id); // legacy compat
        }
      }
    }
    // ----------------------------------------

    res.status(201).json(reply);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to post reply',
      error: error.message
    });
  }
};

// @desc    Get all replies for a specific ticket
// @route   GET /api/tickets/:id/replies
const getTicketReplies = async (req, res) => {
  try {
    const replies = await Reply.find({
      ticketId: req.params.id,
      organizationId: req.user.organizationId
    }).sort({ createdAt: 1 });

    res.status(200).json(replies);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch replies',
      error: error.message
    });
  }
};

// @desc    Generate an AI suggested reply for a ticket
// @route   POST /api/tickets/:id/suggest-reply
const suggestReply = async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'Agent' && req.user.role !== 'Company_Owner') {
      return res.status(403).json({ message: 'Only agents and company owners can generate AI replies.' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const suggestedText = await generateAgentReplyWithGroq(ticket.title, ticket.description);
    
    res.status(200).json({ suggestion: suggestedText });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate reply', error: error.message });
  }
};

// @desc    Get complex dashboard metrics (Tickets by Status & Average Resolution Time)
// @route   GET /api/tickets/stats
const getTicketStats = async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'Agent') {
      return res.status(403).json({ message: 'Not authorized to view metrics.' });
    }

    const metrics = await Ticket.aggregate([
      {
        $facet: {
          ticketsByStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $project: { _id: 0, status: "$_id", count: 1 } }
          ],
          resolutionTime: [
            { $match: { status: { $in: ["Resolved", "Closed"] } } },
            { $group: { _id: null, avgMs: { $avg: { $subtract: ["$updatedAt", "$createdAt"] } } } },
            { $project: { _id: 0, avgHours: { $round: [{ $divide: ["$avgMs", 3600000] }, 2] } } }
          ]
        }
      }
    ]);

    res.status(200).json(metrics[0] || { ticketsByStatus: [], resolutionTime: [] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to build metrics pipeline', error: error.message });
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  addReply,
  getTicketReplies,
  suggestReply,
  getTicketStats // <-- Exported successfully
};