const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a ticket title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please describe your issue']
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
    default: 'Open'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizationId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Organization",
  required: false
},
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null 
  },
  // --- AI Managed Fields ---
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'], // Added 'Urgent'
    default: 'Medium'
  },
  category: {
    type: String,
    default: 'General_Inquiry' // New category field populated by AI
  }
}, {
  timestamps: true 
});

module.exports = mongoose.model('Ticket', ticketSchema);