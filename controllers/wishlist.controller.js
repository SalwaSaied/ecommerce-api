const Wishlist = require('../models/Wishlist.model');
const Product = require('../models/Product.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const MESSAGES = require('../constants/messages');

// ------------------------------------------------------------------
// GET /wishlists/my   (User)
// ------------------------------------------------------------------
exports.getMyWishlist = catchAsync(async (req, res, next) => {
  let wishlist = await Wishlist.findOne({ user: req.user._id });

  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.user._id, products: [] });
  }

  res.status(200).json({
    success: true,
    data: { wishlist },
  });
});

// ------------------------------------------------------------------
// POST /wishlists/add/:productId   (User)
// ------------------------------------------------------------------
exports.addProduct = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404));
  }

  let wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.user._id, products: [] });
  }

  const alreadyExists = wishlist.products.some((p) => p._id.toString() === productId);
  if (alreadyExists) {
    return next(new AppError(MESSAGES.PRODUCT_ALREADY_IN_WISHLIST, 400));
  }

  wishlist.products.push(productId);
  await wishlist.save();
  await wishlist.populate('products');

  res.status(200).json({
    success: true,
    message: 'Product added to wishlist.',
    data: { wishlist },
  });
});

// ------------------------------------------------------------------
// DELETE /wishlists/remove/:productId   (User)
// ------------------------------------------------------------------
exports.removeProduct = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) {
    return next(new AppError(MESSAGES.WISHLIST_NOT_FOUND, 404));
  }

  wishlist.products = wishlist.products.filter((p) => p._id.toString() !== productId);
  await wishlist.save();

  res.status(200).json({
    success: true,
    message: 'Product removed from wishlist.',
    data: { wishlist },
  });
});

// ------------------------------------------------------------------
// DELETE /wishlists/clear   (User)
// ------------------------------------------------------------------
exports.clearWishlist = catchAsync(async (req, res, next) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) {
    return next(new AppError(MESSAGES.WISHLIST_NOT_FOUND, 404));
  }

  wishlist.products = [];
  await wishlist.save();

  res.status(200).json({
    success: true,
    message: 'Wishlist cleared.',
    data: { wishlist },
  });
});