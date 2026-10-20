const nodemailer = require('nodemailer');

/**
 * Sends email through whichever provider is configured (first match wins):
 * - BREVO_API_KEY                          -> Brevo HTTPS API
 * - EMAIL_RELAY_URL + EMAIL_RELAY_SECRET   -> our Vercel function (frontend/api/send-email.js),
 *                                             which sends via Gmail; used because Render's
 *                                             free plan blocks outgoing SMTP
 * - EMAIL_HOST/...                         -> SMTP directly, e.g. Gmail with an App Password
 * EMAIL_FROM sets the sender address (defaults to EMAIL_USERNAME).
 */
const FROM_NAME = 'Near Me Pros';

let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.EMAIL_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.EMAIL_USERNAME, pass: process.env.EMAIL_PASSWORD },
      connectionTimeout: 10000
    });
  }
  return transporter;
};

const fromAddress = () => process.env.EMAIL_FROM || process.env.EMAIL_USERNAME;

const useRelay = () => Boolean(process.env.EMAIL_RELAY_URL && process.env.EMAIL_RELAY_SECRET);

const isEmailConfigured = () =>
  Boolean(process.env.BREVO_API_KEY || useRelay() || (process.env.EMAIL_HOST && process.env.EMAIL_USERNAME && process.env.EMAIL_PASSWORD));

const relayRequest = async (method, body) => {
  const response = await fetch(process.env.EMAIL_RELAY_URL, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-relay-secret': process.env.EMAIL_RELAY_SECRET },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(`Email relay ${response.status}: ${data.message || 'failed'}`);
  return data;
};

const sendViaBrevo = async ({ to, subject, html, text }) => {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: fromAddress() },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Brevo ${response.status}: ${(await response.text()).slice(0, 200)}`);
};

const sendEmail = async ({ to, subject, html, text }) => {
  if (process.env.BREVO_API_KEY) return sendViaBrevo({ to, subject, html, text });
  if (useRelay()) return relayRequest('POST', { to, subject, html, text });
  if (!isEmailConfigured()) throw new Error('Email is not configured');
  await getTransporter().sendMail({ from: `"${FROM_NAME}" <${fromAddress()}>`, to, subject, html, text });
};

/** Checks the configured provider can sign in (used by /health/config). */
const verifyEmailSetup = async () => {
  if (process.env.BREVO_API_KEY) return { provider: 'brevo', ok: true };
  if (useRelay()) {
    try {
      await relayRequest('GET');
      return { provider: 'vercel-relay', ok: true };
    } catch (error) {
      return { provider: 'vercel-relay', ok: false, error: error.message.slice(0, 120) };
    }
  }
  if (!isEmailConfigured()) return { provider: null, ok: false, error: 'not configured' };
  try {
    await getTransporter().verify();
    return { provider: 'smtp', ok: true };
  } catch (error) {
    return { provider: 'smtp', ok: false, error: error.message.slice(0, 120) };
  }
};

// Cached answer to "can we send email right now?" (re-checked every 5 minutes)
let availability = { ok: false, checkedAt: 0 };
const canSendEmail = async () => {
  if (process.env.BREVO_API_KEY) return true;
  if (Date.now() - availability.checkedAt < 5 * 60 * 1000) return availability.ok;
  const result = await verifyEmailSetup();
  availability = { ok: result.ok, checkedAt: Date.now() };
  return result.ok;
};

module.exports = { sendEmail, isEmailConfigured, verifyEmailSetup, canSendEmail };
