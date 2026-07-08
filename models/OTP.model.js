const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    // purpose currently only supports 'register' — the password-reset
    // flow no longer uses OTP (it uses a crypto token + email link instead,
    // see forgotPassword/resetPassword in auth.controller.js).
    purpose: {
      type: String,
      enum: ['register'],
      required: true,
    },
    // Holds the pending registration data until the OTP is verified.
    // Only used when purpose === 'register'.
    userData: {
      type: Object,
      default: undefined,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Auto-hash the OTP before saving so raw codes never sit in the DB
otpSchema.pre('save', async function (next) {
  if (!this.isModified('otp')) return next();
  this.otp = await bcrypt.hash(this.otp, 10);
  next();
});

// Compare a plain-text OTP entered by the user against the stored hash
otpSchema.methods.compareOtp = async function (enteredOtp) {
  return bcrypt.compare(enteredOtp, this.otp);
};

// MongoDB TTL index: automatically deletes the document once expiresAt passes
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', otpSchema);
