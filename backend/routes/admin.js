const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const VerificationRequest = require('../models/VerificationRequest');
const adminAuth = require('../middleware/adminAuth');

const handleToggleProviderStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const provider = await User.findById(req.params.id);

    if (!provider || provider.role !== 'provider') {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    provider.isActive = Boolean(isActive);
    await provider.save();

    await Service.updateMany(
      { providerId: provider._id },
      { isActive: provider.isActive }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(provider._id.toString()).emit('accountUpdate', {
        isActive: provider.isActive,
        message: provider.isActive
          ? 'Your account has been activated'
          : 'Your account has been deactivated'
      });
    }

    return res.json({
      success: true,
      message: `Provider ${provider.isActive ? 'activated' : 'deactivated'} successfully`,
      provider
    });
  } catch (error) {
    console.error('Error toggling provider status:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating provider status'
    });
  }
};

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort('-createdAt');

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

// Get all bookings
router.get('/bookings', adminAuth, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('userId', 'name email phone')
      .populate('providerId', 'name email phone')
      .populate('serviceId', 'name category price')
      .sort('-createdAt');

    res.json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bookings'
    });
  }
});

// Get all services
router.get('/services', adminAuth, async (req, res) => {
  try {
    const services = await Service.find()
      .populate('providerId', 'name email phone isVerified')
      .sort('-createdAt');

    res.json({
      success: true,
      count: services.length,
      services
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching services'
    });
  }
});

