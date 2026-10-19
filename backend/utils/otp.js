const crypto = require('crypto');
const Otp = require('../models/Otp');
const { sendEmail, isEmailConfigured } = require('./mailer');

const CODE_LENGTH = 6;
const VALID_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_AFTER_SECONDS = 60;
const MAX_PER_HOUR = 5;

const PURPOSE_TEXT = {
  register: { subject: 'Verify your email', action: 'verify your email and create your account' },
  login: { subject: 'Your login code', action: 'log in to your account' },
  'login-2fa': { subject: 'Your login verification code', action: 'finish logging in (2-step verification)' },
  'reset-password': { subject: 'Reset your password', action: 'reset your password' },
  'change-password': { subject: 'Confirm password change', action: 'change your password' },
  'toggle-2fa': { subject: 'Confirm 2-step verification change', action: 'change your 2-step verification setting' },
  'change-phone': { subject: 'Confirm phone number change', action: 'change the phone number on your account' }
};

class OtpError extends Error {
  constructor(message, status = 400, extra = {}) {
    super(message);
    this.status = status;
    Object.assign(this, extra);
  }
}

// Hash with a server secret so codes can't be read from the database
const hashCode = (email, purpose, code) =>
  crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'your-secret-key')
    .update(`${email.toLowerCase()}|${purpose}|${code}`)
    .digest('hex');

