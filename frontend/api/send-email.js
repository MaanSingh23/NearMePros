import nodemailer from 'nodemailer';

/**
 * Email relay (Vercel serverless function).
 * The backend runs on Render's free plan, which blocks outgoing SMTP, so it
 * hands emails (OTP codes) to this function, which sends them through Gmail.
 *
 * Vercel environment variables:
 *   EMAIL_USERNAME, EMAIL_PASSWORD (Gmail + App Password), EMAIL_RELAY_SECRET
 * Requests must send the same secret in the "x-relay-secret" header.
 *
 * POST { to, subject, html, text } -> sends the email
 * GET                                -> checks Gmail sign-in (for health checks)
 */
const transporter = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: { user: process.env.EMAIL_USERNAME, pass: process.env.EMAIL_PASSWORD },
    connectionTimeout: 10000
  });

const isEmail = (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;

export default async function handler(req, res) {
  const secret = process.env.EMAIL_RELAY_SECRET;
  if (!secret || req.headers['x-relay-secret'] !== secret) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }
  if (!process.env.EMAIL_USERNAME || !process.env.EMAIL_PASSWORD) {
    return res.status(503).json({ ok: false, message: 'Email is not configured on Vercel' });
  }

  try {
    if (req.method === 'GET') {
      await transporter().verify();
      return res.json({ ok: true });
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Method not allowed' });

    const { to, subject, html, text } = req.body || {};
    if (!isEmail(to) || typeof subject !== 'string' || !subject || subject.length > 200) {
      return res.status(400).json({ ok: false, message: 'Invalid email request' });
    }

    await transporter().sendMail({
      from: `"Near Me Pros" <${process.env.EMAIL_FROM || process.env.EMAIL_USERNAME}>`,
      to,
      subject,
      html: typeof html === 'string' ? html.slice(0, 50000) : undefined,
      text: typeof text === 'string' ? text.slice(0, 5000) : undefined
    });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Email relay failed:', error.message);
    return res.status(502).json({ ok: false, message: error.message.slice(0, 150) });
  }
}
