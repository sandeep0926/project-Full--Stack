const nodemailer = require('nodemailer');
const logger = require('./logger');

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const transporter = createTransporter();
        const info = await transporter.sendMail({
            from: `"Enterprise Platform" <${process.env.EMAIL_FROM}>`,
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

module.exports = {
    sendEmail,
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendOTPEmail,
};
