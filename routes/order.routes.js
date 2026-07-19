const express = require('express');
const router = express.Router();

const orderController = require('../controllers/order.controller');
const validate = require('../middleware/validate.middleware');
const { protect, adminOnly } = require('../middleware/auth.middleware');

const { placeOrderSchema, updateOrderStatusSchema } = require('../validation/order.validation');

// POST /orders — place an order from the current cart
router.post('/', protect, validate(placeOrderSchema), orderController.placeOrder);

// GET /orders/my — the user's own orders (paginated, optional status filter)
router.get('/my', protect, orderController.getMyOrders);

// GET /orders/my/:id — a specific order owned by the user
router.get('/my/:id', protect, orderController.getMyOrderById);

// PATCH /orders/my/:id/cancel — cancel an order (pending/confirmed only)
router.patch('/my/:id/cancel', protect, orderController.cancelMyOrder);

// --- Admin routes ---
// IMPORTANT: /admin/dashboard and /admin/carts must be declared BEFORE
// /admin/:id, otherwise Express would treat "dashboard" or "carts" as
// an order id and these routes would never be reached.
router.get('/admin/dashboard', protect, adminOnly, orderController.getDashboardStats);
router.get('/admin/carts', protect, adminOnly, orderController.getActiveCartsAdmin);
router.get('/admin', protect, adminOnly, orderController.getAllOrdersAdmin);
router.get('/admin/:id', protect, adminOnly, orderController.getOrderByIdAdmin);
router.patch(
  '/admin/:id/status',
  protect,
  adminOnly,
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatusAdmin
);

module.exports = router;