const Joi = require('joi');

const addressSchema = Joi.object({
  fullName: Joi.string().trim().required(),
  phone: Joi.string().trim().required(),
  country: Joi.string().trim().required(),
  city: Joi.string().trim().required(),
  address: Joi.string().trim().required(),
  postalCode: Joi.string().trim().required(),
}).messages({
  'any.required': 'Complete shipping address is required.',
});

// POST /orders
const placeOrderSchema = Joi.object({
  shippingAddress: addressSchema.required(),
  paymentMethod: Joi.string().valid('cash', 'stripe', 'paypal', 'paymob').optional(),
  customerNote: Joi.string().trim().max(1000).optional(),
});

// PATCH /orders/admin/:id/status
const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')
    .required()
    .messages({
      'any.only': 'Invalid status.',
      'any.required': 'Status is required.',
    }),
  adminNote: Joi.string().trim().max(1000).optional(),
});

module.exports = { placeOrderSchema, updateOrderStatusSchema };