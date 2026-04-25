const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, param, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const auth = require('../middleware/auth');

const BOOKING_STATUSES = ['pending', 'confirmed', 'rejected', 'in-progress', 'completed', 'cancelled'];

const createBookingValidation = [
  body('serviceId')
    .trim()
    .notEmpty().withMessage('serviceId is required')
    .custom((value) => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid serviceId'),
  body('date')
    .notEmpty().withMessage('date is required')
    .isISO8601().withMessage('Invalid date'),
  body('time')
    .trim()
    .notEmpty().withMessage('time is required')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('time must be in HH:mm format'),
  body('duration')
    .optional()
    .isInt({ min: 1, max: 24 }).withMessage('duration must be an integer between 1 and 24'),
  body('description')
    .optional()
    .isString().withMessage('description must be a string')
    .isLength({ max: 1000 }).withMessage('description cannot exceed 1000 characters'),
  body('location')
    .optional()
    .custom((value) => value === null || typeof value === 'string' || typeof value === 'object')
    .withMessage('location must be a string or object')
];

const updateStatusValidation = [
  param('id').custom((value) => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid booking id'),
  body('status')
    .trim()
    .notEmpty().withMessage('status is required')
    .isIn(BOOKING_STATUSES).withMessage(`status must be one of: ${BOOKING_STATUSES.join(', ')}`)
];

const bookingIdValidation = [
  param('id').custom((value) => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid booking id')
];

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return null;
  }

  return res.status(400).json({
    message: 'Validation failed',
    errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg }))
  });
};

const getIdString = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value.toString === 'function') {
    return value.toString();
  }

  if (value._id && typeof value._id.toString === 'function') {
    return value._id.toString();
  }

  return null;
};

const respondServerError = (res, error, fallbackMessage) => {
  console.error(error);

  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message
      }))
    });
  }

  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: 'Invalid identifier provided' });
  }

  return res.status(500).json({ message: fallbackMessage || 'Server error' });
};

const canTransitionStatus = (booking, nextStatus, currentUser) => {
  const providerId = getIdString(booking.providerId);
  const userId = getIdString(booking.userId);
  const requesterId = currentUser.userId;

  if (!providerId || !userId) {
    return { allowed: false, message: 'Booking participants are invalid' };
  }

  const isProvider = providerId === requesterId;
  const isCustomer = userId === requesterId;

  if (!isProvider && !isCustomer) {
    return { allowed: false, message: 'Access denied', statusCode: 403 };
  }

  if (nextStatus === booking.status) {
    return { allowed: true };
  }

  if (isCustomer) {
    if (nextStatus !== 'cancelled') {
      return { allowed: false, message: 'Customers can only cancel bookings', statusCode: 403 };
    }

    if (['completed', 'cancelled', 'rejected'].includes(booking.status)) {
      return { allowed: false, message: `Cannot cancel a booking that is already ${booking.status}`, statusCode: 400 };
    }

    return { allowed: true };
  }

  const validTransitions = {
    pending: ['confirmed', 'rejected', 'cancelled'],
    confirmed: ['in-progress', 'completed', 'cancelled'],
    rejected: [],
    'in-progress': ['completed', 'cancelled'],
    completed: [],
    cancelled: []
  };

  if (!validTransitions[booking.status]?.includes(nextStatus)) {
    return {
      allowed: false,
      message: `Cannot change booking status from ${booking.status} to ${nextStatus}`,
      statusCode: 400
    };
  }

  return { allowed: true };
};

// Create a new booking
router.post('/', auth, createBookingValidation, async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  try {
    const { serviceId, date, time, duration, location, description } = req.body;
    const normalizedDuration = Number(duration) || 1;

    // Get service details
    const service = await Service.findById(serviceId).select('providerId price priceType isActive');
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (!service.isActive) {
      return res.status(400).json({ message: 'This service is not available for booking' });
    }

    const providerId = getIdString(service.providerId);
    if (!providerId) {
      return res.status(400).json({ message: 'Service provider information is missing' });
    }

    if (providerId === req.user.userId) {
      return res.status(400).json({ message: 'You cannot book your own service' });
    }

    const basePrice = Number(service.price);
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return res.status(400).json({ message: 'Service price is invalid' });
    }

    // Calculate total amount
    const totalAmount = service.priceType === 'hourly'
      ? basePrice * normalizedDuration
      : basePrice;

    const booking = new Booking({
      userId: req.user.userId,
      serviceId,
      providerId,
      date,
      time,
      duration: normalizedDuration,
      location,
      description: description?.trim() || '',
      totalAmount,
      status: 'pending'
    });

    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('userId', 'name email phone')
      .populate('serviceId', 'name category price priceType')
      .populate('providerId', 'name phone');

    // Emit socket event for real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(providerId).emit('newBooking', {
        bookingId: booking._id,
        message: 'You have a new booking request'
      });
    }

    res.status(201).json(populatedBooking);
  } catch (error) {
    return respondServerError(res, error, 'Server error while creating booking');
  }
});

// Get user's bookings
router.get('/my-bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.userId })
      .populate('serviceId', 'name category price images')
      .populate('providerId', 'name phone avatar')
      .sort('-createdAt');
    
    res.json(bookings);
  } catch (error) {
    return respondServerError(res, error, 'Server error while fetching bookings');
  }
});

// Get provider's bookings
router.get('/provider-bookings', auth, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const bookings = await Booking.find({ providerId: req.user.userId })
      .populate('userId', 'name phone avatar')
      .populate('serviceId', 'name category price')
      .sort('-createdAt');
    
    res.json(bookings);
  } catch (error) {
    return respondServerError(res, error, 'Server error while fetching provider bookings');
  }
});

// Update booking status
router.put('/:id/status', auth, updateStatusValidation, async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  try {
    const { status } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const transitionCheck = canTransitionStatus(booking, status, req.user);
    if (!transitionCheck.allowed) {
      return res.status(transitionCheck.statusCode || 400).json({ message: transitionCheck.message });
    }

    booking.status = status;
    await booking.save();

    // Emit socket event
    const io = req.app.get('io');
    const providerId = getIdString(booking.providerId);
    const userId = getIdString(booking.userId);
    const notifyUserId = providerId === req.user.userId ? userId : providerId;

    if (io && notifyUserId) {
      io.to(notifyUserId).emit('bookingUpdate', {
        bookingId: booking._id,
        status,
        message: `Your booking has been ${status}`
      });
    }

    const updatedBooking = await Booking.findById(booking._id)
      .populate('userId', 'name email phone avatar')
      .populate('serviceId', 'name category price priceType images')
      .populate('providerId', 'name email phone avatar isVerified');

    res.json({ message: 'Booking updated successfully', booking: updatedBooking });
  } catch (error) {
    return respondServerError(res, error, 'Server error while updating booking');
  }
});

// Get booking by ID
router.get('/:id', auth, bookingIdValidation, async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email phone avatar')
      .populate('serviceId', 'name category price description images')
      .populate('providerId', 'name email phone avatar isVerified');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check authorization
    const bookingUserId = getIdString(booking.userId);
    const bookingProviderId = getIdString(booking.providerId);

    if (!bookingUserId || !bookingProviderId) {
      return res.status(400).json({ message: 'Booking user/provider information is incomplete' });
    }

    if (bookingUserId !== req.user.userId && bookingProviderId !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(booking);
  } catch (error) {
    return respondServerError(res, error, 'Server error while fetching booking');
  }
});

module.exports = router;
