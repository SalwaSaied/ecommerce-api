console.log('🔑 STRIPE_SECRET_KEY is:', process.env.STRIPE_SECRET_KEY ? 'SET ✅' : 'MISSING ❌');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
module.exports = stripe;