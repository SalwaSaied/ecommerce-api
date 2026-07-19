const mongoose = require('mongoose');
const Order = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const User = require('../models/User.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const MESSAGES = require('../constants/messages');
const {
  sendEmail,
  orderConfirmationEmailTemplate,
  orderStatusUpdateEmailTemplate,
  orderCancelledEmailTemplate,
} = require('../utils/sendEmail');

const FREE_SHIPPING_THRESHOLD = 1000; // EGP
const SHIPPING_FEE = 50; // EGP
const TAX_RATE = 0.14; // 14% VAT

// ------------------------------------------------------------------
// POST /orders   (User)
// Converts the user's cart into a real order, inside a Mongoose
// Transaction so the order and the cart-clearing either BOTH succeed
// or BOTH roll back — never a half-finished state.
//
// Stock note: stock was already deducted when each item was added to
// the cart (see cart.controller.js), so placing the order does NOT
// deduct stock again — it just finalizes the reservation. We only
// re-verify every product still exists, as a safety net against a
// product being deleted between "add to cart" and "checkout".
// ------------------------------------------------------------------
exports.placeOrder = catchAsync(async (req, res, next) => {
  const { shippingAddress, paymentMethod, customerNote } = req.body;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    return next(new AppError('Your cart is empty.', 400));
  }

  for (const item of cart.items) {
    const stillExists = await Product.exists({ _id: item.product });
    if (!stillExists) {
      return next(new AppError(`"${item.name}" is no longer available.`, 400));
    }
  }

  const subtotal = cart.subtotal;
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const discount = cart.discountAmount;
  const totalPrice = Math.max(subtotal + shippingFee + tax - discount, 0);

  const method = paymentMethod || 'cash';
  const initialStatus = method === 'cash' ? 'confirmed' : 'pending';

  const session = await mongoose.startSession();
  let order;

  try {
    await session.withTransaction(async () => {
      const created = await Order.create(
        [
          {
            user: req.user._id,
            items: cart.items.map((item) => ({
              product: item.product,
              name: item.name,
              image: item.image,
              price: item.price,
              quantity: item.quantity,
            })),
            shippingAddress,
            paymentMethod: method,
            paymentStatus: 'pending',
            subtotal,
            shippingFee,
            tax,
            discount,
            totalPrice,
            status: initialStatus,
            customerNote,
          },
        ],
        { session }
      );

      order = created[0];

      cart.items = [];
      cart.coupon = { code: null, discountType: null, discountValue: 0 };
      await cart.save({ session });
    });
  } catch (err) {
    return next(new AppError('Failed to place order. Please try again.', 500));
  } finally {
    session.endSession();
  }

  try {
    await sendEmail({
      to: req.user.email,
      subject: 'Order Confirmation — SEF Academy Store',
      html: orderConfirmationEmailTemplate(order, req.user.username),
    });
  } catch (err) {
    // intentionally ignored — the order itself already succeeded
  }

  res.status(201).json({
    success: true,
    message: 'Order placed successfully.',
    order,
  });
});

// ------------------------------------------------------------------
// GET /orders/my   (User)
// ------------------------------------------------------------------
exports.getMyOrders = catchAsync(async (req, res, next) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = { user: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    total,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    orders,
  });
});

// ------------------------------------------------------------------
// GET /orders/my/:id   (User)
// ------------------------------------------------------------------
exports.getMyOrderById = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });

  if (!order) {
    return next(new AppError(MESSAGES.ORDER_NOT_FOUND, 404));
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// ------------------------------------------------------------------
// PATCH /orders/my/:id/cancel   (User)
// ------------------------------------------------------------------
exports.cancelMyOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });

  if (!order) {
    return next(new AppError(MESSAGES.ORDER_NOT_FOUND, 404));
  }

  if (!['pending', 'confirmed'].includes(order.status)) {
    return next(new AppError('Cannot cancel order in current status.', 400));
  }

  await Promise.all(
    order.items.map(async (item) => {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    })
  );

  order.status = 'cancelled';
  order.cancelledAt = new Date();
  await order.save();

  try {
    await sendEmail({
      to: req.user.email,
      subject: 'Order Cancelled — SEF Academy Store',
      html: orderCancelledEmailTemplate(order),
    });
  } catch (err) {
    // intentionally ignored
  }

  res.status(200).json({
    success: true,
    message: 'Order cancelled successfully.',
    order,
  });
});

