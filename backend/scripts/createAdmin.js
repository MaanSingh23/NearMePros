const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Admin = require('../models/Admin');

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('MONGO_URI is not set. Add it to backend/.env');
  process.exit(1);
}

async function createAdmin() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@localfinder.com' });
    
    if (existingAdmin) {
      console.log('Admin already exists. Deleting old admin...');
      await User.deleteOne({ email: 'admin@localfinder.com' });
      await Admin.deleteOne({ userId: existingAdmin._id });
    }

    // Create admin user
    const adminUser = new User({
      name: 'Super Admin',
      email: 'admin@localfinder.com',
      password: 'Admin@123',
      phone: '9999999999',
      role: 'admin',
      isVerified: true,
      location: {
        type: 'Point',
        coordinates: [77.1025, 28.7041],
        address: 'New Delhi, India'
      }
    });

    await adminUser.save();

    // Create admin record
    const admin = new Admin({
      userId: adminUser._id,
      role: 'super_admin',
      permissions: ['manage_users', 'manage_providers', 'manage_services', 'manage_bookings', 'manage_payments', 'view_reports']
    });

    await admin.save();

    console.log('✅ Admin created successfully!');
    console.log('📧 Email: admin@localfinder.com');
    console.log('🔑 Password: Admin@123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
