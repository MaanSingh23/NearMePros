const mongoose = require('mongoose');

// One-time passwords. Only a hash of the code is stored; documents are
// removed automatically by MongoDB once they expire.
const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    purpose: {
      type: String,
      required: true,
      enum: ['register', 'login', 'login-2fa', 'reset-password', 'change-password', 'toggle-2fa', 'change-phone']
    },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ email: 1, purpose: 1, createdAt: -1 });

module.exports = mongoose.model('Otp', otpSchema);
