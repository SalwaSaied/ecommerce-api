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
// Serve the Stripe test page as a route
app.get('/test-stripe', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Stripe Test Payment</title>
  <script src="https://js.stripe.com/v3/"></script>
  <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
</head>
<body>
  <h1>Test Stripe Payment</h1>
  <div>
    <label>Enter your JWT token:</label><br>
    <input type="text" id="token" placeholder="eyJhbGciOi..." size="60" />
  </div>
  <br>
  <div id="card-element"></div>
  <br>
  <button id="pay-btn">Pay Now</button>
  <div id="payment-result"></div>

  <script>
    const stripe = Stripe("pk_test_51TZep4J5pfNk8Lyf4FEvsiR22z6wptUEjODBGaPsB9fJ0NNoJuYSzMn5pu8wlm3zAaDyBOwPcabEIwcaqWHNVAkA00bkoY0g8E");
    const elements = stripe.elements();
    const cardElement = elements.create("card", { style: { base: { fontSize: "16px" } } });
    cardElement.mount("#card-element");

    document.getElementById("pay-btn").addEventListener("click", async () => {
      const token = document.getElementById("token").value.trim();
      if (!token) {
        alert("Please enter your JWT token");
        return;
      }

      try {
        const { data } = await axios.post(
          "/orders",
          {
            paymentMethod: "stripe",
            shippingAddress: {
              fullName: "Test User",
              phone: "01000000000",
              country: "Egypt",
              city: "Cairo",
              address: "123 Test St",
              postalCode: "12345"
            }
          },
          { headers: { Authorization: "Bearer " + token } }
        );

        const clientSecret = data.clientSecret;
        console.log("ClientSecret:", clientSecret);

        const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: { name: "Test User" }
          }
        });

        if (error) {
          document.getElementById("payment-result").innerText = "Payment failed: " + error.message;
        } else if (paymentIntent.status === "succeeded") {
          document.getElementById("payment-result").innerText = "✅ Payment successful!";
        }
      } catch (err) {
        console.error(err);
        document.getElementById("payment-result").innerText =
          "Error: " + (err.response?.data?.message || err.message);
      }
    });
  </script>
</body>
</html>
  `);
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
