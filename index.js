require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const connectDB = require('./DB/connection');
const errorHandler = require('./middleware/error.middleware');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const cartRoutes = require('./routes/cart.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const orderRoutes = require('./routes/order.routes');
const orderController = require('./controllers/order.controller');



const app = express();
app.use(express.static('public'));
// Core middleware
app.use(cors());
// Stripe webhook needs the RAW request body for signature verification,
app.post('/orders/webhook/stripe', express.raw({ type: 'application/json' }), orderController.stripeWebhook);
app.use(express.json());
app.use(cookieParser());
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Connect to MongoDB
connectDB();

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/products', productRoutes);
app.use('/carts', cartRoutes);
app.use('/wishlists', wishlistRoutes);
app.use('/orders', orderRoutes);


// Health check
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Ecommerce API is running 🚀' });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler — must be registered last
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Vercel imports this file as a serverless function
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;
