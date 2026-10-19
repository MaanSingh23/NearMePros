const mongoose = require('mongoose');
const crypto = require('crypto');

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
      index: true
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    date: {
      type: Date,
      required: true
    },
    time: {
      type: String,
      required: true,
      trim: true
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    location: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rejected', 'in-progress', 'completed', 'cancelled'],
      default: 'pending',
      index: true
    },
    // Emergency Mode requests: shown first and highlighted for the provider
    isEmergency: {
      type: Boolean,
      default: false,
      index: true
    },
    emergencyType: {
      type: String,
      trim: true,
      default: null
    },
    contactPhone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: null
    },
    // Estimated arrival (minutes) when the request was made
    etaMinutes: {
      type: Number,
      default: null
    },
    // Job completion code: only the customer can see it; the professional must
    // enter it to mark the job done (proves the customer confirmed the work)
    completionCode: {
      type: String,
      select: false
    },
    completionAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    completionLockedUntil: {
      type: Date,
      select: false
    },
    completedVerifiedAt: Date
  },
  {
    timestamps: true
  }
);

bookingSchema.pre('validate', function setCompletionCode(next) {
  if (this.isNew && !this.completionCode) {
    this.completionCode = String(crypto.randomInt(1000, 10000));
  }
  next();
});

bookingSchema.index({ providerId: 1, createdAt: -1 });
bookingSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
