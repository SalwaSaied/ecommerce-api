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

const forgotPasswordSendOtpSchema = Joi.object({
  email: Joi.string().email().required(),
});

const forgotPasswordVerifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
  newPassword: Joi.string().min(8).required(),
});

module.exports = {
  registerSendOtpSchema,
  verifyOtpSchema,
  loginSchema,
  forgotPasswordSendOtpSchema,
  forgotPasswordVerifyOtpSchema,
};
