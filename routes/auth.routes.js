const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const { protect, adminOnly } = require('../middleware/auth.middleware');

const {
  registerSendOtpSchema,
  verifyOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changeRoleSchema,
} = require('../validation/auth.validation');

// Public
router.post('/register/send-otp', validate(registerSendOtpSchema), authController.registerSendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/login', validate(loginSchema), authController.login);

// Sends a reset LINK (with a token embedded in the URL) via email
router.post('/forgotpassword', validate(forgotPasswordSchema), authController.forgotPassword);

// The token comes from the URL — this is the endpoint the emailed link's
// frontend page would call after the user enters a new password
router.patch('/resetpassword/:token', validate(resetPasswordSchema), authController.resetPassword);

// Protected (requires valid JWT)
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);

// Admin only — change another user's role (moved here from the Users
// module since it's fundamentally a permissions/security action)
router.patch(
  '/users/:id/role',
  protect,
  adminOnly,
  validate(changeRoleSchema),
  authController.changeUserRole
);

module.exports = router;