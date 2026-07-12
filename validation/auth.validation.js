const Joi = require('joi');

const registerSendOtpSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
  }),
  phone: Joi.string().trim().optional(),
});

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).pattern(/^[0-9]+$/).required().messages({
    'string.pattern.base': 'OTP must contain only digits',
    'string.length': 'OTP must be exactly 6 digits',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

// Note: the reset token itself comes from the URL param (/:token),
// not the body — so this schema only validates the new password.
const resetPasswordSchema = Joi.object({
  newPassword: Joi.string().min(8).required(),
});

// PATCH /auth/users/:id/role (Admin) — dedicated endpoint for changing a
// user's role. Kept separate from user profile updates so a regular
// user can never promote themselves to admin, and grouped with Auth
// since it's fundamentally a permissions/security action.
const changeRoleSchema = Joi.object({
  role: Joi.string().valid('admin', 'customer').required(),
});

module.exports = {
  registerSendOtpSchema,
  verifyOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changeRoleSchema,
};