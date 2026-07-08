const User = require('../models/User.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary');

// ------------------------------------------------------------------
// POST /users/add   (Admin)
// Admin creates a user directly — no OTP verification needed since
// the admin is vouching for the account.
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
    isVerified: true, // admin-created accounts are trusted immediately
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
// Supports pagination via ?page= & ?limit=, plus optional filters:
//   ?role=admin | customer
//   ?isVerified=true | false
//   ?search=<text>   (matches username OR email, case-insensitive)
// ------------------------------------------------------------------
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Build the filter object dynamically — only add a condition if the
  // matching query param was actually provided.
  const filter = {};

  if (req.query.role) {
    filter.role = req.query.role;
  }

  if (req.query.isVerified !== undefined) {
    filter.isVerified = req.query.isVerified === 'true';
  }

  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i'); // case-insensitive
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
    return next(new AppError('User not found.', 404));
  }

  res.status(200).json({
    success: true,
    data: { user },
  });
});

// ------------------------------------------------------------------
// PATCH /users/:id   (User)
// A logged-in user can update their own profile (username, phone,
// avatar). An admin may update anyone's. Anyone else is forbidden.
// Accepts multipart/form-data with an optional "avatar" image field.
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
    return next(new AppError('User not found.', 404));
  }

const { username, phone, addresses } = req.body;

  // Since avatar (a file) doesn't go through Joi's body validation, we
  // check here that the request has SOMETHING to update: a text field
  // or a file.
  if (username === undefined && phone === undefined && addresses === undefined && !req.file) {
    return next(new AppError('Please provide at least one field to update.', 400));
  }

  if (username !== undefined) user.username = username;
  if (phone !== undefined) user.phone = phone;

  // addresses arrives as a JSON string (multipart/form-data field),
    // so we parse it here and validate its shape before saving.
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

    // Replace the full addresses list with the one provided
    user.addresses = parsedAddresses;
  }

  // Optional avatar upload (multipart/form-data, field name "avatar")
  if (req.file) {
    // Delete the old avatar from Cloudinary first (skip the default placeholder,
    // which has no publicId and isn't something we uploaded ourselves)
    if (user.avatar && user.avatar.publicId) {
      await deleteFromCloudinary(user.avatar.publicId);
    }

    const uploaded = await uploadToCloudinary(req.file.buffer, 'ecommerce/avatars');
    user.avatar = { url: uploaded.url, publicId: uploaded.public_id };
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
// PATCH /users/:id/role   (Admin)
// Dedicated endpoint for promoting/demoting a user's role. Kept
// separate from updateUser so a regular user can never change their
// own role through the normal profile-update flow.
// ------------------------------------------------------------------
exports.changeUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  // Prevent an admin from accidentally demoting themselves, which
  // could lock everyone out of admin-only endpoints.
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
// ------------------------------------------------------------------
// POST /users/change-password   (User)
// Dedicated password-change endpoint — kept separate from updateUser
// on purpose. Requires the current password before setting a new one,
// so a valid token alone isn't enough to take over the account.
// ------------------------------------------------------------------
exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Need the password field explicitly since the User schema hides it
  // (select: false) by default.
  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new AppError('Current password is incorrect.', 401));
  }

  user.password = newPassword; // pre-save hook will hash it
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
    return next(new AppError('User not found.', 404));
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: 'User deleted successfully.',
  });
});