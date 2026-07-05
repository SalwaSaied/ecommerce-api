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

module.exports = { sendEmail, otpEmailTemplate };
