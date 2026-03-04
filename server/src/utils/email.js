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

const sendInvoiceEmail = async (order, customer) => {
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.price.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.total.toFixed(2)}</td>
    </tr>
  `).join('');

  await sendEmail({
    to: customer.email,
    subject: `Invoice for Order ${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6366f1; margin: 0;">INVOICE</h1>
          <p style="color: #666; margin: 5px 0;">Order #${order.orderNumber}</p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <div style="display: flex; justify-content: space-between;">
            <div>
              <h3 style="margin: 0 0 10px 0; color: #333;">Bill To:</h3>
              <p style="margin: 5px 0; color: #666;">${customer.name}</p>
              <p style="margin: 5px 0; color: #666;">${customer.email}</p>
              ${order.shippingAddress ? `
                <p style="margin: 5px 0; color: #666;">${order.shippingAddress.street || ''}</p>
                <p style="margin: 5px 0; color: #666;">${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} ${order.shippingAddress.zipCode || ''}</p>
              ` : ''}
            </div>
            <div style="text-align: right;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Invoice Details:</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${orderDate}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Status:</strong> <span style="color: #10b981;">Paid</span></p>
              <p style="margin: 5px 0; color: #666;"><strong>Payment Method:</strong> ${order.payment?.method || 'N/A'}</p>
            </div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="text-align: right; margin-bottom: 30px;">
          <div style="display: inline-block; text-align: left; min-width: 250px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="color: #666;">Subtotal:</span>
              <span style="color: #333; font-weight: 500;">$${order.subtotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="color: #666;">Tax:</span>
              <span style="color: #333; font-weight: 500;">$${order.tax.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="color: #666;">Shipping:</span>
              <span style="color: #333; font-weight: 500;">$${order.shipping.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #6366f1; margin-top: 8px;">
              <span style="color: #333; font-weight: bold; font-size: 18px;">Total:</span>
              <span style="color: #6366f1; font-weight: bold; font-size: 18px;">$${order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 15px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; color: #166534; font-weight: 500;">✓ Payment Verified Successfully</p>
          <p style="margin: 5px 0 0 0; color: #15803d; font-size: 14px;">Thank you for your order!</p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #666; font-size: 12px; margin: 5px 0;">If you have any questions, please contact our support team.</p>
          <p style="color: #666; font-size: 12px; margin: 5px 0;">© ${new Date().getFullYear()} Enterprise Platform. All rights reserved.</p>
        </div>
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
  sendInvoiceEmail,
};
