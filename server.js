const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.warn("Warning: JWT_SECRET is not set. Authentication tokens will be insecure.");
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI

if (!process.env.MONGODB_URI) {
  console.warn("⚠️  MONGODB_URI not set, using default localhost connection");
}

// MongoDB connection options for production/deployment
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
  connectTimeoutMS: 30000, // 30 seconds
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 5, // Maintain at least 5 socket connections
  retryWrites: true,
  w: 'majority'
};

mongoose
  .connect(MONGODB_URI, mongooseOptions)
  .then(() => {
    console.log("✅ MongoDB Connected");
    console.log(`📊 Database: ${mongoose.connection.name}`);
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
    console.error("🔍 Make sure your MONGODB_URI is correct and MongoDB is accessible");
    // Don't exit process, allow server to start but routes will handle errors
  });

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// Routes
app.use("/api/auth", require("./routes/auth.route"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/cart", require("./routes/cartRouters"));
app.use("/api/orders", require("./routes/orderRouters"));

// // Serve frontend
// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "public", "index.html"));
// });

// Health check endpoint
app.get("/health", (req, res) => {
  const mongoState = mongoose.connection.readyState;
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };
  
  res.json({
    status: mongoState === 1 ? "healthy" : "unhealthy",
    mongodb: {
      state: states[mongoState] || "unknown",
      readyState: mongoState
    },
    timestamp: new Date().toISOString()
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "E-Commerce API Server",
    status: "running",
    endpoints: {
      health: "/health",
      products: "/api/products",
      auth: "/api/auth",
      cart: "/api/cart",
      orders: "/api/orders"
    }
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

