// Static coupon catalog. Kept here (not in the controller) so it's easy
// to find, edit, or extend without touching business logic.
module.exports = {
  SAVE10: { discountType: 'percentage', discountValue: 10 },
  SAVE20: { discountType: 'percentage', discountValue: 20 },
  SAVE50: { discountType: 'percentage', discountValue: 50 },
  SAVE80: { discountType: 'percentage', discountValue: 80 },
  OFF50: { discountType: 'fixed', discountValue: 50 },
};