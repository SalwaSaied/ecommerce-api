const Product = require('../models/Product.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary');
const MESSAGES = require('../constants/messages');

const parseJsonField = (value, fieldName, next) => {
  try {
    return JSON.parse(value);
  } catch (err) {
    next(new AppError(`${fieldName} must be a valid JSON array.`, 400));
    return null;
  }
};

const uploadImages = async (files) => {
  const uploads = files.map((file) => uploadToCloudinary(file.buffer, 'ecommerce/products'));
  return Promise.all(uploads);
};

// ------------------------------------------------------------------
// GET /products   (Public — but identifies admins via optionalAuth)
// ------------------------------------------------------------------
exports.getAllProducts = catchAsync(async (req, res, next) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};

  // Regular customers (and anonymous visitors) only ever see active
  // products. Admins can see inactive ones too — useful for managing
  // a product before it goes live, or after it's been pulled.
  if (req.user?.role !== 'admin') {
    filter.isActive = true;
  }

  if (req.query.category) filter.category = req.query.category.toLowerCase();
  if (req.query.brand) filter.brand = req.query.brand;

  if (req.query.minPrice || req.query.maxPrice) {
    filter.price = {};
    if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
    if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
  }

  const sort = req.query.sort ? req.query.sort.split(',').join(' ') : '-createdAt';

  const [products, totalFilteredProducts] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    totalFilteredProducts,
    page,
    pages: Math.ceil(totalFilteredProducts / limit),
    countReturned: products.length,
    data: products,
  });
});

// ------------------------------------------------------------------
// GET /products/search   (Public — but identifies admins via optionalAuth)
// ------------------------------------------------------------------
exports.searchProducts = catchAsync(async (req, res, next) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.user?.role !== 'admin') {
    filter.isActive = true;
  }

  if (req.query.q) filter.$text = { $search: req.query.q };
  if (req.query.category) filter.category = req.query.category.toLowerCase();
  if (req.query.subcategory) filter.subcategory = req.query.subcategory.toLowerCase();
  if (req.query.brand) filter.brand = req.query.brand;

  if (req.query.tags) {
    const tagList = req.query.tags.split(',').map((t) => t.trim());
    filter.tags = { $in: tagList };
  }

  if (req.query.minPrice || req.query.maxPrice) {
    filter.price = {};
    if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
    if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
  }

  const sort = req.query.sort ? req.query.sort.split(',').join(' ') : '-createdAt';

  const [products, totalFilteredProducts] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    totalFilteredProducts,
    page,
    pages: Math.ceil(totalFilteredProducts / limit),
    countReturned: products.length,
    data: products,
  });
});

// ------------------------------------------------------------------
// GET /products/:id   (Public — but identifies admins via optionalAuth)
// ------------------------------------------------------------------
exports.getProductById = catchAsync(async (req, res, next) => {
  const isAdmin = req.user?.role === 'admin';
  const query = isAdmin ? { _id: req.params.id } : { _id: req.params.id, isActive: true };

  const product = await Product.findOne(query);

  if (!product) {
    return next(new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404));
  }

  res.status(200).json({
    success: true,
    data: { product },
  });
});

// ------------------------------------------------------------------
// POST /products   (Admin)
// ------------------------------------------------------------------
exports.createProduct = catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError(MESSAGES.AT_LEAST_ONE_IMAGE_REQUIRED, 400));
  }

  const {
    name,
    shortDescription,
    description,
    price,
    discountPrice,
    stock,
    sku,
    category,
    subcategory,
    brand,
    tags,
    featured,
  } = req.body;

  let parsedTags = [];
  if (tags !== undefined) {
    parsedTags = parseJsonField(tags, 'tags', next);
    if (parsedTags === null) return;
  }

  const uploadedImages = await uploadImages(req.files);

  const product = await Product.create({
    name,
    shortDescription,
    description,
    price,
    discountPrice,
    stock,
    sku,
    category,
    subcategory,
    brand,
    tags: parsedTags,
    featured,
    images: uploadedImages,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'Product created successfully.',
    data: { product },
  });
});

// ------------------------------------------------------------------
// PUT /products/update/:id   (Admin)
// ------------------------------------------------------------------
exports.updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404));
  }

  const fields = [
    'name',
    'shortDescription',
    'description',
    'price',
    'discountPrice',
    'stock',
    'sku',
    'category',
    'subcategory',
    'brand',
    'featured',
    'isActive',
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) product[field] = req.body[field];
  });

  if (req.body.tags !== undefined) {
    const parsedTags = parseJsonField(req.body.tags, 'tags', next);
    if (parsedTags === null) return;
    product.tags = parsedTags;
  }

  if (req.body.deleteImages !== undefined) {
    const idsToDelete = parseJsonField(req.body.deleteImages, 'deleteImages', next);
    if (idsToDelete === null) return;

    await Promise.all(idsToDelete.map((publicId) => deleteFromCloudinary(publicId)));
    product.images = product.images.filter((img) => !idsToDelete.includes(img.public_id));
  }

  if (req.files && req.files.length > 0) {
    const uploadedImages = await uploadImages(req.files);
    product.images.push(...uploadedImages);
  }

  if (product.images.length === 0) {
    return next(new AppError(MESSAGES.AT_LEAST_ONE_IMAGE_REQUIRED, 400));
  }

  await product.save();

  res.status(200).json({
    success: true,
    message: 'Product updated successfully.',
    data: { product },
  });
});

// ------------------------------------------------------------------
// DELETE /products/:id   (Admin)
// ------------------------------------------------------------------
exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404));
  }

  await Promise.all(product.images.map((img) => deleteFromCloudinary(img.public_id)));
  await product.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Product and its images deleted successfully.',
  });
});

// ------------------------------------------------------------------
// POST /products/:id/reviews   (User)
// ------------------------------------------------------------------
exports.addReview = catchAsync(async (req, res, next) => {
  const { rating, comment } = req.body;

  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404));
  }

  const alreadyReviewed = product.reviews.some(
    (review) => review.user.toString() === req.user._id.toString()
  );
  if (alreadyReviewed) {
    return next(new AppError('You have already reviewed this product.', 400));
  }

  product.reviews.push({ user: req.user._id, rating, comment });
  product.calcAverageRating();
  await product.save();

  res.status(201).json({
    success: true,
    message: 'Review added successfully.',
    data: {
      averageRating: product.averageRating,
      numReviews: product.numReviews,
    },
  });
});

// ------------------------------------------------------------------
// DELETE /products/:id/reviews/:rid   (User/Admin)
// ------------------------------------------------------------------
exports.deleteReview = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404));
  }

  const review = product.reviews.id(req.params.rid);
  if (!review) {
    return next(new AppError(MESSAGES.REVIEW_NOT_FOUND, 404));
  }

  const isOwner = review.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    return next(new AppError('You are not allowed to delete this review.', 403));
  }

  review.deleteOne();
  product.calcAverageRating();
  await product.save();

  res.status(200).json({
    success: true,
    message: 'Review deleted successfully.',
  });
});

// ------------------------------------------------------------------
// GET /products/:id/reviews   (Public)
// ------------------------------------------------------------------
exports.getProductReviews = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate(
    'reviews.user',
    'username avatar'
  );

  if (!product) {
    return next(new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404));
  }

  res.status(200).json({
    success: true,
    count: product.reviews.length,
    averageRating: product.averageRating,
    data: product.reviews,
  });
});