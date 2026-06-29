const mongoose = require('mongoose');

const replySchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // We save the role so the frontend knows whether to style it as a Customer or Agent message
    senderRole: {
      type: String,
      enum: ['Customer', 'Agent', 'Admin','Company_Owner'],
      required: true
    },
    message: {
      type: String,
      required: [true, 'Please add a message']
    },
    attachmentUrl: {
      type: String,
      default: null
    },
    organizationId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Organization",
  required: true
}
  },
  {
    timestamps: true // Automatically gives us the date/time the reply was sent
  }
);

module.exports = mongoose.model('Reply', replySchema);