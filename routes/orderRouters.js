const express = require("express");
const router = express.Router();
const Order = require("../models/Orders");
const Cart = require("../models/Cart");
const Product = require("../models/Products");

// Create new order
router.post("/", async (req, res) => {
  try {
    const { customerName, customerEmail, sessionId } = req.body;

    // Validate required fields
    if (!customerName || !customerEmail || !sessionId) {
      return res.status(400).json({
        error: "Customer name, email, and session ID are required",
      });
    }

    // Get cart items
    const cart = await Cart.findOne({ sessionId }).populate("items.productId");

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        error: "Cart is empty. Cannot create order.",
      });
    }

    // Calculate order details
    const subtotal = cart.total || 0;
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    // Prepare order items
    const orderItems = cart.items.map((item) => {
      const product = item.productId;
      return {
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      };
    });

    // Create order
    const order = new Order({
      customerName,
      customerEmail,
      sessionId,
      items: orderItems,
      subtotal,
      tax,
      total,
      status: "pending",
    });

    await order.save();

    // Update product stock (optional - decrease stock quantities)
    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock -= item.quantity;
        if (product.stock < 0) product.stock = 0;
        await product.save();
      }
    }

    // Clear cart after order creation
    await Cart.findOneAndUpdate({ sessionId }, { items: [], total: 0 });

    // Populate product details in response
    await order.populate("items.productId");

    res.status(201).json({
      message: "Order created successfully",
      order: order,
    });
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all orders
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("items.productId");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single order
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "items.productId"
    );

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get orders by customer email
router.get("/customer/:email", async (req, res) => {
  try {
    const orders = await Order.find({ customerEmail: req.params.email })
      .sort({ createdAt: -1 })
      .populate("items.productId");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update order status
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["pending", "processing", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate("items.productId");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

