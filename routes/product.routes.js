const express = require('express');
const router = express.Router();

const productController = require('../controllers/product.controller');
const validate = require('../middleware/validate.middleware');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const {
  createProductSchema,
  updateProductSchema,
  reviewSchema,
} = require('../validation/product.validation');

// GET /products/search — Public, but identifies admins via optionalAuth
// so they can see inactive products too (see searchProducts controller).
// IMPORTANT: must be declared BEFORE /:id, otherwise Express would treat
// "search" as an :id value and this route would never be reached.
router.get('/search', optionalAuth, productController.searchProducts);

// GET /products — Public, but identifies admins via optionalAuth
router.get('/', optionalAuth, productController.getAllProducts);

// GET /products/:id — Public, but identifies admins via optionalAuth
router.get('/:id', optionalAuth, productController.getProductById);

// GET /products/:id/reviews — Public
router.get('/:id/reviews', productController.getProductReviews);

// POST /products — Admin: create a product with 1+ images
router.post(
  '/',
  protect,
  adminOnly,
  upload.array('images', 10),
  validate(createProductSchema),
  productController.createProduct
);

// PUT /products/update/:id — Admin: update a product, add/remove images
router.put(
  '/update/:id',
  protect,
  adminOnly,
  upload.array('images', 10),
  validate(updateProductSchema),
  productController.updateProduct
);

// DELETE /products/:id — Admin: delete a product and its Cloudinary images
router.delete('/:id', protect, adminOnly, productController.deleteProduct);

// POST /products/:id/reviews — User: add a review (one per user per product)
router.post(
  '/:id/reviews',
  protect,
  validate(reviewSchema),
  productController.addReview
);

// DELETE /products/:id/reviews/:rid — User/Admin: delete a review
router.delete('/:id/reviews/:rid', protect, productController.deleteReview);

module.exports = router;