// ------------------------------------------------------------------
// GET /orders/admin/dashboard   (Admin)
// ------------------------------------------------------------------
exports.getDashboardStats = catchAsync(async (req, res, next) => {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    statusCounts,
    totalRevenueAgg,
    thisMonthRevenueAgg,
    lastMonthRevenueAgg,
    recentOrders,
    topProductsAgg,
    dailyRevenueAgg,
    totalCustomers,
  ] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: startOfThisMonth } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]),
    Order.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]),
    Order.find().sort({ createdAt: -1 }).limit(5),
    Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          image: { $first: '$items.image' },
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalPrice' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    User.countDocuments({ role: 'customer' }),
  ]);

  const statusCountMap = statusCounts.reduce((acc, s) => {
    acc[s._id] = s.count;
    return acc;
  }, {});

  const totalRevenue = totalRevenueAgg[0]?.total || 0;
  const thisMonthRevenue = thisMonthRevenueAgg[0]?.total || 0;
  const lastMonthRevenue = lastMonthRevenueAgg[0]?.total || 0;

  let growthPercent = 0;
  if (lastMonthRevenue > 0) {
    growthPercent = Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 10000) / 100;
  } else if (thisMonthRevenue > 0) {
    growthPercent = 100;
  }

  res.status(200).json({
    success: true,
    dashboard: {
      orders: {
        total: Object.values(statusCountMap).reduce((sum, c) => sum + c, 0),
        pending: statusCountMap.pending || 0,
        processing: statusCountMap.processing || 0,
        confirmed: statusCountMap.confirmed || 0,
        shipped: statusCountMap.shipped || 0,
        delivered: statusCountMap.delivered || 0,
        cancelled: statusCountMap.cancelled || 0,
      },
      revenue: {
        total: totalRevenue,
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        growthPercent,
      },
      recentOrders,
      topProducts: topProductsAgg,
      ordersByStatus: statusCounts,
      dailyRevenue: dailyRevenueAgg,
      totalCustomers,
    },
  });
});

// ------------------------------------------------------------------
// GET /orders/admin/carts   (Admin)
// ------------------------------------------------------------------
exports.getActiveCartsAdmin = catchAsync(async (req, res, next) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = { 'items.0': { $exists: true } };

  const [carts, total] = await Promise.all([
    Cart.find(filter).populate('user', 'username email').skip(skip).limit(limit),
    Cart.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    total,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    carts,
  });
});

// ------------------------------------------------------------------
// GET /orders/admin   (Admin)
// ------------------------------------------------------------------
exports.getAllOrdersAdmin = catchAsync(async (req, res, next) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;

  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) {
      const toDate = new Date(req.query.to);
      toDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = toDate;
    }
  }

  const sortBy = req.query.sortBy || 'createdAt';
  const sortDir = req.query.sortDir === 'asc' ? 1 : -1;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ [sortBy]: sortDir })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    total,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    orders,
  });
});

// ------------------------------------------------------------------
// GET /orders/admin/:id   (Admin)
// ------------------------------------------------------------------
exports.getOrderByIdAdmin = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate('user', 'username email');

  if (!order) {
    return next(new AppError(MESSAGES.ORDER_NOT_FOUND, 404));
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// ------------------------------------------------------------------
// PATCH /orders/admin/:id/status   (Admin)
// ------------------------------------------------------------------
exports.updateOrderStatusAdmin = catchAsync(async (req, res, next) => {
  const { status, adminNote } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(new AppError(MESSAGES.ORDER_NOT_FOUND, 404));
  }

  if (status === 'cancelled' && order.status !== 'cancelled') {
    await Promise.all(
      order.items.map(async (item) => {
        const product = await Product.findById(item.product);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      })
    );
    order.cancelledAt = new Date();
  }

  if (status === 'delivered' && order.status !== 'delivered') {
    order.deliveredAt = new Date();
  }

  order.status = status;
  if (adminNote !== undefined) order.adminNote = adminNote;

  await order.save();

  const orderOwner = await User.findById(order.user);
  if (orderOwner) {
    try {
      await sendEmail({
        to: orderOwner.email,
        subject: 'Order Status Updated — SEF Academy Store',
        html: orderStatusUpdateEmailTemplate(order),
      });
    } catch (err) {
      // intentionally ignored
    }
  }

  res.status(200).json({
    success: true,
    message: 'Order status updated successfully.',
    order,
  });
});