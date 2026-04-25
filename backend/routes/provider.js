const express = require('express');
const mongoose = require('mongoose');
const { body, param, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const providerAuth = require('../middleware/providerAuth');

const router = express.Router();

const PROVIDER_BOOKING_STATUSES = ['confirmed', 'rejected', 'completed'];

const updateBookingStatusValidation = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid booking id'),
  body('status')
    .trim()
    .notEmpty()
    .withMessage('status is required')
    .isIn(PROVIDER_BOOKING_STATUSES)
    .withMessage(`status must be one of: ${PROVIDER_BOOKING_STATUSES.join(', ')}`)
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

const buildProviderBookingQuery = (providerId) => ({
  providerId,
  status: { $in: ['pending', 'confirmed', 'rejected', 'completed'] }
});

router.get('/bookings', providerAuth, async (req, res) => {
  try {
    const bookings = await Booking.find(buildProviderBookingQuery(req.user.userId))
      .populate('userId', 'name email phone avatar')
      .populate('serviceId', 'name category price images')
      .sort('-createdAt');

    res.json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error('Error fetching provider bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching provider bookings'
    });
  }
});

router.patch('/bookings/:id/status', providerAuth, updateBookingStatusValidation, async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  try {
    const { status } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.providerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own bookings'
      });
    }

    const validTransitions = {
      pending: ['confirmed', 'rejected'],
      confirmed: ['completed'],
      rejected: [],
      completed: []
    };

    if (booking.status === status) {
      return res.json({
        success: true,
        message: `Booking already marked as ${status}`,
        booking
      });
    }

    if (!validTransitions[booking.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change booking status from ${booking.status} to ${status}`
      });
    }

    booking.status = status;
    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('userId', 'name email phone avatar')
      .populate('serviceId', 'name category price images')
      .populate('providerId', 'name email phone avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(booking.userId.toString()).emit('bookingUpdate', {
        bookingId: booking._id,
        status,
        message: `Your booking has been ${status}`
      });
    }

    res.json({
      success: true,
      message: `Booking ${status} successfully`,
      booking: populatedBooking
    });
  } catch (error) {
    console.error('Error updating provider booking status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating booking status'
    });
  }
});

module.exports = router;
