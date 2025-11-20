const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const Product = require("../models/Products");

// Get or create cart
router.get("/:sessionId", async (req, res) => {
  try {
    let cart = await Cart.findOne({ sessionId: req.params.sessionId }).populate(
      "items.productId"
    );

    if (!cart) {
      cart = new Cart({ sessionId: req.params.sessionId, items: [] });
      await cart.save();
    }

    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add item to cart
router.post("/:sessionId/items", async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ error: "Insufficient stock" });
    }

    let cart = await Cart.findOne({ sessionId: req.params.sessionId });

    if (!cart) {
      cart = new Cart({ sessionId: req.params.sessionId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({
        productId,
        quantity,
        price: product.price,
      });
    }

    await cart.save();
    await cart.populate("items.productId");

    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update cart item quantity
router.put("/:sessionId/items/:itemId", async (req, res) => {
  try {
    const { quantity } = req.body;
    const cart = await Cart.findOne({ sessionId: req.params.sessionId });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    if (quantity <= 0) {
      cart.items.pull(req.params.itemId);
    } else {
      item.quantity = quantity;
    }

    await cart.save();
    await cart.populate("items.productId");

    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove item from cart
router.delete("/:sessionId/items/:itemId", async (req, res) => {
  try {
    const cart = await Cart.findOne({ sessionId: req.params.sessionId });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    cart.items.pull(req.params.itemId);
    await cart.save();
    await cart.populate("items.productId");

    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear cart
router.delete("/:sessionId", async (req, res) => {
  try {
    const cart = await Cart.findOneAndUpdate(
      { sessionId: req.params.sessionId },
      { items: [], total: 0 },
      { new: true }
    );

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

