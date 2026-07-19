const express = require('express');
const router = express.Router();

const wishlistController = require('../controllers/wishlist.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.get('/my', protect, wishlistController.getMyWishlist);
router.post('/add/:productId', protect, wishlistController.addProduct);
router.delete('/remove/:productId', protect, wishlistController.removeProduct);
router.delete('/clear', protect, wishlistController.clearWishlist);
// GET /wishlists/admin/all — Admin only: view all users' wishlists
router.get('/admin/all', protect, adminOnly, wishlistController.getAllWishlistsAdmin);

// GET /wishlists/admin/stats — Admin only: wishlist statistics
router.get('/admin/stats', protect, adminOnly, wishlistController.getWishlistStatsAdmin);

module.exports = router;