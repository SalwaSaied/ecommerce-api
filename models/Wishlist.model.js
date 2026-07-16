const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one wishlist per user
      index: true,
    },
    products: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// Auto-populate full product details on EVERY find/findOne/findById
// query, so no controller ever has to remember to call .populate()
// manually — the /^find/ regex matches all of Mongoose's find-style
// query methods.
wishlistSchema.pre(/^find/, function (next) {
  this.populate('products');
  next();
});

module.exports = mongoose.model('Wishlist', wishlistSchema);