const Joi = require('joi');

// POST /users/add (Admin) — admin creates a user directly, no OTP flow
const addUserSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  phone: Joi.string().trim().optional(),
  role: Joi.string().valid('admin', 'customer').optional(),
});

// PATCH /users/:id (User)
const updateUserSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50).optional(),
  phone: Joi.string().trim().optional(),
  addresses: Joi.string().optional(),
});
// POST /users/change-password (User) 
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

module.exports = { addUserSchema, updateUserSchema, changePasswordSchema };