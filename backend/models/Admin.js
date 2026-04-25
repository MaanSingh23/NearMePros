const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  permissions: [{
    type: String,
    enum: ['manage_users', 'manage_providers', 'manage_services', 'manage_bookings', 'manage_payments', 'view_reports']
  }],
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'moderator'],
    default: 'admin'
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Admin', adminSchema);