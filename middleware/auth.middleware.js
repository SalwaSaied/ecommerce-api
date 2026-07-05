const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const User = require('../models/User.model');

// Verifies the JWT sent in the Authorization header and attaches the
// authenticated user to req.user. Blocks the request if the token is
// missing, invalid, expired, or the user no longer exists.
exports.protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to get access.', 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError('Invalid or expired token. Please log in again.', 401));
  }

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  req.user = currentUser;
  next();
});

// Role guard — use after `protect`. Example: adminOnly (no args) or
// restrictTo('admin', 'customer') style if you extend it further.
exports.adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to perform this action.', 403));
  }
  next();
};
