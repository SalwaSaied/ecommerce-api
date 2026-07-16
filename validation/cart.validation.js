const Joi = require('joi');

const addItemSchema = Joi.object({
  productId: Joi.string().required().messages({
    'any.required': 'productId is required.',
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.min': 'Quantity must be at least 1.',
    'any.required': 'Quantity is required.',
  }),
});

const updateItemSchema = Joi.object({
  productId: Joi.string().required().messages({
    'any.required': 'productId is required.',
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.min': 'Quantity must be at least 1.',
    'any.required': 'Quantity is required.',
  }),
});

const applyCouponSchema = Joi.object({
  code: Joi.string().trim().required().messages({
    'any.required': 'Coupon code is required.',
  }),
});

module.exports = { addItemSchema, updateItemSchema, applyCouponSchema };