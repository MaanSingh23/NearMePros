const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Salon for Women',
      'Salon for Men',
      'Haircut & Styling',
      'Facial & Skincare',
      'Spa & Massage',
      'Dance Classes',
      'Beauty Services',
      'Tailoring & Boutique',
      'Cleaning Services',
      'Plumbing',
      'Electrical',
      'Carpentry',
      'AC & Appliance Repair',
      'Cleaning',
      'Painting',
      'AC Repair',
      'Appliance Repair',
      'Pest Control',
      'Moving',
      'Other'
    ]
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  priceType: {
    type: String,
    enum: ['fixed', 'hourly'],
    default: 'fixed'
  },
  images: [{
    type: String
  }],
  availability: {
    monday: { start: String, end: String, available: Boolean },
    tuesday: { start: String, end: String, available: Boolean },
    wednesday: { start: String, end: String, available: Boolean },
    thursday: { start: String, end: String, available: Boolean },
    friday: { start: String, end: String, available: Boolean },
    saturday: { start: String, end: String, available: Boolean },
    sunday: { start: String, end: String, available: Boolean }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: [Number],
    address: String,
    city: String,
    state: String,
    serviceRadius: { type: Number, default: 10 } // in km
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

serviceSchema.index({ location: '2dsphere' });
serviceSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('Service', serviceSchema);
