const express = require('express');
const router = express.Router();
const multer = require('multer');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { uploadToImageKit } = require('../utils/imageKit');

const upload = multer({ storage: multer.memoryStorage() });

// Verify Aadhar card
router.post('/verify-aadhar', auth, upload.single('document'), async (req, res) => {
  try {
    const { file } = req;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    let docPath = '';
    try {
      const ikResponse = await uploadToImageKit(file.buffer, file.originalname);
      docPath = ikResponse.url;
    } catch (uploadError) {
      console.error('Error uploading verification doc to ImageKit:', uploadError);
      return res.status(500).json({ success: false, message: 'Upload failed' });
    }
    
    // 1. Instantly save the document as "Pending" for manual review
    await User.findByIdAndUpdate(req.user.userId, {
      $set: {
        'verificationStatus': 'pending'
      },
      $push: {
        'verificationDocs.identityDocs': {
          docType: 'aadhar',
          url: docPath,
          verified: false
        }
      }
    });

    res.json({ 
      success: true, 
      message: 'Document uploaded successfully! Please wait, our team will manually verify your documents before you can add services.',
    });
  } catch (error) {
    console.error('Verification Route Error:', error);
    res.status(500).json({ message: 'Internal server error during upload' });
  }
});

// Check verification status
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('verificationDocs isVerified verificationStatus');
    
    const docs = user.verificationDocs?.identityDocs || [];
    const hasAadharDoc = docs.some(d => d.docType === 'aadhar');

    res.json({
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
      aadharVerified: user.verificationDocs?.isAadharVerified || false,
      hasAadharDoc
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;