const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const MESSAGES = require('../constants/messages');
const COUPONS = require('../constants/coupons');

// ------------------------------------------------------------------
// GET /carts   (User)
// Creates an empty cart automatically if the user doesn't have one yet.
// ------------------------------------------------------------------
exports.getCart = catchAsync(async (req, res, next) => {
  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  res.status(200).json({
    success: true,
    data: { cart },
  });
});

// ------------------------------------------------------------------
// POST /carts/items   (User)
// Adds a product to the cart and deducts its stock IMMEDIATELY — the
// reserved stock is only given back if the item is later removed or
// its quantity is reduced (see removeItem / updateItemQuantity below).
// ------------------------------------------------------------------
exports.addItem = catchAsync(async (req, res, next) => {
  const { productId, quantity } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404));
  }

  if (product.stock < quantity) {
    return next(
      new AppError(`Only ${product.stock} unit(s) of "${product.name}" left in stock.`, 400)
    );
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
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

  await product.save();
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Item added to cart.',
    data: { cart },
  });
});

// ------------------------------------------------------------------
// PATCH /carts/items   (User)
// Sets an item to a NEW target quantity, and adjusts stock by exactly
// the DIFFERENCE — not the full amount. Going from 2 to 5 only
// deducts 3 more units; going from 5 to 2 gives 3 units back.
// ------------------------------------------------------------------
exports.updateItemQuantity = catchAsync(async (req, res, next) => {
  const { productId, quantity } = req.body;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return next(new AppError(MESSAGES.CART_NOT_FOUND, 404));
  }

  const item = cart.items.find((i) => i.product.toString() === productId);
  if (!item) {
    return next(new AppError(MESSAGES.CART_ITEM_NOT_FOUND, 404));
  }

  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404));
  }

  const difference = quantity - item.quantity;

  if (difference > 0 && product.stock < difference) {
    return next(
      new AppError(`Only ${product.stock} more unit(s) of "${product.name}" available.`, 400)
    );
  }

  product.stock -= difference;
  item.quantity = quantity;

  await product.save();
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Cart item quantity updated.',
    data: { cart },
  });
});

// ------------------------------------------------------------------
// DELETE /carts/items/:productId   (User)
// Removes an item entirely and restores its full quantity to stock.
// ------------------------------------------------------------------
exports.removeItem = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return next(new AppError(MESSAGES.CART_NOT_FOUND, 404));
  }

  const item = cart.items.find((i) => i.product.toString() === productId);
  if (!item) {
    return next(new AppError(MESSAGES.CART_ITEM_NOT_FOUND, 404));
  }

  const product = await Product.findById(productId);
  if (product) {
    product.stock += item.quantity;
    await product.save();
  }

  cart.items = cart.items.filter((i) => i.product.toString() !== productId);
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Item removed from cart.',
    data: { cart },
  });
});

// ------------------------------------------------------------------
// POST /carts/coupon   (User)
// ------------------------------------------------------------------
exports.applyCoupon = catchAsync(async (req, res, next) => {
  const { code } = req.body;
  const couponKey = code.toUpperCase();
  const coupon = COUPONS[couponKey];

  if (!coupon) {
    return next(new AppError(MESSAGES.INVALID_COUPON, 400));
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return next(new AppError(MESSAGES.CART_NOT_FOUND, 404));
  }

  cart.coupon = {
    code: couponKey,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
  };

  await cart.save();

  res.status(200).json({
    success: true,
    message: `Coupon "${couponKey}" applied.`,
    data: { cart },
  });
});

// ------------------------------------------------------------------
// DELETE /carts/coupon   (User)
// ------------------------------------------------------------------
exports.removeCoupon = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return next(new AppError(MESSAGES.CART_NOT_FOUND, 404));
  }

  cart.coupon = { code: null, discountType: null, discountValue: 0 };
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Coupon removed.',
    data: { cart },
  });
});

// ------------------------------------------------------------------
// DELETE /carts/clear   (User)
// Restores stock for every item first, then empties the cart.
// ------------------------------------------------------------------
exports.clearCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return next(new AppError(MESSAGES.CART_NOT_FOUND, 404));
  }

  await Promise.all(
    cart.items.map(async (item) => {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    })
  );

  cart.items = [];
  cart.coupon = { code: null, discountType: null, discountValue: 0 };
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Cart cleared.',
    data: { cart },
  });
});