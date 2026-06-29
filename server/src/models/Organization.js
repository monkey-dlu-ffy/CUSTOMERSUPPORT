// models/Organization.js
const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  domain: {
    type: String, // e.g., 'acmecorp.com' - useful for auto-routing users
    unique: true,
    sparse: true 
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Organization', organizationSchema);