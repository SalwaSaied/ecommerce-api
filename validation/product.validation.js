const Joi = require('joi');

// A JSON-array-looking string, e.g. '["a","b"]' or '[]' — used for
// fields sent as text inside multipart/form-data (tags, deleteImages).
const jsonArrayPattern = /^\[.*\]$/;

const createProductSchema = Joi.object({
  name: Joi.string().trim().min(3).max(200).required().messages({
    'string.min': 'Product name must be at least 3 characters long.',
    'string.max': 'Product name cannot exceed 200 characters.',
    'any.required': 'Product name is required.',
  }),
  shortDescription: Joi.string().max(500).required().messages({
    'string.max': 'Short description cannot exceed 500 characters.',
    'any.required': 'Short description is required.',
  }),
  description: Joi.string().required().messages({
    'any.required': 'Description is required.',
  }),
  price: Joi.number().min(0).required().messages({
    'number.base': 'Price must be a number.',
    'number.min': 'Price cannot be negative.',
    'any.required': 'Price is required.',
  }),
  discountPrice: Joi.number().min(0).optional().messages({
    'number.base': 'Discount price must be a number.',
    'number.min': 'Discount price cannot be negative.',
  }),
  stock: Joi.number().min(0).required().messages({
    'number.base': 'Stock must be a number.',
    'number.min': 'Stock cannot be negative.',
    'any.required': 'Stock is required.',
  }),
  sku: Joi.string()
    .trim()
    .pattern(/^[A-Za-z0-9-_]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'SKU can only contain letters, numbers, hyphens, and underscores.',
    }),
  category: Joi.string().trim().required().messages({
    'any.required': 'Category is required.',
  }),
  subcategory: Joi.string().trim().optional(),
  brand: Joi.string().trim().optional(),
  tags: Joi.string().pattern(jsonArrayPattern).optional().messages({
    'string.pattern.base': 'tags must be a JSON array string, e.g. ["sports","running"].',
  }),
  featured: Joi.boolean().optional(),
});

const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(3).max(200).optional().messages({
    'string.min': 'Product name must be at least 3 characters long.',
    'string.max': 'Product name cannot exceed 200 characters.',
  }),
  shortDescription: Joi.string().max(500).optional().messages({
    'string.max': 'Short description cannot exceed 500 characters.',
  }),
  description: Joi.string().optional(),
  price: Joi.number().min(0).optional().messages({
    'number.base': 'Price must be a number.',
    'number.min': 'Price cannot be negative.',
  }),
  discountPrice: Joi.number().min(0).optional().messages({
    'number.base': 'Discount price must be a number.',
    'number.min': 'Discount price cannot be negative.',
  }),
  stock: Joi.number().min(0).optional().messages({
    'number.base': 'Stock must be a number.',
    'number.min': 'Stock cannot be negative.',
  }),
  sku: Joi.string()
    .trim()
    .pattern(/^[A-Za-z0-9-_]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'SKU can only contain letters, numbers, hyphens, and underscores.',
    }),
  category: Joi.string().trim().optional(),
  subcategory: Joi.string().trim().optional(),
  brand: Joi.string().trim().optional(),
  tags: Joi.string().pattern(jsonArrayPattern).optional().messages({
    'string.pattern.base': 'tags must be a JSON array string, e.g. ["sports","running"].',
  }),
  featured: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  deleteImages: Joi.string().pattern(jsonArrayPattern).optional().messages({
    'string.pattern.base': 'deleteImages must be a JSON array string, e.g. ["public_id1"].',
  }),
});

const reviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required().messages({
    'number.base': 'Rating must be a number.',
    'number.min': 'Rating must be at least 1.',
    'number.max': 'Rating cannot exceed 5.',
    'any.required': 'Rating is required.',
  }),
  comment: Joi.string().trim().max(500).optional().messages({
    'string.max': 'Comment cannot exceed 500 characters.',
  }),
});

module.exports = { createProductSchema, updateProductSchema, reviewSchema };