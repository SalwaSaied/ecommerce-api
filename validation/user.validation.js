const Joi = require('joi');

// POST /users/add (Admin) — admin creates a user directly, no OTP flow
const addUserSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  phone: Joi.string().trim().optional(),
  role: Joi.string().valid('admin', 'customer').optional(),
});

// PATCH /users/:id (User) — a user updating their own profile.
// Note: role and password are intentionally NOT allowed here.
// - role: only an admin flow (if added later) should change roles.
// - password: has its own dedicated endpoint (see changePasswordSchema)
//   that requires the current password, for security.
// "addresses" arrives as a JSON string (this endpoint accepts
// multipart/form-data because of the optional avatar file), so we
// validate it as a string here and parse/validate its shape in the
// controller before saving.
const updateUserSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50).optional(),
  phone: Joi.string().trim().optional(),
  addresses: Joi.string().optional(),
})

// POST /users/change-password (User) — dedicated password-change endpoint.
// Requires the current password to prevent someone with a stolen/valid
// token from silently taking over the account by just setting a new one.
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

module.exports = { addUserSchema, updateUserSchema, changePasswordSchema };