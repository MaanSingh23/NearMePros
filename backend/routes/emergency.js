const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
const { EMERGENCY_TYPES, findEmergencyType } = require('../utils/emergencyTypes');

const SEARCH_RADIUS_KM = 30;
// Rough city travel time: preparation + driving at ~20 km/h through traffic
const PREP_MINUTES = 8;
const CITY_SPEED_KMH = 20;

const toRad = (deg) => (deg * Math.PI) / 180;
const distanceKm = (lat1, lng1, lat2, lng2) => {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const estimateEta = (km) => Math.round(PREP_MINUTES + (km / CITY_SPEED_KMH) * 60);

const nowInIndia = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date());
  return parts; // "14:05"
};

// The emergency categories customers can choose from (without keyword lists)
router.get('/types', (req, res) => {
  res.json(EMERGENCY_TYPES.map(({ id, title, description, categories, safety }) => ({
    id, title, description, categories, safety
  })));
});

/**
 * Nearest professionals for an emergency, fastest first.
 * GET /api/emergency/nearby?lat=..&lng=..&type=electrical
 */
router.get('/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: 'Your location is required to find nearby help' });
    }

    const type = findEmergencyType(req.query.type);
    if (!type) {
      return res.status(400).json({ message: 'Please choose what kind of emergency it is' });
    }

    const services = await Service.find({
      isActive: true,
      isVerified: true,
      category: { $in: type.categories },
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: SEARCH_RADIUS_KM * 1000
        }
      }
    })
      .select('name category price priceType rating totalReviews images location emergencyAvailable providerId')
      .populate('providerId', 'name phone avatar isVerified')
      .limit(25)
      .lean();

    const results = services
      .map((service) => {
        const [sLng, sLat] = service.location?.coordinates || [];
        const km = Number.isFinite(sLat) ? distanceKm(lat, lng, sLat, sLng) : null;
        return {
          _id: service._id,
          name: service.name,
          category: service.category,
          price: service.price,
          priceType: service.priceType,
          rating: service.rating || 0,
          totalReviews: service.totalReviews || 0,
          image: service.images?.[0] || null,
          emergencyAvailable: Boolean(service.emergencyAvailable),
          area: service.location?.address || null,
          lat: sLat ?? null,
          lng: sLng ?? null,
          distanceKm: km != null ? Math.round(km * 10) / 10 : null,
          etaMinutes: km != null ? estimateEta(km) : null,
          provider: service.providerId
            ? {
                _id: service.providerId._id,
                name: service.providerId.name,
                phone: service.providerId.phone || null,
                avatar: service.providerId.avatar || null,
                isVerified: Boolean(service.providerId.isVerified)
              }
            : null
        };
      })
      // 24x7 emergency professionals first, then whoever can arrive soonest
      .sort((a, b) =>
        Number(b.emergencyAvailable) - Number(a.emergencyAvailable) ||
        (a.etaMinutes ?? Infinity) - (b.etaMinutes ?? Infinity) ||
        b.rating - a.rating
      )
      .slice(0, 10);

    res.json({
      type: { id: type.id, title: type.title, safety: type.safety },
      radiusKm: SEARCH_RADIUS_KM,
      results
    });
  } catch (error) {
    console.error('Emergency nearby error:', error);
    res.status(500).json({ message: 'Could not search for nearby help. Please call a professional directly.' });
  }
});

/**
 * Send an urgent request to one professional.
 * POST /api/emergency/request { serviceId, emergencyType, description, contactPhone, location }
 */
router.post('/request', auth, async (req, res) => {
  try {
    const { serviceId, emergencyType, description, contactPhone, location } = req.body;

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ message: 'Please choose a professional' });
    }
    const type = findEmergencyType(emergencyType);
    if (!type) {
      return res.status(400).json({ message: 'Please choose what kind of emergency it is' });
    }
    const phone = String(contactPhone || '').replace(/[^\d+]/g, '');
    if (phone.length < 10 || phone.length > 15) {
      return res.status(400).json({ message: 'Please enter a valid phone number so the professional can call you' });
    }

    const service = await Service.findById(serviceId).select('providerId price priceType isActive isVerified location');
    if (!service || !service.isActive || !service.isVerified) {
      return res.status(404).json({ message: 'This professional is no longer available. Please choose another.' });
    }
    if (String(service.providerId) === req.user.userId) {
      return res.status(400).json({ message: 'You cannot request your own service' });
    }

    // Stop duplicate taps creating several open requests to the same professional
    const openRequest = await Booking.findOne({
      userId: req.user.userId,
      serviceId,
      isEmergency: true,
      status: { $in: ['pending', 'confirmed', 'in-progress'] }
    });
    if (openRequest) {
      return res.status(200).json({ booking: openRequest, duplicate: true });
    }

    const lat = parseFloat(location?.lat);
    const lng = parseFloat(location?.lng);
    const [sLng, sLat] = service.location?.coordinates || [];
    const etaMinutes = Number.isFinite(lat) && Number.isFinite(sLat)
      ? estimateEta(distanceKm(lat, lng, sLat, sLng))
      : null;

    const booking = await Booking.create({
      userId: req.user.userId,
      serviceId,
      providerId: service.providerId,
      date: new Date(),
      time: nowInIndia(),
      duration: 1,
      location: {
        address: typeof location?.address === 'string' ? location.address.slice(0, 300) : 'Address not provided',
        coordinates: Number.isFinite(lat) ? [lng, lat] : null
      },
      description: `[EMERGENCY: ${type.title}] ${String(description || '').trim()}`.slice(0, 1000),
      totalAmount: Number(service.price) || 0,
      status: 'pending',
      isEmergency: true,
      emergencyType: type.id,
      contactPhone: phone,
      etaMinutes
    });

    // Real-time alert to the professional
    const io = req.app.get('io');
    if (io) {
      io.to(String(service.providerId)).emit('newBooking', {
        bookingId: booking._id,
        isEmergency: true,
        message: `🚨 EMERGENCY: ${type.title} - customer needs help now`
      });
    }

    const populated = await Booking.findById(booking._id)
      .populate('serviceId', 'name category price priceType images')
      .populate('providerId', 'name phone avatar isVerified');

    res.status(201).json({ booking: populated });
  } catch (error) {
    console.error('Emergency request error:', error);
    res.status(500).json({ message: 'Could not send your request. Please call the professional directly.' });
  }
});

module.exports = router;
