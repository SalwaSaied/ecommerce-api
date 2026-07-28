const mongoose = require('mongoose');

// In serverless environments (Vercel), this module can be re-invoked
// on a "cold start" for every new function instance. We cache the
// connection (and the in-flight connection PROMISE) on the global
// object so repeated invocations reuse the same connection instead of
// opening a new one every time — opening too many connections quickly
// exhausts MongoDB Atlas's connection limit.
let cached = global._mongooseConnection;
if (!cached) {
  cached = global._mongooseConnection = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI).then((mongooseInstance) => {
      console.log(`✅ MongoDB Connected: ${mongooseInstance.connection.host}`);
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
   
    cached.promise = null; // allow the next request to retry instead of being stuck forever
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    throw error;
  }

  return cached.conn;
};

module.exports = connectDB;