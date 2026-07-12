const mongoose = require('mongoose');
const slugify = require('slugify');

// Embedded review subdocument — one per user per product (enforced in
// the controller, not here, since Mongoose doesn't easily support
// "unique per parent array" constraints).
const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

const imageSchema = new mongoose.Schema(
  {
    public_id: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      unique: true,
    },
    shortDescription: {
      type: String,
      required: [true, 'Short description is required'],
      maxlength: 500,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    discountPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    stock: {
      type: Number,
      required: [true, 'Stock is required'],
      min: 0,
    },
    sku: {
      type: String,
      trim: true,
    },
    images: {
      type: [imageSchema],
      validate: {
        validator: (arr) => arr.length >= 1,
        message: 'At least one product image is required.',
      },
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      lowercase: true,
      trim: true,
    },
    subcategory: {
      type: String,
      lowercase: true,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    reviews: {
      type: [reviewSchema],
      default: [],
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Auto-generate a unique, URL-friendly slug whenever the name changes.
// A short timestamp suffix keeps it unique even for duplicate names.
productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = `${slugify(this.name, { lower: true, strict: true })}-${Date.now().toString(36)}`;
  }
  next();
});

// Recalculates averageRating and numReviews from the current reviews
// array. Called after a review is added or removed — the caller is
// responsible for saving the document afterwards.
productSchema.methods.calcAverageRating = function () {
  if (this.reviews.length === 0) {
    this.averageRating = 0;
    this.numReviews = 0;
    return;
  }

  const total = this.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.averageRating = Math.round((total / this.reviews.length) * 10) / 10;
  this.numReviews = this.reviews.length;
};

// Text index powers the /products/search text search (name, description, brand)
productSchema.index({ name: 'text', description: 'text', brand: 'text' });

// Supporting indexes for common filters and sorting
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ averageRating: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);