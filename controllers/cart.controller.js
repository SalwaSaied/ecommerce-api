const mongoose = require('mongoose');
const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const MESSAGES = require('../constants/messages');
const COUPONS = require('../constants/coupons');

const formatCartResponse = (cart) => ({
  itemCount: cart.itemCount,
  subtotal: cart.subtotal,
  discountAmount: cart.discountAmount,
  total: cart.total,
  coupon: cart.coupon?.code || null,
  items: cart.items,
});

exports.getCart = catchAsync(async (req, res, next) => {
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }
  res.status(200).json({ success: true, ...formatCartResponse(cart) });
});

exports.addItem = catchAsync(async (req, res, next) => {
  const { productId, quantity } = req.body;

  const product = await Product.findById(productId);
  if (!product) return next(new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404));
  if (product.stock < quantity) {
    return next(new AppError(`Only ${product.stock} unit(s) of "${product.name}" left in stock.`, 400));
  }

  const session = await mongoose.startSession();
  let cart;

  try {
    await session.withTransaction(async () => {
      cart = await Cart.findOne({ user: req.user._id }).session(session);
      if (!cart) {
        const created = await Cart.create([{ user: req.user._id, items: [] }], { session });
        cart = created[0];
      }

      const existingItem = cart.items.find((item) => item.product.toString() === productId);
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.items.push({
          product: product._id,
          name: product.name,
          image: product.images?.[0]?.url || '',
          price: product.price,
          quantity,
        });
      }

      product.stock -= quantity;
      await product.save({ session });
      await cart.save({ session });
    });
  } catch (err) {
    return next(err instanceof AppError ? err : new AppError('Failed to add item to cart. Please try again.', 500));
  } finally {
    session.endSession();
  }

  res.status(200).json({ success: true, message: 'Item added to cart.', ...formatCartResponse(cart) });
});

exports.updateItemQuantity = catchAsync(async (req, res, next) => {
  const { productId, quantity } = req.body;

  const session = await mongoose.startSession();
  let cart;

  try {
    await session.withTransaction(async () => {
      cart = await Cart.findOne({ user: req.user._id }).session(session);
      if (!cart) throw new AppError(MESSAGES.CART_OR_ITEM_NOT_FOUND, 404);

      const item = cart.items.find((i) => i.product.toString() === productId);
      if (!item) throw new AppError(MESSAGES.CART_OR_ITEM_NOT_FOUND, 404);

      const product = await Product.findById(productId).session(session);
      if (!product) throw new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404);

      const difference = quantity - item.quantity;
      if (difference > 0 && product.stock < difference) {
        throw new AppError(`Only ${product.stock} more unit(s) of "${product.name}" available.`, 400);
      }

      product.stock -= difference;
      item.quantity = quantity;

      await product.save({ session });
      await cart.save({ session });
    });
  } catch (err) {
    return next(err instanceof AppError ? err : new AppError('Failed to update cart. Please try again.', 500));
  } finally {
    session.endSession();
  }

  res.status(200).json({ success: true, ...formatCartResponse(cart) });
});

exports.removeItem = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  const session = await mongoose.startSession();
  let cart;

  try {
    await session.withTransaction(async () => {
      cart = await Cart.findOne({ user: req.user._id }).session(session);
      if (!cart) throw new AppError(MESSAGES.CART_OR_ITEM_NOT_FOUND, 404);

      const item = cart.items.find((i) => i.product.toString() === productId);
      if (!item) throw new AppError(MESSAGES.CART_OR_ITEM_NOT_FOUND, 404);

      const product = await Product.findById(productId).session(session);
      if (product) {
        product.stock += item.quantity;
        await product.save({ session });
      }

      cart.items = cart.items.filter((i) => i.product.toString() !== productId);
      await cart.save({ session });
    });
  } catch (err) {
    return next(err instanceof AppError ? err : new AppError('Failed to remove item. Please try again.', 500));
  } finally {
    session.endSession();
  }

  res.status(200).json({ success: true, ...formatCartResponse(cart) });
});

exports.applyCoupon = catchAsync(async (req, res, next) => {
  const { code } = req.body;
  const couponKey = code.toUpperCase();
  const coupon = COUPONS[couponKey];
  if (!coupon) return next(new AppError(MESSAGES.INVALID_COUPON, 400));

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    return next(new AppError('Cannot apply a coupon to an empty cart.', 400));
  }

  cart.coupon = { code: couponKey, discountType: coupon.discountType, discountValue: coupon.discountValue };
  await cart.save();

  const savingsText = coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `${coupon.discountValue} EGP`;

  res.status(200).json({
    success: true,
    message: `Coupon applied - you save ${savingsText}`,
    ...formatCartResponse(cart),
  });
});

exports.removeCoupon = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return next(new AppError(MESSAGES.CART_NOT_FOUND, 404));

  cart.coupon = { code: null, discountType: null, discountValue: 0 };
  await cart.save();

  res.status(200).json({ success: true, message: 'Coupon removed.', subtotal: cart.subtotal, total: cart.total });
});

exports.clearCart = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  let cart;

  try {
    await session.withTransaction(async () => {
      cart = await Cart.findOne({ user: req.user._id }).session(session);
      if (!cart) throw new AppError(MESSAGES.CART_NOT_FOUND, 404);

      for (const item of cart.items) {
        const product = await Product.findById(item.product).session(session);
        if (product) {
          product.stock += item.quantity;
          await product.save({ session });
        }
      }

      cart.items = [];
      cart.coupon = { code: null, discountType: null, discountValue: 0 };
      await cart.save({ session });
    });
  } catch (err) {
    return next(err instanceof AppError ? err : new AppError('Failed to clear cart. Please try again.', 500));
  } finally {
    session.endSession();
  }

  res.status(200).json({ success: true, message: 'Cart cleared.' });
});