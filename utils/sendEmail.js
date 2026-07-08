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

module.exports = { sendEmail, otpEmailTemplate, resetPasswordEmailTemplate };