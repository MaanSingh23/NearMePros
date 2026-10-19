const crypto = require('crypto');
const Booking = require('../models/Booking');

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

class CompletionCodeError extends Error {
  constructor(message, status, extra = {}) {
    super(message);
    this.status = status;
    Object.assign(this, extra);
  }
}

/**
 * Checks the 4-digit code the customer gives the professional when the job is done.
 * Throws CompletionCodeError (status 428 = code needed, 400 = wrong, 429 = locked).
 */
const checkCompletionCode = async (bookingId, code) => {
  const booking = await Booking.findById(bookingId).select('+completionCode +completionAttempts +completionLockedUntil');
  if (!booking) throw new CompletionCodeError('Booking not found', 404);

  // Older bookings made before codes existed get one now
  if (!booking.completionCode) {
    booking.completionCode = String(crypto.randomInt(1000, 10000));
    await booking.save();
  }

  if (booking.completionLockedUntil && booking.completionLockedUntil > new Date()) {
    const minutes = Math.ceil((booking.completionLockedUntil - Date.now()) / 60000);
    throw new CompletionCodeError(`Too many wrong codes. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`, 429);
  }

  const given = String(code || '').replace(/\D/g, '');
  if (!given) {
    throw new CompletionCodeError('Ask the customer for the 4-digit completion code shown in their booking.', 428, { codeRequired: true });
  }

  if (given !== booking.completionCode) {
    booking.completionAttempts = (booking.completionAttempts || 0) + 1;
    if (booking.completionAttempts >= MAX_ATTEMPTS) {
      booking.completionAttempts = 0;
      booking.completionLockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      await booking.save();
      throw new CompletionCodeError(`Too many wrong codes. Completion is locked for ${LOCK_MINUTES} minutes.`, 429);
    }
    await booking.save();
    const left = MAX_ATTEMPTS - booking.completionAttempts;
    throw new CompletionCodeError(`Wrong completion code. ${left} attempt${left === 1 ? '' : 's'} left.`, 400, { codeRequired: true });
  }

  booking.completionAttempts = 0;
  booking.completionLockedUntil = undefined;
  booking.completedVerifiedAt = new Date();
  await booking.save();
  return true;
};

const sendCompletionCodeError = (res, error) =>
  res.status(error.status || 400).json({ message: error.message, ...(error.codeRequired ? { codeRequired: true } : {}) });

module.exports = { checkCompletionCode, CompletionCodeError, sendCompletionCodeError };
