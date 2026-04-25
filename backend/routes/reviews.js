const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Review = require('../models/Review');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const User = require('../models/User');
const auth = require('../middleware/auth');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// Public: Get latest customer reviews for display on the Home page
router.get('/latest', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 6, 20);
    const reviews = await Review.find({ rating: { $gte: 3 } })
      .populate('userId', 'name avatar')
      .populate('serviceId', 'name category images')
      .populate('providerId', 'name avatar')
      .sort('-createdAt')
      .limit(limit);

    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching latest reviews' });
  }
});

const recalculateServiceRating = async (serviceId) => {
  const result = await Review.aggregate([
    { $match: { serviceId: new mongoose.Types.ObjectId(serviceId) } },
    { $group: { _id: '$serviceId', rating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } }
  ]);

  const rating = result[0]?.rating || 0;
  const totalReviews = result[0]?.totalReviews || 0;

  await Service.findByIdAndUpdate(serviceId, {
    rating: Number(rating.toFixed(1)),
    totalReviews
  });
};

const recalculateProviderRating = async (providerId) => {
  const result = await Review.aggregate([
    { $match: { providerId: new mongoose.Types.ObjectId(providerId) } },
    { $group: { _id: '$providerId', rating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } }
  ]);

  const rating = result[0]?.rating || 0;
  const totalReviews = result[0]?.totalReviews || 0;

  await User.findByIdAndUpdate(providerId, {
    rating: Number(rating.toFixed(1)),
    totalReviews
  });
};

const getCustomerBooking = async (bookingId, userId) => {
  if (!isValidObjectId(bookingId)) {
    return null;
  }

  return Booking.findOne({ _id: bookingId, userId })
    .populate('serviceId', 'name category images price priceType providerId')
    .populate('providerId', 'name avatar phone rating totalReviews');
};

// Completed customer bookings, including existing review status.
router.get('/reviewable-bookings', auth, async (req, res) => {
  try {
    if (req.user.role === 'provider') {
      return res.status(403).json({ message: 'Providers cannot review their own customers here' });
    }

    const bookings = await Booking.find({
      userId: req.user.userId,
      status: 'completed'
    })
      .populate('serviceId', 'name category images price priceType')
      .populate('providerId', 'name avatar rating totalReviews')
      .sort('-updatedAt');

    const bookingIds = bookings.map((booking) => booking._id);
    const reviews = await Review.find({
      userId: req.user.userId,
      bookingId: { $in: bookingIds }
    });
    const reviewsByBookingId = new Map(reviews.map((review) => [review.bookingId.toString(), review]));

    res.json(bookings.map((booking) => {
      const review = reviewsByBookingId.get(booking._id.toString());
      const bookingObject = booking.toObject();

      return {
        ...bookingObject,
        review: review || null,
        canReview: !review
      };
    }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while fetching reviewable bookings' });
  }
});

// Customer's submitted reviews.
router.get('/my-reviews', auth, async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user.userId })
      .populate('serviceId', 'name category images')
      .populate('providerId', 'name avatar rating totalReviews')
      .populate('bookingId', 'date time totalAmount status')
      .sort('-createdAt');

    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while fetching your reviews' });
  }
});

// Create a review after a completed booking.
router.post('/', auth, async (req, res) => {
  try {
    const { bookingId, rating, comment, images } = req.body;
    const numericRating = Number(rating);

    if (!bookingId || !isValidObjectId(bookingId)) {
      return res.status(400).json({ message: 'Valid bookingId is required' });
    }

    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const booking = await getCustomerBooking(bookingId, req.user.userId);
    if (!booking) {
      return res.status(403).json({ message: 'You can only review services you have booked' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'You can review only after the booking is completed' });
    }

    const existingReview = await Review.findOne({
      userId: req.user.userId,
      bookingId
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this booking' });
    }

    const review = new Review({
      userId: req.user.userId,
      providerId: booking.providerId._id,
      serviceId: booking.serviceId._id,
      bookingId,
      rating: numericRating,
      comment: comment?.trim() || '',
      images: Array.isArray(images) ? images : []
    });

    await review.save();
    await Promise.all([
      recalculateServiceRating(booking.serviceId._id),
      recalculateProviderRating(booking.providerId._id)
    ]);

    await review.populate('userId', 'name avatar');
    await review.populate('serviceId', 'name category images');
    await review.populate('providerId', 'name avatar rating totalReviews');

    res.status(201).json(review);
  } catch (error) {
    console.error(error);

    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already reviewed this booking' });
    }

    res.status(500).json({ message: 'Server error while creating review' });
  }
});

// Get reviews for a service
router.get('/service/:serviceId', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.serviceId)) {
      return res.status(400).json({ message: 'Invalid service id' });
    }

    const reviews = await Review.find({ serviceId: req.params.serviceId })
      .populate('userId', 'name avatar')
      .populate('providerId', 'name avatar rating totalReviews')
      .sort('-createdAt');

    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get reviews for a provider
router.get('/provider/:providerId', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.providerId)) {
      return res.status(400).json({ message: 'Invalid provider id' });
    }

    const reviews = await Review.find({ providerId: req.params.providerId })
      .populate('userId', 'name avatar')
      .populate('serviceId', 'name category images')
      .sort('-createdAt');

    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Like/unlike a review
router.post('/:id/like', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid review id' });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const userId = req.user.userId;
    const likeIndex = review.likes.findIndex((like) => like.toString() === userId);

    if (likeIndex === -1) {
      review.likes.push(userId);
    } else {
      review.likes.splice(likeIndex, 1);
    }

    await review.save();

    res.json({
      message: likeIndex === -1 ? 'Review liked' : 'Review unliked',
      likes: review.likes.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a review
router.put('/:id', auth, async (req, res) => {
  try {
    const { rating, comment, images } = req.body;
    const numericRating = Number(rating);

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid review id' });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (rating !== undefined) {
      if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }

      review.rating = numericRating;
    }

    if (comment !== undefined) review.comment = comment.trim();
    if (images !== undefined) review.images = Array.isArray(images) ? images : [];

    await review.save();
    await Promise.all([
      recalculateServiceRating(review.serviceId),
      recalculateProviderRating(review.providerId)
    ]);

    await review.populate('serviceId', 'name category images');
    await review.populate('providerId', 'name avatar rating totalReviews');

    res.json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while updating review' });
  }
});

// Delete a review
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid review id' });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { serviceId, providerId } = review;
    await review.deleteOne();
    await Promise.all([
      recalculateServiceRating(serviceId),
      recalculateProviderRating(providerId)
    ]);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while deleting review' });
  }
});

module.exports = router;
