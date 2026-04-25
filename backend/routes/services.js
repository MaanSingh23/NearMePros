const express = require('express');
const router = express.Router(); // ← YEH LINE MISSING THI
const Service = require('../models/Service');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// Get nearby services
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 10, category, minPrice, maxPrice, rating } = req.query;
    
    let query = {
      isActive: true,
      isVerified: true, // Only show verified professionals
    };

    // Location filter (Geospatial)
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseFloat(radius) * 1000
        }
      };
    }

    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Price range filters
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Rating filter
    if (rating && parseFloat(rating) > 0) {
      query.rating = { $gte: parseFloat(rating) };
    }

    const services = await Service.find(query)
      .populate('providerId', 'name phone rating avatar isVerified location')
      .limit(100);

    res.json(services);
  } catch (error) {
    console.error('Error in nearby services:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get provider's services
router.get('/provider', auth, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const services = await Service.find({ providerId: req.user.userId })
      .sort('-createdAt');
    
    res.json(services);
  } catch (error) {
    console.error('Error fetching provider services:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get service by ID
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('providerId', 'name phone email avatar isVerified location createdAt');
    
    if (!service || !service.isVerified) {
      return res.status(404).json({ message: 'Service not found or provider not yet verified' });
    }

    res.json(service);
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create service (provider only)
router.post('/', auth, upload.array('images', 5), async (req, res) => {
  try {
    console.log('Creating service for user:', req.user);
    
    if (req.user.role !== 'provider') {
      return res.status(403).json({ message: 'Access denied. Only providers can create services.' });
    }

    const { name, category, description, price, priceType, availability } = req.body;
    
    // Get provider's location
    const provider = await User.findById(req.user.userId);
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    // FIX: Store only the filename, not full path
    const images = req.files ? req.files.map(file => {
      return file.filename; // Store only filename like "123456789-image.jpg"
    }) : [];

    // Parse availability if it's a string
    let parsedAvailability = availability;
    if (typeof availability === 'string') {
      try {
        parsedAvailability = JSON.parse(availability);
      } catch (e) {
        console.error('Error parsing availability:', e);
        parsedAvailability = {
          monday: { available: true, start: '09:00', end: '18:00' },
          tuesday: { available: true, start: '09:00', end: '18:00' },
          wednesday: { available: true, start: '09:00', end: '18:00' },
          thursday: { available: true, start: '09:00', end: '18:00' },
          friday: { available: true, start: '09:00', end: '18:00' },
          saturday: { available: false, start: '09:00', end: '18:00' },
          sunday: { available: false, start: '09:00', end: '18:00' }
        };
      }
    }

    const service = new Service({
      providerId: req.user.userId,
      name,
      category,
      description,
      price: parseFloat(price),
      priceType,
      images, // Now stores just filenames
      availability: parsedAvailability,
      location: provider.location || {
        type: 'Point',
        coordinates: [75.8573, 30.9010],
        address: 'Ludhiana, Punjab, India'
      },
      isVerified: provider.isVerified || false
    });

    await service.save();
    console.log('Service created successfully with images:', images);
    
    res.status(201).json(service);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ message: error.message || 'Server error while creating service' });
  }
});

// Update service
router.put('/:id', auth, upload.array('images', 5), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (service.providerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, category, description, price, priceType, availability } = req.body;
    
    // Update fields
    if (name) service.name = name;
    if (category) service.category = category;
    if (description) service.description = description;
    if (price) service.price = parseFloat(price);
    if (priceType) service.priceType = priceType;
    
    // Parse availability if it's a string
    if (availability) {
      if (typeof availability === 'string') {
        try {
          service.availability = JSON.parse(availability);
        } catch (e) {
          console.error('Error parsing availability:', e);
        }
      } else {
        service.availability = availability;
      }
    }
    
    // Add new images if uploaded
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.filename); // Store only filename
      service.images = [...service.images, ...newImages];
    }

    await service.save();
    res.json(service);
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete service
router.delete('/:id', auth, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (service.providerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await service.deleteOne();
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;