// Get all pending provider verifications
router.get('/verifications/pending', adminAuth, async (req, res) => {
  try {
    const pendingVerifications = await VerificationRequest.find({ 
      status: 'pending' 
    })
    .populate('providerId', 'name email phone createdAt')
    .sort('-createdAt');
    
    res.json(pendingVerifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all pending providers
router.get('/pending-providers', adminAuth, async (req, res) => {
  try {
    const pendingProviders = await User.find({
      role: 'provider',
      isVerified: false,
      verificationStatus: { $ne: 'rejected' }
    })
      .select('-password')
      .sort('-createdAt');

    res.json({
      success: true,
      count: pendingProviders.length,
      providers: pendingProviders
    });
  } catch (error) {
    console.error('Error fetching pending providers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching pending providers'
    });
  }
});

// Get all verification requests
router.get('/verifications', adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const verifications = await VerificationRequest.find(query)
      .populate('providerId', 'name email phone avatar isVerified')
      .populate('adminId', 'name')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await VerificationRequest.countDocuments(query);

    res.json({
      verifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve provider directly
router.patch('/verify-provider/:id', adminAuth, async (req, res) => {
  try {
    const provider = await User.findById(req.params.id);

    if (!provider || provider.role !== 'provider') {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    provider.isVerified = true;
    provider.verificationStatus = 'approved';
    provider.verificationDocs.isAadharVerified = true;
    await provider.save();

    await Service.updateMany(
      { providerId: provider._id },
      { isVerified: true }
    );

    await VerificationRequest.updateMany(
      { providerId: provider._id, status: { $in: ['pending', 'under_review', 'rejected'] } },
      {
        status: 'approved',
        adminId: req.user.userId,
        reviewedAt: new Date(),
        rejectionReason: ''
      }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(provider._id.toString()).emit('verificationUpdate', {
        status: 'approved',
        message: 'Congratulations! Your verification has been approved.'
      });
    }

    res.json({
      success: true,
      message: 'Provider verified successfully',
      provider
    });
  } catch (error) {
    console.error('Error verifying provider:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while verifying provider'
    });
  }
});

// Reject provider directly
router.patch('/reject-provider/:id', adminAuth, async (req, res) => {
  try {
    const { rejectionReason = 'Verification request rejected by admin' } = req.body;
    const provider = await User.findById(req.params.id);

    if (!provider || provider.role !== 'provider') {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    provider.isVerified = false;
    provider.verificationStatus = 'rejected';
    await provider.save();

    await Service.updateMany(
      { providerId: provider._id },
      { isVerified: false }
    );

    await VerificationRequest.updateMany(
      { providerId: provider._id, status: { $in: ['pending', 'under_review', 'approved'] } },
      {
        status: 'rejected',
        adminId: req.user.userId,
        reviewedAt: new Date(),
        rejectionReason
      }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(provider._id.toString()).emit('verificationUpdate', {
        status: 'rejected',
        message: `Your verification was rejected. Reason: ${rejectionReason}`
      });
    }

    res.json({
      success: true,
      message: 'Provider rejected successfully',
      provider
    });
  } catch (error) {
    console.error('Error rejecting provider:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while rejecting provider'
    });
  }
});

// Approve/Reject provider verification
router.put('/verifications/:id', adminAuth, async (req, res) => {
  try {
    const { status, adminNotes, rejectionReason } = req.body;
    
    const verificationRequest = await VerificationRequest.findById(req.params.id);
    if (!verificationRequest) {
      return res.status(404).json({ message: 'Verification request not found' });
    }

    verificationRequest.status = status;
    verificationRequest.adminId = req.user.userId;
    verificationRequest.adminNotes = adminNotes;
    verificationRequest.rejectionReason = rejectionReason;
    verificationRequest.reviewedAt = new Date();

    await verificationRequest.save();

    // Update user verification status if approved
    if (status === 'approved') {
      await User.findByIdAndUpdate(verificationRequest.providerId, {
        isVerified: true,
        'verificationDocs.isAadharVerified': true
      });

      // Update all services of this provider
      await Service.updateMany(
        { providerId: verificationRequest.providerId },
        { isVerified: true }
      );
    }

    // Get io instance from app
    const io = req.app.get('io');
    
    // Send real-time notification to provider
    if (io) {
      io.to(verificationRequest.providerId.toString()).emit('verificationUpdate', {
        status,
        message: status === 'approved' 
          ? 'Congratulations! Your verification has been approved.'
          : `Your verification was rejected. Reason: ${rejectionReason}`
      });
    }

    res.json({ 
      message: `Verification ${status} successfully`,
      verificationRequest 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all providers (for admin)
router.get('/providers', adminAuth, async (req, res) => {
  try {
    const { verified, isActive, page = 1, limit = 10 } = req.query;
    const query = { role: 'provider' };
    
    if (verified !== undefined) {
      query.isVerified = verified === 'true';
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const providers = await User.find(query)
      .select('-password')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    // Get service counts for each provider
    const providersWithStats = await Promise.all(
      providers.map(async (provider) => {
        const services = await Service.countDocuments({ providerId: provider._id });
        const bookings = await Booking.countDocuments({ providerId: provider._id });
        const avgRating = await Service.aggregate([
          { $match: { providerId: provider._id } },
          { $group: { _id: null, avgRating: { $avg: '$rating' } } }
        ]);

        return {
          ...provider.toObject(),
          serviceCount: services,
          bookingCount: bookings,
          avgRating: avgRating[0]?.avgRating || 0
        };
      })
    );

    res.json({
      success: true,
      providers: providersWithStats,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Activate/deactivate provider
router.patch('/provider/:id/toggle-status', adminAuth, handleToggleProviderStatus);

// Backward-compatible toggle route
router.put('/providers/:id/toggle-status', adminAuth, handleToggleProviderStatus);

// Delete provider
router.delete('/provider/:id', adminAuth, async (req, res) => {
  try {
    const provider = await User.findById(req.params.id);

    if (!provider || provider.role !== 'provider') {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    await Promise.all([
      Service.deleteMany({ providerId: provider._id }),
      VerificationRequest.deleteMany({ providerId: provider._id }),
      Booking.deleteMany({ providerId: provider._id }),
      provider.deleteOne()
    ]);

    res.json({
      success: true,
      message: 'Provider deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting provider:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting provider'
    });
  }
});

// Get dashboard stats
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalProviders = await User.countDocuments({ role: 'provider' });
    const pendingVerifications = await User.countDocuments({
      role: 'provider',
      isVerified: false,
      verificationStatus: { $ne: 'rejected' }
    });
    const totalBookings = await Booking.countDocuments();
    const totalServices = await Service.countDocuments();
    
    // Recent bookings
    const recentBookings = await Booking.find()
      .populate('userId', 'name')
      .populate('serviceId', 'name')
      .sort('-createdAt')
      .limit(5);

    // Revenue stats (if you have payment system)
    const revenueToday = await Booking.aggregate([
      { 
        $match: { 
          createdAt: { 
            $gte: new Date(new Date().setHours(0,0,0,0)) 
          } 
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.json({
      stats: {
        totalUsers,
        totalProviders,
        pendingVerifications,
        totalBookings,
        totalServices,
        revenueToday: revenueToday[0]?.total || 0
      },
      recentBookings
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get revenue reports
router.get('/revenue', adminAuth, async (req, res) => {
  try {
    const revenueStatuses = ['confirmed', 'in-progress', 'completed'];
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const lastSevenDays = new Date();
    lastSevenDays.setDate(lastSevenDays.getDate() - 6);
    lastSevenDays.setHours(0, 0, 0, 0);

    const [totals, monthlyTrend, dailyTrend, statusBreakdown] = await Promise.all([
      Booking.aggregate([
        { $match: { status: { $in: revenueStatuses } } },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$totalAmount' },
            todayEarnings: {
              $sum: {
                $cond: [{ $gte: ['$createdAt', startOfToday] }, '$totalAmount', 0]
              }
            },
            monthlyEarnings: {
              $sum: {
                $cond: [{ $gte: ['$createdAt', startOfMonth] }, '$totalAmount', 0]
              }
            }
          }
        }
      ]),
      Booking.aggregate([
        { $match: { status: { $in: revenueStatuses } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            revenue: { $sum: '$totalAmount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      Booking.aggregate([
        {
          $match: {
            status: { $in: revenueStatuses },
            createdAt: { $gte: lastSevenDays }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            revenue: { $sum: '$totalAmount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),
      Booking.aggregate([
        { $match: { status: { $in: revenueStatuses } } },
        {
          $group: {
            _id: '$status',
            revenue: { $sum: '$totalAmount' }
          }
        }
      ])
    ]);

    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
    const dayFormatter = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' });

    res.json({
      success: true,
      summary: {
        totalEarnings: totals[0]?.totalEarnings || 0,
        todayEarnings: totals[0]?.todayEarnings || 0,
        monthlyEarnings: totals[0]?.monthlyEarnings || 0
      },
      monthlyTrend: monthlyTrend.map((item) => ({
        label: monthFormatter.format(new Date(item._id.year, item._id.month - 1, 1)),
        revenue: item.revenue
      })),
      dailyTrend: dailyTrend.map((item) => ({
        label: dayFormatter.format(new Date(item._id.year, item._id.month - 1, item._id.day)),
        revenue: item.revenue
      })),
      statusBreakdown: statusBreakdown.map((item) => ({
        status: item._id,
        revenue: item.revenue
      }))
    });
  } catch (error) {
    console.error('Error fetching revenue report:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching revenue report'
    });
  }
});

module.exports = router;
