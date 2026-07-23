const Stripe = require('stripe');

// Initialized once, reused everywhere Stripe is needed.
const stripe = new Stripe(process.env.sk_test_51TwTnBK41h4RmY3KUvwDAdjW8uJAZWIOTTl5ybjJsMM11YUkgWcNkCbAz3Xh5ZoEEZKbAIwDYc8KYDQdeA5rX5Uh005PVKTrcD);

module.exports = stripe;