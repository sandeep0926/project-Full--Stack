import nodemailer from 'nodemailer';
import logger from './logger.js';

let emailDisabledLogged = false;

const createTransporter = () => {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    if (!emailDisabledLogged) {
      logger.warn('Email transport not configured (EMAIL_* env vars missing) - skipping email sends');
      emailDisabledLogged = true;
    }
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();
  if (!transporter) return;

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `sandeep-project <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text,
    });
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Email send failed: ${error.message}`);
    throw error;
  }
};

const sendVerificationEmail = async (user, token) => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify Your Email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Email Verification</h2>
        <p>Hi ${user.name},</p>
        <p>Please click the button below to verify your email address:</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #666; font-size: 12px;">This link expires in 24 hours.</p>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Password Reset</h2>
        <p>Hi ${user.name},</p>
        <p>You requested a password reset. Click the button below:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 12px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
      </div>
    `,
  });
};

const sendOTPEmail = async (user, otp) => {
  await sendEmail({
    to: user.email,
    subject: 'Your OTP Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Two-Factor Authentication</h2>
        <p>Hi ${user.name},</p>
        <p>Your one-time password is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6366f1; padding: 16px; text-align: center;">
          ${otp}
        </div>
        <p style="color: #666; font-size: 12px;">This code expires in 5 minutes.</p>
      </div>
    `,
  });
};

const sendLoginNotificationEmail = async (user, loginInfo = {}) => {
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  await sendEmail({
    to: user.email,
    subject: 'New Login to Your Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">New Login Detected</h2>
        <p>Hi ${user.name},</p>
        <p>A new login was detected on your account:</p>
        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Time:</strong> ${time}</p>
          <p style="margin: 4px 0;"><strong>IP:</strong> ${loginInfo.ip || 'Unknown'}</p>
          <p style="margin: 4px 0;"><strong>Browser:</strong> ${loginInfo.browser || 'Unknown'}</p>
        </div>
        <p style="color: #666; font-size: 12px;">If this wasn't you, please change your password immediately.</p>
      </div>
    `,
  });
};

const sendWelcomeEmail = async (user) => {
  await sendEmail({
    to: user.email,
    subject: 'Welcome to Enterprise Platform!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Welcome, ${user.name}! 🎉</h2>
        <p>Your account has been created successfully.</p>
        <p>You can now access all features of the Enterprise Platform.</p>
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
          Go to Dashboard
        </a>
        <p style="color: #666; font-size: 12px;">If you didn't create this account, please contact support.</p>
      </div>
    `,
  });
};

export {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOTPEmail,
  sendLoginNotificationEmail,
  sendWelcomeEmail,
};
