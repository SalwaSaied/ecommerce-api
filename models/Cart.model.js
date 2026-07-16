const mongoose = require('mongoose');

// Snapshot of a product at the moment it was added to the cart.
// Storing name/image/price here (not just a reference) means the cart
// still shows correct historical info even if the product's price or
// details change later.
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one cart per user
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    coupon: {
      code: {
        type: String,
        uppercase: true,
        default: null,
      },
      discountType: {
        type: String,
        enum: ['percentage', 'fixed', null],
        default: null,
      },
      discountValue: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
    // Virtuals only get included in the API response if we turn this on —
    // by default Mongoose hides them from JSON/object output.
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// subtotal — sum of (price × quantity) across every item. Never stored;
// recalculated fresh every time it's read.
cartSchema.virtual('subtotal').get(function () {
  return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
});

// discountAmount — how much the applied coupon actually saves, based on
// the CURRENT subtotal (so it stays correct even as the cart changes).
cartSchema.virtual('discountAmount').get(function () {
  if (!this.coupon || !this.coupon.discountType) return 0;

  const subtotal = this.subtotal;

  if (this.coupon.discountType === 'percentage') {
    return Math.round(((subtotal * this.coupon.discountValue) / 100) * 100) / 100;
  }

  if (this.coupon.discountType === 'fixed') {
    // Never let a fixed discount make the total negative
    return Math.min(this.coupon.discountValue, subtotal);
  }

  return 0;
});

// total — subtotal minus whatever the coupon discounts
cartSchema.virtual('total').get(function () {
  return Math.max(this.subtotal - this.discountAmount, 0);
});

// itemCount — total number of units across all items (not just the
// number of distinct products — 2 shirts + 3 shoes = itemCount 5)
cartSchema.virtual('itemCount').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

module.exports = mongoose.model('Cart', cartSchema);