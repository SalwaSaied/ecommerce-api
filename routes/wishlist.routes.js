const express = require('express');
const router = express.Router();

const wishlistController = require('../controllers/wishlist.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/my', protect, wishlistController.getMyWishlist);
router.post('/add/:productId', protect, wishlistController.addProduct);
router.delete('/remove/:productId', protect, wishlistController.removeProduct);
router.delete('/clear', protect, wishlistController.clearWishlist);

module.exports = router;