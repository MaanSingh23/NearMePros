const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const { sendOtp, verifyOtp, sendOtpError, maskEmail } = require('../utils/otp');
const { canSendEmail } = require('../utils/mailer');

// Sign-up requires an email code whenever the server can send email.
// (If email isn't working, sign-up still works and the account is marked unverified.)
const emailVerificationRequired = async () => process.env.OTP_DEV_MODE === 'true' || canSendEmail();

// Check email once at startup so the first visitor doesn't wait for it
canSendEmail().catch(() => {});

// Tells the website which sign-in options are available right now
router.get('/config', async (req, res) => {
  const emailWorks = await emailVerificationRequired();
  res.json({ emailVerificationRequired: emailWorks, emailLoginAvailable: emailWorks });
});

const JWT_SECRET = () => process.env.JWT_SECRET || 'your-secret-key';
const PUBLIC_OTP_PURPOSES = ['register', 'login', 'reset-password'];

// Simple per-IP limit on code requests (on top of the per-email limits)
const ipBuckets = new Map();
const tooManyFromIp = (req, limit = 20) => {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip;
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
};

const validate = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;
  const first = errors.array()[0];
  return res.status(400).json({ message: first.msg === 'Invalid value' ? `Please check your ${first.path}` : first.msg, errors: errors.array() });
};

const issueToken = (user) => jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET(), { expiresIn: '7d' });

const authResponse = (user) => ({
  token: issueToken(user),
  user: {
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar,
    isVerified: user.isVerified,
    emailVerified: user.emailVerified,
    twoFactorEnabled: user.twoFactorEnabled
  }
});

/**
 * Send a verification code by email.
 * POST /api/auth/otp/send { email, purpose: register | login | reset-password }
 */
router.post('/otp/send', [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('purpose').isIn(PUBLIC_OTP_PURPOSES).withMessage('Invalid request')
], async (req, res) => {
  if (validate(req, res)) return;
  if (tooManyFromIp(req)) return res.status(429).json({ message: 'Too many requests. Please try again later.' });

  const { email, purpose } = req.body;
  try {
    const user = await User.findOne({ email });

    if (purpose === 'register' && user) {
      return res.status(400).json({ message: 'An account with this email already exists. Please log in instead.' });
    }
    // For login/reset, don't reveal whether an email is registered
    if (purpose !== 'register' && !user) {
      return res.json({ message: 'If an account exists for this email, we have sent a code.', maskedEmail: maskEmail(email), resendInSeconds: 60 });
    }

    const result = await sendOtp({ email, purpose, name: user?.name || req.body.name });
    res.json({ message: `We sent a 6-digit code to ${result.maskedEmail}`, ...result });
  } catch (error) {
    sendOtpError(res, error);
  }
});

// Register (email must be verified with an OTP first)
router.post('/register', [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('phone').isMobilePhone().withMessage('Enter a valid phone number')
], async (req, res) => {
  if (validate(req, res)) return;

  try {
    const { email, password, name, phone, role, location, otp } = req.body;

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'An account with this email already exists. Please log in instead.' });
    }

    const verificationRequired = await emailVerificationRequired();
    if (verificationRequired) {
      if (!otp) return res.status(400).json({ message: 'Enter the verification code sent to your email', otpRequired: true });
      await verifyOtp({ email, purpose: 'register', code: otp });
    }

    const user = new User({
      email,
      password,
      name,
      phone,
      // Only customer or provider accounts can be created here
      role: role === 'provider' ? 'provider' : 'user',
      emailVerified: verificationRequired,
      location: location || {
        type: 'Point',
        coordinates: [75.8573, 30.9010], // Default Ludhiana coordinates
        address: 'Ludhiana, Punjab, India'
      }
    });
    await user.save();

    res.status(201).json(authResponse(user));
  } catch (error) {
    sendOtpError(res, error);
  }
});

// Login with password (asks for an email code too when 2-step verification is on)
router.post('/login', [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Enter your password')
], async (req, res) => {
  if (validate(req, res)) return;

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: 'Incorrect email or password' });
    }
    if (user.isActive === false) {
      return res.status(403).json({ message: 'This account has been deactivated. Please contact support.' });
    }

    if (user.twoFactorEnabled) {
      const otp = await sendOtp({ email, purpose: 'login-2fa', name: user.name });
      // Short-lived proof that the password step passed
      const mfaToken = jwt.sign({ userId: user._id, stage: 'mfa' }, JWT_SECRET(), { expiresIn: '10m' });
      return res.json({ otpRequired: true, mfaToken, ...otp });
    }

    res.json(authResponse(user));
  } catch (error) {
    sendOtpError(res, error);
  }
});

const userFromMfaToken = async (mfaToken) => {
  try {
    const payload = jwt.verify(mfaToken, JWT_SECRET());
    if (payload.stage !== 'mfa') return null;
    return User.findById(payload.userId);
  } catch {
    return null;
  }
};

// Second step of 2-step login
router.post('/login/verify', async (req, res) => {
  try {
    const user = await userFromMfaToken(req.body.mfaToken);
    if (!user) return res.status(401).json({ message: 'Your login session expired. Please enter your password again.', restart: true });
    await verifyOtp({ email: user.email, purpose: 'login-2fa', code: req.body.otp });
    res.json(authResponse(user));
  } catch (error) {
    sendOtpError(res, error);
  }
});

router.post('/login/resend', async (req, res) => {
  try {
    const user = await userFromMfaToken(req.body.mfaToken);
    if (!user) return res.status(401).json({ message: 'Your login session expired. Please enter your password again.', restart: true });
    const otp = await sendOtp({ email: user.email, purpose: 'login-2fa', name: user.name });
    res.json(otp);
  } catch (error) {
    sendOtpError(res, error);
  }
});

// Passwordless login with an email code
router.post('/login-otp', [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('otp').notEmpty().withMessage('Enter the code from your email')
], async (req, res) => {
  if (validate(req, res)) return;
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).json({ message: 'This code has expired. Please request a new one.' });
    await verifyOtp({ email: user.email, purpose: 'login', code: req.body.otp });
    if (user.isActive === false) {
      return res.status(403).json({ message: 'This account has been deactivated. Please contact support.' });
    }
    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }
    res.json(authResponse(user));
  } catch (error) {
    sendOtpError(res, error);
  }
});

// Forgot password: reset with an email code
router.post('/reset-password', [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('otp').notEmpty().withMessage('Enter the code from your email'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  if (validate(req, res)) return;
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).json({ message: 'This code has expired. Please request a new one.' });
    await verifyOtp({ email: user.email, purpose: 'reset-password', code: req.body.otp });
    user.password = req.body.newPassword;
    user.passwordChangedAt = new Date();
    user.emailVerified = true;
    await user.save();
    res.json({ message: 'Password changed. You can now log in with your new password.' });
  } catch (error) {
    sendOtpError(res, error);
  }
});

module.exports = router;
