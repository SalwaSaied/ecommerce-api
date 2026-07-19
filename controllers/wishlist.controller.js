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
// ------------------------------------------------------------------
// GET /wishlists/admin/all   (Admin)
// Paginated list of every user's wishlist, with the user and products
// populated (products are auto-populated by the model's pre-find hook;
// user is populated explicitly here since regular lookups don't need it).
// ------------------------------------------------------------------
exports.getAllWishlistsAdmin = catchAsync(async (req, res, next) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [wishlists, total] = await Promise.all([
    Wishlist.find().populate('user', 'username email').skip(skip).limit(limit),
    Wishlist.countDocuments(),
  ]);

  res.status(200).json({
    success: true,
    total,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    wishlists,
  });
});

// ------------------------------------------------------------------
// GET /wishlists/admin/stats   (Admin)
// Aggregation-based stats: total wishlists, total products saved
// across all wishlists combined, and the top 10 most-wishlisted
// products (with a $lookup to pull in their name/image).
// ------------------------------------------------------------------
exports.getWishlistStatsAdmin = catchAsync(async (req, res, next) => {
  const [totalWishlists, totalProductsAgg, topProducts] = await Promise.all([
    Wishlist.countDocuments(),
    Wishlist.aggregate([
      { $project: { count: { $size: '$products' } } },
      { $group: { _id: null, total: { $sum: '$count' } } },
    ]),
    Wishlist.aggregate([
      { $unwind: '$products' },
      { $group: { _id: '$products', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: '$productInfo' },
      {
        $project: {
          _id: 1,
          count: 1,
          productId: '$_id',
          name: '$productInfo.name',
          image: { $arrayElemAt: ['$productInfo.images.url', 0] },
        },
      },
    ]),
  ]);

  res.status(200).json({
    success: true,
    statistics: {
      totalWishlists,
      totalWishlistProducts: totalProductsAgg[0]?.total || 0,
      topProducts,
    },
  });
});