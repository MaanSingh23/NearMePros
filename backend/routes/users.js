const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { uploadToImageKit } = require('../utils/imageKit');
const User = require('../models/User');
const auth = require('../middleware/auth');

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

    if (phone?.trim()) {
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
