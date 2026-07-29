const User = require('../models/User.model');
const OTP = require('../models/OTP.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const generateToken = require('../utils/generateToken');
const generateOtp = require('../utils/generateOtp');
const { sendEmail, otpEmailTemplate, resetPasswordEmailTemplate } = require('../utils/sendEmail');
const { generateResetToken, hashToken } = require('../utils/generateResetToken');
const MESSAGES = require('../constants/messages');
const OTP_EXPIRY_MINUTES = 10;

// ------------------------------------------------------------------
// POST /auth/register/send-otp   (Public).
// ------------------------------------------------------------------
exports.registerSendOtp = catchAsync(async (req, res, next) => {
  const { username, email, password, phone } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('An account with this email already exists.', 400));
  }

  await OTP.deleteMany({ email, purpose: 'register' });

  const otp = generateOtp();
  await OTP.create({
    email,
    otp,
    purpose: 'register',
    userData: { username, email, password, phone },
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
  });

  await sendEmail({
    to: email,
    subject: 'Verify your account — SEF Academy Store',
    html: otpEmailTemplate(otp, 'verify your account'),
  });

  res.status(200).json({
    success: true,
    message: `An OTP has been sent to ${email}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
  });
});

// ------------------------------------------------------------------
// POST /auth/verify-otp   (Public)
// ------------------------------------------------------------------
exports.verifyOtp = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  const otpRecord = await OTP.findOne({ email, purpose: 'register' }).sort({ createdAt: -1 });
  if (!otpRecord) {
    return next(new AppError('No pending registration found for this email. Please register again.', 400));
  }

  if (otpRecord.expiresAt < new Date()) {
    await otpRecord.deleteOne();
    return next(new AppError('OTP has expired. Please register again.', 400));
  }

  const isMatch = await otpRecord.compareOtp(otp);
  if (!isMatch) {
    return next(new AppError('Invalid OTP.', 400));
  }

  const { username, password, phone } = otpRecord.userData;

  const newUser = await User.create({
    username,
    email,
    password,
    phone,
    isVerified: true,
  });

  await otpRecord.deleteOne();

res.status(201).json({
  success: true,
  message: 'Account verified and created successfully. Please log in.',
  data: {
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    },
  });
});

// ------------------------------------------------------------------
// POST /auth/login   (Public)
// ------------------------------------------------------------------
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Incorrect email or password.', 401));
  }

  if (!user.isVerified) {
    return next(new AppError('Please verify your email before logging in.', 401));
  }

  const token = generateToken({ id: user._id, role: user.role });

  res.status(200).json({
    success: true,
    token,
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    },
  });
});

// ------------------------------------------------------------------
// POST /auth/logout   (User)
// ------------------------------------------------------------------
exports.logout = catchAsync(async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please discard your token on the client side.',
  });
});

// ------------------------------------------------------------------
// POST /auth/forgotpassword   (Public)
// ------------------------------------------------------------------
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('No account found with this email.', 404));
  }

  const { resetToken, hashedToken } = generateResetToken();

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const resetLink = `${clientUrl}/reset-password/${resetToken}`;

  try {
    await sendEmail({
      to: email,
      subject: 'Reset your password — SEF Academy Store',
      html: resetPasswordEmailTemplate(resetLink),
    });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('Failed to send the reset email. Please try again.', 500));
  }

  res.status(200).json({
    success: true,
    message: `A password reset link has been sent to ${email}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
  });
});

// ------------------------------------------------------------------
// PATCH /auth/resetpassword/:token   (Public)
// ------------------------------------------------------------------
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  const hashedToken = hashToken(token);

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: new Date() },
  });

  if (!user) {
    return next(new AppError('Invalid or expired reset link. Please request a new one.', 400));
  }

  user.password = newPassword; // pre-save hook will hash it
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password has been reset successfully. Please log in.',
  });
});
// ------------------------------------------------------------------
// GET /auth/me   (User)
// ------------------------------------------------------------------
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    success: true,
    data: { user },
  });
});
// ------------------------------------------------------------------
// PATCH /auth/users/:id/role   (Admin)
// ------------------------------------------------------------------
exports.changeUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError(MESSAGES.USER_NOT_FOUND, 404));
  }

  // Prevent an admin from accidentally demoting themselves.
  if (user._id.toString() === req.user._id.toString() && role !== 'admin') {
    return next(new AppError('You cannot change your own role.', 400));
  }

  user.role = role;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User role updated to "${role}" successfully.`,
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    },
  });
});
