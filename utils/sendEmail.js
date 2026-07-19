const nodemailer = require('nodemailer');

// Reusable transporter + send function.
// Usage: await sendEmail({ to, subject, html })
const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: Number(process.env.EMAIL_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"SEF Academy Store" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
};

// Ready-made template for the registration / password-reset OTP email
const otpEmailTemplate = (otp, purpose = 'verify your account') => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
    <h2>Your One-Time Password</h2>
    <p>Use the code below to ${purpose}. It expires in 10 minutes.</p>
    <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; background: #f4f4f4; padding: 16px; text-align: center; border-radius: 8px;">
      ${otp}
    </div>
    <p>If you did not request this, please ignore this email.</p>
  </div>
`;

// Ready-made template for the "forgot password" email — contains a
// clickable link (not a code) with the raw reset token embedded in the URL.
const resetPasswordEmailTemplate = (resetLink) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
    <h2>Reset Your Password</h2>
    <p>We received a request to reset your password. Click the button below to choose a new one. This link expires in 10 minutes.</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${resetLink}" style="background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
        Reset Password
      </a>
    </div>
    <p>If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #555;">${resetLink}</p>
    <p>If you did not request this, please ignore this email — your password will remain unchanged.</p>
  </div>
`;


// Order confirmation email — dark-themed, with a per-item total column,
// order ID, and payment method 
const orderConfirmationEmailTemplate = (order, username) => {
  const itemsRows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px; border-bottom:1px solid #333; color:#eee;">${item.name}</td>
          <td style="padding:10px; border-bottom:1px solid #333; color:#eee; text-align:center;">${item.quantity}</td>
          <td style="padding:10px; border-bottom:1px solid #333; color:#eee;">${item.price} EGP</td>
          <td style="padding:10px; border-bottom:1px solid #333; color:#eee;">${(item.price * item.quantity).toFixed(2)} EGP</td>
        </tr>`
    )
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; background:#121212; color:#eee; padding:24px; border-radius:10px;">
      <h2 style="color:#fff; margin-top:0;">Order Confirmation</h2>
      <p>Hello <strong>${username}</strong>,</p>
      <p>Thank you for your order. Your order has been placed successfully.</p>
      <p><strong>Order ID:</strong> ${order._id}</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr>
            <th style="text-align:left; padding:10px; border-bottom:2px solid #444; color:#aaa;">Product</th>
            <th style="text-align:center; padding:10px; border-bottom:2px solid #444; color:#aaa;">Quantity</th>
            <th style="text-align:left; padding:10px; border-bottom:2px solid #444; color:#aaa;">Unit Price</th>
            <th style="text-align:left; padding:10px; border-bottom:2px solid #444; color:#aaa;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>
      <p><strong>Subtotal:</strong> ${order.subtotal} EGP</p>
      <p><strong>Shipping:</strong> ${order.shippingFee} EGP</p>
      <p><strong>Tax:</strong> ${order.tax} EGP</p>
      <p><strong>Discount:</strong> ${order.discount} EGP</p>
      <p style="font-size:18px;"><strong>Total: ${order.totalPrice} EGP</strong></p>
      <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
    </div>
  `;
};

// Order status update email — used whenever an admin changes an order's status
const orderStatusUpdateEmailTemplate = (order) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
    <h2>Order Update</h2>
    <p>Your order status has been updated to: <strong>${order.status}</strong></p>
    <p>Order total: ${order.totalPrice} EGP</p>
  </div>
`;

// Order cancelled email
const orderCancelledEmailTemplate = (order) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
    <h2>Order Cancelled</h2>
    <p>Your order has been cancelled, and any reserved stock has been released.</p>
    <p>Order total: ${order.totalPrice} EGP</p>
  </div>
`;

module.exports = {
  sendEmail,
  otpEmailTemplate,
  resetPasswordEmailTemplate,
  orderConfirmationEmailTemplate,
  orderStatusUpdateEmailTemplate,
  orderCancelledEmailTemplate,
};