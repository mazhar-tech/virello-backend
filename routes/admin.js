const express = require("express");
const { body, validationResult } = require("express-validator");
const { auth, adminAuth } = require("../middleware/auth");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Settings = require("../models/Settings");
const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get("/dashboard", auth, adminAuth, async (req, res) => {
  try {
    // Fetch all data in parallel for better performance
    const [users, products, orders] = await Promise.all([
      User.find({}).select("-password").sort({ createdAt: -1 }),
      Product.find({}).sort({ createdAt: -1 }),
      Order.find({})
        .populate("customerId", "displayName email")
        .sort({ createdAt: -1 }),
    ]);

    // Calculate statistics
    const totalUsers = users.length;
    const totalProducts = products.length;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => {
      return sum + (order.totalAmount || 0);
    }, 0);

    // Get recent orders (last 5)
    const recentOrders = orders.slice(0, 5);

    // Get recent users (last 5)
    const recentUsers = users.slice(0, 5);

    // Calculate percentage changes (mock data for now)
    const userChange = "+12%";
    const productChange = "+5%";
    const orderChange = "+8%";
    const revenueChange = "+15%";

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalProducts,
          totalOrders,
          totalRevenue,
          userChange,
          productChange,
          orderChange,
          revenueChange,
        },
        recentOrders,
        recentUsers,
      },
    });
  } catch (error) {
    console.error("Get dashboard error:", error);
    res.status(500).json({
      error: "Server Error",
      details: "Failed to fetch dashboard data",
    });
  }
});

// @route   GET /api/admin/orders
// @desc    Get all orders for admin
// @access  Private (Admin only)
router.get("/orders", auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, paymentStatus, search } = req.query;

    // Build query
    const query = {};
    if (status && status !== "all") query.orderStatus = status;
    if (paymentStatus && paymentStatus !== "all")
      query.paymentStatus = paymentStatus;
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "customerInfo.firstName": { $regex: search, $options: "i" } },
        { "customerInfo.lastName": { $regex: search, $options: "i" } },
        { "customerInfo.email": { $regex: search, $options: "i" } },
      ];
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const orders = await Order.find(query)
      .populate("customerId", "displayName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get admin orders error:", error);
    res.status(500).json({
      error: "Server Error",
      details: "Failed to fetch orders",
    });
  }
});

// @route   GET /api/admin/orders/:id
// @desc    Get specific order for admin
// @access  Private (Admin only)
router.get("/orders/:id", auth, adminAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "customerId",
      "displayName email"
    );

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
        details: "Order does not exist",
      });
    }

    res.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    console.error("Get admin order error:", error);
    res.status(500).json({
      error: "Server Error",
      details: "Failed to fetch order",
    });
  }
});

// @route   PATCH /api/admin/orders/:id/status
// @desc    Update order status
// @access  Private (Admin only)
router.patch(
  "/orders/:id/status",
  [
    auth,
    adminAuth,
    body("status")
      .isIn([
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ])
      .withMessage("Invalid order status"),
    body("note")
      .optional()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage("Note must be between 1 and 500 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation Error",
          details: errors.array(),
        });
      }

      const { status, note } = req.body;
      const order = await Order.findById(req.params.id);

      if (!order) {
        return res.status(404).json({
          error: "Order not found",
          details: "Order does not exist",
        });
      }

      // Update order status
      await order.updateStatus(status, req.user.userId, note);

      res.json({
        success: true,
        message: "Order status updated successfully",
        data: { order },
      });
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(500).json({
        error: "Server Error",
        details: "Failed to update order status",
      });
    }
  }
);

// @route   GET /api/admin/settings
// @desc    Get admin settings
// @access  Private (Admin only)
router.get("/settings", auth, adminAuth, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = new Settings({
        lastUpdatedBy: req.user.userId
      });
      await settings.save();
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({
      error: "Server Error",
      details: "Failed to fetch settings",
    });
  }
});

// @route   PUT /api/admin/settings
// @desc    Update admin settings
// @access  Private (Admin only)
router.put("/settings", [
  auth,
  adminAuth,
  body("minimumOrderAmount")
    .isNumeric()
    .withMessage("Minimum order amount must be a number"),
  body("shippingCharge")
    .isNumeric()
    .withMessage("Shipping charge must be a number"),
  body("freeShippingCurrency")
    .isString()
    .withMessage("Free shipping currency must be a string"),
  body("freeShippingEnabled")
    .isBoolean()
    .withMessage("Free shipping enabled must be a boolean"),
  body("discountSettings.enabled")
    .isBoolean()
    .withMessage("Discount enabled must be a boolean"),
  body("discountSettings.defaultDiscountPercentage")
    .isNumeric()
    .withMessage("Default discount percentage must be a number"),
  body("discountSettings.minimumDiscountAmount")
    .isNumeric()
    .withMessage("Minimum discount amount must be a number"),
  body("discountSettings.maximumDiscountAmount")
    .isNumeric()
    .withMessage("Maximum discount amount must be a number"),
  body("discountSettings.discountCurrency")
    .isString()
    .withMessage("Discount currency must be a string"),
  body("discountSettings.showOriginalPrice")
    .isBoolean()
    .withMessage("Show original price must be a boolean"),
  body("discountSettings.showDiscountBadge")
    .isBoolean()
    .withMessage("Show discount badge must be a boolean"),
  body("discountSettings.discountBadgeText")
    .isString()
    .withMessage("Discount badge text must be a string"),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation Error",
        details: errors.array(),
      });
    }

    const {
      minimumOrderAmount,
      shippingCharge,
      freeShippingCurrency,
      freeShippingEnabled,
      discountSettings,
      shippingZones
    } = req.body;

    // Find existing settings or create new one
    let settings = await Settings.findOne();
    
    if (settings) {
      // Update existing settings
      settings.minimumOrderAmount = minimumOrderAmount;
      settings.shippingCharge = shippingCharge;
      settings.freeShippingCurrency = freeShippingCurrency;
      settings.freeShippingEnabled = freeShippingEnabled;
      settings.discountSettings = discountSettings;
      settings.shippingZones = shippingZones || [];
      settings.lastUpdatedBy = req.user.userId;
      settings.lastUpdatedAt = new Date();
      
      await settings.save();
    } else {
      // Create new settings
      settings = new Settings({
        minimumOrderAmount,
        shippingCharge,
        freeShippingCurrency,
        freeShippingEnabled,
        discountSettings,
        shippingZones: shippingZones || [],
        lastUpdatedBy: req.user.userId
      });
      
      await settings.save();
    }

    res.json({
      success: true,
      message: "Settings updated successfully",
      data: settings
    });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({
      error: "Server Error",
      details: "Failed to update settings",
    });
  }
});

module.exports = router;
