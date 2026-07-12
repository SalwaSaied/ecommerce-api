// Centralized error messages that repeat across multiple controllers.
// Keeping them here means a wording change only needs to happen once,
// and avoids the same literal string being typed (and possibly
// mistyped) in several places.
module.exports = {
  PRODUCT_NOT_FOUND: 'Product not found.',
  REVIEW_NOT_FOUND: 'Review not found.',
  USER_NOT_FOUND: 'User not found.',
  AT_LEAST_ONE_IMAGE_REQUIRED: 'At least one product image is required.',
};