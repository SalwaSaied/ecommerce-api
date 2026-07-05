const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');

const {
  registerSendOtpSchema,
  verifyOtpSchema,
  loginSchema,
  forgotPasswordSendOtpSchema,
  forgotPasswordVerifyOtpSchema,
} = require('../validation/auth.validation');

// Public
router.post('/register/send-otp', validate(registerSendOtpSchema), authController.registerSendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/login', validate(loginSchema), authController.login);
router.post(
  '/forgotpassword/send-otp',
  validate(forgotPasswordSendOtpSchema),
  authController.forgotPasswordSendOtp
);
router.post(
  '/forgotpassword/verify-otp',
  validate(forgotPasswordVerifyOtpSchema),
  authController.forgotPasswordVerifyOtp
);

// Protected (requires valid JWT)
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);

module.exports = router;
