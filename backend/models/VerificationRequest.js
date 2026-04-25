const mongoose = require('mongoose');

const verificationRequestSchema = new mongoose.Schema({
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documents: [{
    type: {
      type: String,
      enum: ['aadhar', 'pan', 'business_license', 'gst_certificate'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    number: String,
    verifiedAt: Date
  }],
  businessDetails: {
    businessName: String,
    businessType: String,
    registrationNumber: String,
    yearsOfExperience: Number,
    serviceCategories: [String]
  },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending'
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminNotes: String,
  rejectionReason: String,
  reviewedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('VerificationRequest', verificationRequestSchema);