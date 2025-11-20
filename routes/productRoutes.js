const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Product = require("../models/Products");
const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");
const upload = require('../middleware/upload.middleware');

// Middleware to check MongoDB connection
const checkConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: "Database connection not available",
      message: "MongoDB is not connected. Please check your database connection string and try again.",
      readyState: mongoose.connection.readyState
    });
  }
  next();
};

// Get all products
router.get("/", checkConnection, async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const products = await Product.find(query).sort({ createdAt: -1 }).maxTimeMS(30000);
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
      return res.status(503).json({ 
        error: "Database connection error",
        message: "Unable to connect to MongoDB. Please check your database connection."
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get single product
router.get("/:id", checkConnection, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).maxTimeMS(30000);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    console.error("Error fetching product:", err);
    if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
      return res.status(503).json({ 
        error: "Database connection error",
        message: "Unable to connect to MongoDB. Please check your database connection."
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// Create product with optional image upload
router.post("/", authenticate, authorizeRoles("Admin"), upload.single('image'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      // Build public URL for uploaded file
      const host = req.get('host');
      const protocol = req.protocol;
      data.image = `${protocol}://${host}/uploads/${req.file.filename}`;
    }

    const product = new Product(data);
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update product with optional image upload
router.put('/:id', authenticate, authorizeRoles('Admin'), upload.single('image'), async (req, res) => {
  try {
    const update = { ...req.body };
    if (req.file) {
      const host = req.get('host');
      const protocol = req.protocol;
      update.image = `${protocol}://${host}/uploads/${req.file.filename}`;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
 
// Delete product
router.delete("/:id", authenticate, authorizeRoles("Admin"), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

