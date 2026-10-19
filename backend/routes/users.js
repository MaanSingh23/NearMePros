const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { uploadToImageKit } = require('../utils/imageKit');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendOtp, verifyOtp, sendOtpError } = require('../utils/otp');

// Configure multer for memory storage (for cloud uploads)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }

    return cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
  }
});

const buildAvatarUrl = (req, filename) => {
  if (!filename) {
    return undefined;
  }

  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }

  const normalizedPath = filename.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${req.protocol}://${req.get('host')}/${normalizedPath}`;
};

// Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, upload.single('avatar'), async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name?.trim()) {
      user.name = name.trim();
    }

    // Changing the phone number is a sensitive action - confirm with an email code
    if (phone?.trim() && phone.trim() !== user.phone) {
      if (!req.body.otp) {
        return res.status(428).json({
          message: 'Confirm the phone number change with the code sent to your email.',
          otpRequired: true,
          purpose: 'change-phone'
        });
      }
      try {
        await verifyOtp({ email: user.email, purpose: 'change-phone', code: req.body.otp });
      } catch (error) {
        return sendOtpError(res, error);
      }
      user.phone = phone.trim();
    }

    if (!user.location) {
      user.location = {
        type: 'Point',
        coordinates: [77.1025, 28.7041]
      };
    }

    if (address !== undefined) {
      user.location = {
        ...user.location.toObject?.() || user.location,
        address: address.trim()
      };
    }

    if (req.file) {
      try {
        const ikResponse = await uploadToImageKit(req.file.buffer, req.file.originalname);
        user.avatar = ikResponse.url; // Store the full cloud URL
      } catch (uploadError) {
        console.error('Error uploading avatar to ImageKit:', uploadError);
      }
    }

    await user.save();
    
    const updatedUser = await User.findById(user._id).select('-password');

    res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// Security settings (each change is confirmed with an email code)
// ---------------------------------------------------------------------------
const ACCOUNT_OTP_PURPOSES = ['change-password', 'toggle-2fa', 'change-phone'];

// Send a code to the logged-in user's email
router.post('/me/otp', auth, async (req, res) => {
  try {
    const { purpose } = req.body;
    if (!ACCOUNT_OTP_PURPOSES.includes(purpose)) return res.status(400).json({ message: 'Invalid request' });
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const result = await sendOtp({ email: user.email, purpose, name: user.name });
    res.json({ message: `We sent a 6-digit code to ${result.maskedEmail}`, ...result });
  } catch (error) {
    sendOtpError(res, error);
  }
});

// Change password: current password + email code
router.post('/me/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword, otp } = req.body;
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!(await user.comparePassword(currentPassword || ''))) {
      return res.status(400).json({ message: 'Your current password is incorrect' });
    }
    if (await user.comparePassword(newPassword)) {
      return res.status(400).json({ message: 'Choose a password different from your current one' });
    }
    await verifyOtp({ email: user.email, purpose: 'change-password', code: otp });
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    sendOtpError(res, error);
  }
});

// Turn 2-step verification on or off
router.post('/me/two-factor', auth, async (req, res) => {
  try {
    const { enabled, otp } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await verifyOtp({ email: user.email, purpose: 'toggle-2fa', code: otp });
    user.twoFactorEnabled = Boolean(enabled);
    user.emailVerified = true;
    await user.save();
    res.json({
      message: user.twoFactorEnabled ? '2-step verification is now ON' : '2-step verification is now OFF',
      twoFactorEnabled: user.twoFactorEnabled
    });
  } catch (error) {
    sendOtpError(res, error);
  }
});

// Get user by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name avatar phone location isVerified role createdAt');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
