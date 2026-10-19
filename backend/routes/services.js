const express = require('express');
const router = express.Router(); // ← YEH LINE MISSING THI
const Service = require('../models/Service');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { uploadToImageKit } = require('../utils/imageKit');

// Configure multer for file uploads
// Configure multer for memory storage (for cloud uploads)
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, GIF or WEBP images are allowed'));
    }
  }
});

// Run multer and turn upload errors into a 400 with a readable message
// (otherwise Express returns a bare 500 HTML page)
const uploadImages = (req, res, next) => {
  upload.array('images', 5)(req, res, (err) => {
    if (!err) return next();
    let message = err.message;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'Each image must be 10MB or smaller';
    if (err.code === 'LIMIT_UNEXPECTED_FILE') message = 'Maximum 5 images allowed';
    res.status(400).json({ message });
  });
};

// Upload all files to ImageKit and return their URLs.
// Throws (instead of silently dropping photos) if any upload fails.
const uploadFiles = async (files = []) => {
  const urls = [];
  for (const file of files) {
    try {
      const ikResponse = await uploadToImageKit(file.buffer, file.originalname);
      urls.push(ikResponse.url);
    } catch (uploadError) {
      console.error('Error uploading to ImageKit:', uploadError);
      const err = new Error(`Could not upload "${file.originalname}". Please try again.`);
      err.status = 502;
      throw err;
    }
  }
  return urls;
};

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
router.post('/', auth, uploadImages, async (req, res) => {
  try {
    console.log('Creating service for user:', req.user);
    
    if (req.user.role !== 'provider') {
      return res.status(403).json({ message: 'Access denied. Only providers can create services.' });
    }

    const { name, category, description, price, priceType, availability, emergencyAvailable } = req.body;
    
    // Get provider's location
    const provider = await User.findById(req.user.userId);
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    // Upload images to ImageKit (stores full cloud URLs)
    const images = await uploadFiles(req.files);

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
      images,
      availability: parsedAvailability,
      // Fall back to Ludhiana if the provider has no valid coordinates,
      // otherwise the 2dsphere index rejects the save
      location: provider.location?.coordinates?.length === 2
        ? provider.location
        : {
            type: 'Point',
            coordinates: [75.8573, 30.9010],
            address: 'Ludhiana, Punjab, India'
          },
      emergencyAvailable: emergencyAvailable === true || emergencyAvailable === 'true',
      isVerified: true // Set to true by default for immediate visibility
    });

    await service.save();
    console.log('Service created successfully with images:', images);
    
    res.status(201).json(service);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(error.status || 500).json({ message: error.message || 'Server error while creating service' });
  }
});

// Update service
router.put('/:id', auth, uploadImages, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (service.providerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, category, description, price, priceType, availability, emergencyAvailable } = req.body;
    
    // Update fields
    if (name) service.name = name;
    if (category) service.category = category;
    if (description) service.description = description;
    if (price) service.price = parseFloat(price);
    if (priceType) service.priceType = priceType;
    if (emergencyAvailable !== undefined) {
      service.emergencyAvailable = emergencyAvailable === true || emergencyAvailable === 'true';
    }
    
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
    
    // Keep only the existing images the provider didn't remove
    if (req.body.existingImages) {
      try {
        const keep = JSON.parse(req.body.existingImages);
        service.images = service.images.filter(img => keep.includes(img));
      } catch (e) {
        console.error('Error parsing existingImages:', e);
      }
    }

    // Add new images uploaded to ImageKit
    service.images.push(...await uploadFiles(req.files));

    await service.save();
    res.json(service);
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(error.status || 500).json({ message: error.message || 'Server error' });
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