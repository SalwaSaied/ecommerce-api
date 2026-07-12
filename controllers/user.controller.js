const User = require('../models/User.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary');
const MESSAGES = require('../constants/messages');

// ------------------------------------------------------------------
// POST /users/add   (Admin)
// ------------------------------------------------------------------
exports.addUser = catchAsync(async (req, res, next) => {
  const { username, email, password, phone, role } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('An account with this email already exists.', 400));
  }

  const newUser = await User.create({
    username,
    email,
    password,
    phone,
    role: role || 'customer',
    isVerified: true,
  });

  res.status(201).json({
    success: true,
    message: 'User created successfully.',
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
// GET /users/all   (Admin)
// ------------------------------------------------------------------
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.query.role) {
    filter.role = req.query.role;
  }

  if (req.query.isVerified !== undefined) {
    filter.isVerified = req.query.isVerified === 'true';
  }

  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    filter.$or = [{ username: searchRegex }, { email: searchRegex }];
  }

  const [users, totalFilteredUsers] = await Promise.all([
    User.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    totalFilteredUsers,
    page,
    pages: Math.ceil(totalFilteredUsers / limit),
    countReturned: users.length,
    data: users,
  });
});

// ------------------------------------------------------------------
// GET /users/:id   (Admin)
// ------------------------------------------------------------------
exports.getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError(MESSAGES.USER_NOT_FOUND, 404));
  }

  res.status(200).json({
    success: true,
    data: { user },
  });
});

// ------------------------------------------------------------------
// PATCH /users/:id   (User)
// ------------------------------------------------------------------
exports.updateUser = catchAsync(async (req, res, next) => {
  const targetId = req.params.id;

  const isOwner = req.user._id.toString() === targetId;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    return next(new AppError('You are not allowed to update this user.', 403));
  }

  const user = await User.findById(targetId);
  if (!user) {
    return next(new AppError(MESSAGES.USER_NOT_FOUND, 404));
  }

  const { username, phone, addresses } = req.body;

  if (username === undefined && phone === undefined && addresses === undefined && !req.file) {
    return next(new AppError('Please provide at least one field to update.', 400));
  }

  if (username !== undefined) user.username = username;
  if (phone !== undefined) user.phone = phone;

  if (addresses !== undefined) {
    let parsedAddresses;
    try {
      parsedAddresses = JSON.parse(addresses);
    } catch (err) {
      return next(new AppError('addresses must be a valid JSON array.', 400));
    }

    if (!Array.isArray(parsedAddresses)) {
      return next(new AppError('addresses must be an array.', 400));
    }

    user.addresses = parsedAddresses;
  }

  // Upload the NEW image first, delete the OLD one only after that
  // succeeds — avoids leaving the user with no avatar if the upload fails.
  if (req.file) {
    const uploaded = await uploadToCloudinary(req.file.buffer, 'ecommerce/avatars');
    const oldAvatarPublicId = user.avatar && user.avatar.publicId;

    user.avatar = { url: uploaded.url, publicId: uploaded.public_id };

    if (oldAvatarPublicId) {
      await deleteFromCloudinary(oldAvatarPublicId);
    }
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'User updated successfully.',
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        addresses: user.addresses,
        avatar: user.avatar,
        role: user.role,
      },
    },
  });
});

// ------------------------------------------------------------------
// POST /users/change-password   (User)
// ------------------------------------------------------------------
exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new AppError('Current password is incorrect.', 401));
  }

  const isSamePassword = await user.comparePassword(newPassword);
  if (isSamePassword) {
    return next(new AppError('New password must be different from the current password.', 400));
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully.',
  });
});

// ------------------------------------------------------------------
// DELETE /users/:id   (Admin)
// ------------------------------------------------------------------
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError(MESSAGES.USER_NOT_FOUND, 404));
  }

  if (user.avatar && user.avatar.publicId) {
    await deleteFromCloudinary(user.avatar.publicId);
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: 'User deleted successfully.',
  });
});