const generateCode = () => String(crypto.randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');

const maskEmail = (email) => {
  const [name, domain] = String(email).split('@');
  if (!domain) return email;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${'•'.repeat(Math.max(1, name.length - visible.length))}@${domain}`;
};

const emailTemplate = (code, purpose, name) => {
  const { action } = PURPOSE_TEXT[purpose];
  const text = `Your Near Me Pros code is ${code}. Use it to ${action}. It expires in ${VALID_MINUTES} minutes. Never share this code with anyone - our team will never ask for it.`;
  const html = `
  <div style="background:#f5f5f4;padding:32px 16px;font-family:Segoe UI,Arial,sans-serif">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e7e5e4">
      <div style="background:#059669;padding:20px 28px;color:#ffffff">
        <div style="font-size:20px;font-weight:800">Near Me Pros</div>
        <div style="font-size:13px;opacity:.85">Verified local professionals</div>
      </div>
      <div style="padding:28px">
        <p style="margin:0 0 8px;color:#1c1917;font-size:16px">Hi${name ? ` ${name}` : ''},</p>
        <p style="margin:0 0 20px;color:#57534e;font-size:14px;line-height:1.6">Use this code to ${action}:</p>
        <div style="text-align:center;margin:0 0 20px">
          <span style="display:inline-block;letter-spacing:10px;font-size:34px;font-weight:800;color:#1c1917;background:#ecfdf5;border:1px dashed #10b981;border-radius:14px;padding:14px 22px">${code}</span>
        </div>
        <p style="margin:0 0 6px;color:#57534e;font-size:13px">This code expires in <b>${VALID_MINUTES} minutes</b>.</p>
        <p style="margin:0;color:#b91c1c;font-size:13px"><b>Never share this code</b> with anyone - Near Me Pros staff will never ask for it.</p>
        <hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0">
        <p style="margin:0;color:#a8a29e;font-size:12px;line-height:1.5">If you didn't request this, you can ignore this email - your account is safe.</p>
      </div>
    </div>
  </div>`;
  return { text, html };
};

/**
 * Creates a code for (email, purpose) and emails it.
 * Returns { maskedEmail, expiresInSeconds, resendInSeconds, devCode? }.
 */
const sendOtp = async ({ email, purpose, name }) => {
  if (!PURPOSE_TEXT[purpose]) throw new OtpError('Invalid verification purpose');
  const normalized = String(email).toLowerCase().trim();

  // Throttling: one code per minute, a few per hour
  const latest = await Otp.findOne({ email: normalized, purpose }).sort({ createdAt: -1 });
  if (latest) {
    const waited = (Date.now() - latest.createdAt.getTime()) / 1000;
    if (waited < RESEND_AFTER_SECONDS) {
      throw new OtpError(`Please wait ${Math.ceil(RESEND_AFTER_SECONDS - waited)} seconds before requesting a new code.`, 429, {
        resendInSeconds: Math.ceil(RESEND_AFTER_SECONDS - waited)
      });
    }
  }
  const recent = await Otp.countDocuments({ email: normalized, createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) } });
  if (recent >= MAX_PER_HOUR) {
    throw new OtpError('Too many codes requested. Please try again in an hour.', 429);
  }

  const code = generateCode();
  // Only the newest code for this purpose stays valid
  await Otp.deleteMany({ email: normalized, purpose });
  await Otp.create({
    email: normalized,
    purpose,
    codeHash: hashCode(normalized, purpose, code),
    expiresAt: new Date(Date.now() + VALID_MINUTES * 60 * 1000)
  });

  const devMode = process.env.OTP_DEV_MODE === 'true';
  if (isEmailConfigured()) {
    try {
      const { html, text } = emailTemplate(code, purpose, name);
      await sendEmail({ to: normalized, subject: `${code} is your Near Me Pros code - ${PURPOSE_TEXT[purpose].subject}`, html, text });
    } catch (error) {
      console.error('OTP email failed:', error.message);
      if (!devMode) {
        await Otp.deleteMany({ email: normalized, purpose });
        throw new OtpError("We couldn't send the verification email right now. Please try again in a few minutes.", 503);
      }
    }
  } else if (!devMode) {
    await Otp.deleteMany({ email: normalized, purpose });
    throw new OtpError('Email verification is not set up on the server yet. Please contact support.', 503);
  }

  if (devMode) console.log(`[OTP dev mode] ${purpose} code for ${normalized}: ${code}`);

  return {
    maskedEmail: maskEmail(normalized),
    expiresInSeconds: VALID_MINUTES * 60,
    resendInSeconds: RESEND_AFTER_SECONDS,
    // Testing only - never enable OTP_DEV_MODE on the live site
    ...(devMode ? { devCode: code } : {})
  };
};

/** Checks a code; consumes it on success. Throws OtpError with a clear message otherwise. */
const verifyOtp = async ({ email, purpose, code }) => {
  const normalized = String(email || '').toLowerCase().trim();
  const cleanCode = String(code || '').replace(/\D/g, '');
  if (cleanCode.length !== CODE_LENGTH) throw new OtpError(`Enter the ${CODE_LENGTH}-digit code from your email.`);

  const otp = await Otp.findOne({ email: normalized, purpose }).sort({ createdAt: -1 });
  if (!otp || otp.expiresAt < new Date()) {
    throw new OtpError('This code has expired. Please request a new one.', 400, { expired: true });
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    await otp.deleteOne();
    throw new OtpError('Too many wrong attempts. Please request a new code.', 429, { expired: true });
  }

  const expected = Buffer.from(otp.codeHash, 'hex');
  const given = Buffer.from(hashCode(normalized, purpose, cleanCode), 'hex');
  if (!crypto.timingSafeEqual(expected, given)) {
    otp.attempts += 1;
    await otp.save();
    const left = MAX_ATTEMPTS - otp.attempts;
    throw new OtpError(left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many wrong attempts. Please request a new code.', 400, {
      attemptsLeft: left
    });
  }

  await otp.deleteOne();
  return true;
};

/** Express helper: send an OtpError as JSON. */
const sendOtpError = (res, error) => {
  if (error instanceof OtpError) {
    return res.status(error.status).json({
      message: error.message,
      ...(error.resendInSeconds ? { resendInSeconds: error.resendInSeconds } : {}),
      ...(error.attemptsLeft !== undefined ? { attemptsLeft: error.attemptsLeft } : {}),
      ...(error.expired ? { expired: true } : {})
    });
  }
  console.error(error);
  return res.status(500).json({ message: 'Server error' });
};

module.exports = { sendOtp, verifyOtp, sendOtpError, OtpError, maskEmail };
