// Centralized error messages that repeat across multiple controllers.
// Keeping them here means a wording change only needs to happen once,
// and avoids the same literal string being typed (and possibly
// mistyped) in several places.
module.exports = {
  PRODUCT_NOT_FOUND: 'Product not found.',
  REVIEW_NOT_FOUND: 'Review not found.',
  USER_NOT_FOUND: 'User not found.',
  AT_LEAST_ONE_IMAGE_REQUIRED: 'At least one product image is required.',
  CART_NOT_FOUND: 'Cart not found.',
  CART_ITEM_NOT_FOUND: 'Item not found in cart.',
  INVALID_COUPON: 'Invalid coupon code.',
  WISHLIST_NOT_FOUND: 'Wishlist not found.',
  PRODUCT_ALREADY_IN_WISHLIST: 'Product is already in your wishlist.',
  ORDER_NOT_FOUND: 'Order not found.',

  
};