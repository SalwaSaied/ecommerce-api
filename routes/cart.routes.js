const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cart.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');

const {
  addItemSchema,
  updateItemSchema,
  applyCouponSchema,
} = require('../validation/cart.validation');

// GET /carts — creates one automatically if it doesn't exist
router.get('/', protect, cartController.getCart);

// POST /carts/items — add an item (deducts stock immediately)
router.post('/items', protect, validate(addItemSchema), cartController.addItem);

// PATCH /carts/items — update an item's quantity (adjusts stock by the difference)
router.patch('/items', protect, validate(updateItemSchema), cartController.updateItemQuantity);

// DELETE /carts/items/:productId — remove an item (restores its stock)
router.delete('/items/:productId', protect, cartController.removeItem);

// POST /carts/coupon — apply a discount coupon
router.post('/coupon', protect, validate(applyCouponSchema), cartController.applyCoupon);

// DELETE /carts/coupon — remove the currently applied coupon
router.delete('/coupon', protect, cartController.removeCoupon);

// DELETE /carts/clear — clear all items and the coupon
router.delete('/clear', protect, cartController.clearCart);

module.exports = router;