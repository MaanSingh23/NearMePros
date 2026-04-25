const mongoose = require('mongoose');

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
    }
  },
  {
    timestamps: true
  }
);

bookingSchema.index({ providerId: 1, createdAt: -1 });
bookingSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
