const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');
const router = express.Router();
const mongoose = require('mongoose');

// @route   POST /api/orders
// @desc    Create a new order
// @access  Private
router.post('/', [
  auth,
  body('customerInfo.firstName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  body('customerInfo.lastName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  body('customerInfo.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('customerInfo.phone')
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone number must be between 10 and 20 characters'),
  body('customerInfo.address')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
  body('customerInfo.city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  body('customerInfo.state')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters'),
  body('customerInfo.zipCode')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Zip code must be between 3 and 20 characters'),
  body('customerInfo.country')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('payment.method')
    .isIn(['stripe', 'paypal', 'bank_transfer', 'cash_on_delivery', 'cod', 'card', 'jazz_cash', 'easypesa'])
    .withMessage('Invalid payment method'),
  body('shipping.method')
    .optional()
    .isIn(['standard', 'express', 'overnight', 'pickup'])
    .withMessage('Invalid shipping method'),
  body('shipping.cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Shipping cost must be a positive number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const orderData = req.body;
    const userId = req.user.userId;

    // If DB is not connected, return a mock order so checkout can proceed in demo/dev
    if (mongoose.connection.readyState !== 1) {
      const subtotalMock = (orderData.items || []).reduce((sum, it) => sum + ((it.price || 0) * (it.quantity || 0)), 0);
      const taxMock = 0;
      const shippingCostMock = orderData?.shipping?.cost || 0;
      const totalAmountMock = subtotalMock + taxMock + shippingCostMock;

      const mockOrder = {
        id: `mock-${Date.now()}`,
        orderNumber: `VF${new Date().toISOString().slice(2,10).replace(/-/g,'')}${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`,
        totalAmount: totalAmountMock,
        currency: orderData.currency || 'USD',
        orderStatus: 'pending',
        paymentStatus: 'pending',
        estimatedDelivery: new Date(Date.now() + 5*24*60*60*1000),
        customerInfo: orderData.customerInfo,
        items: (orderData.items || []).map(it => ({
          productId: it.id || it.productId || `frontend_${Date.now()}`,
          name: it.name,
          price: it.price,
          currency: it.currency || 'USD',
          quantity: it.quantity,
          image: it.image,
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return res.status(201).json({
        success: true,
        message: 'Order created successfully (mocked - DB disconnected)',
        data: { order: mockOrder }
      });
    }

    // Validate products and calculate totals
    let subtotal = 0;
    const validatedItems = [];

    for (const item of orderData.items) {
      // Handle both frontend and backend item formats
      const productId = item.productId || item.id;
      
      if (productId && mongoose.Types.ObjectId.isValid(productId)) {
        // Backend format - validate against database
        const product = await Product.findById(productId);
        if (!product) {
          return res.status(400).json({
            error: 'Invalid product',
            details: `Product with ID ${productId} not found`
          });
        }

        if (product.status !== 'active') {
          return res.status(400).json({
            error: 'Product unavailable',
            details: `Product ${product.name} is not available for purchase`
          });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({
            error: 'Insufficient stock',
            details: `Product ${product.name} only has ${product.stock} units in stock`
          });
        }

        // Check minimum order quantity
        if (item.quantity < (product.minOrder || 1)) {
          return res.status(400).json({
            error: 'Minimum order not met',
            details: `Product ${product.name} requires minimum order of ${product.minOrder || 1} units`
          });
        }

        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;

        validatedItems.push({
          productId: product._id,
          name: product.name,
          price: product.price,
          currency: 'PKR',
          quantity: item.quantity,
          image: product.images?.main || product.images?.gallery?.[0],
          sku: product.sku,
          specifications: product.specifications
        });
      } else {
        // Frontend format - use provided item data
        // All prices are in PKR - no conversion needed
        const itemTotal = (item.price || 0) * item.quantity;
        subtotal += itemTotal;

        validatedItems.push({
          productId: item.id || `frontend_${Date.now()}_${Math.random()}`,
          name: item.name || 'Unknown Product',
          price: item.price || 0,
          currency: 'PKR',
          quantity: item.quantity,
          image: item.image,
          sku: item.sku,
          specifications: item.specifications
        });
      }
    }

    // Calculate tax (you can implement your own tax logic)
    const tax = 0; // Placeholder for tax calculation
    const shippingCost = orderData.shipping?.cost || 0;
    const totalAmount = subtotal + tax + shippingCost;

    // Map payment method to backend format - keep jazz_cash as jazz_cash
    const paymentMethodMap = {
      'cod': 'cash_on_delivery',
      'card': 'stripe',
      'jazz_cash': 'jazz_cash',
      'easypesa': 'easypesa'
    };

    const backendPaymentMethod = paymentMethodMap[orderData.payment.method] || orderData.payment.method;

    // Create order
    const order = new Order({
      orderNumber: Order.generateOrderNumber(), // Explicitly generate order number
      customerId: userId,
      customerInfo: orderData.customerInfo,
      items: validatedItems,
      subtotal,
      tax,
      shipping: {
        method: orderData.shipping?.method || 'standard',
        cost: shippingCost
      },
      payment: {
        method: backendPaymentMethod,
        status: orderData.payment?.status || 'pending',
        amount: totalAmount,
        currency: 'PKR',
        transactionId: orderData.payment?.transactionId
      },
      totalAmount,
      currency: 'PKR',
      notes: orderData.notes,
      priority: orderData.priority || 'normal'
    });

    await order.save();

    // Update product stock only for backend products
    for (const item of validatedItems) {
      if (mongoose.Types.ObjectId.isValid(item.productId)) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity, 'analytics.orders': 1 }
        });
      }
    }

    // TODO: Send order confirmation email
    // TODO: Send admin notification

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: {
          id: order._id,
          _id: order._id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          currency: order.currency,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          estimatedDelivery: order.estimatedDelivery,
          customerInfo: order.customerInfo,
          items: order.items,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to create order'
    });
  }
});

// @route   GET /api/orders
// @desc    Get user orders
// @access  Private
router.get('/', [
  auth,
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
    .withMessage('Invalid order status'),
  query('paymentStatus')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed', 'refunded'])
    .withMessage('Invalid payment status'),
  query('search')
    .optional()
    .isString()
    .withMessage('Search must be a string')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { page = 1, limit = 20, status, paymentStatus, search } = req.query;
    const userId = req.user.userId;

    let filter = { customerId: userId };
    if (status) {
      filter.orderStatus = status;
    }
    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customerInfo.firstName': { $regex: search, $options: 'i' } },
        { 'customerInfo.lastName': { $regex: search, $options: 'i' } },
        { 'customerInfo.email': { $regex: search, $options: 'i' } },
        { 'customerInfo.phone': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('items.productId', 'name images')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      Order.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      success: true,
      data: {
        data: orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage,
          hasPrevPage
        }
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to fetch orders'
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.productId', 'name images specifications')
      .populate('customerId', 'displayName email');

    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        details: 'Order does not exist'
      });
    }

    // Check if user owns this order or is admin
    // Handle both populated and unpopulated customerId
    const orderCustomerId = order.customerId._id ? order.customerId._id.toString() : order.customerId.toString();
    
    if (orderCustomerId !== req.user.userId && !req.userInfo.isAdmin) {
      return res.status(403).json({
        error: 'Access denied',
        details: 'You can only view your own orders'
      });
    }

    res.json({ order });

  } catch (error) {
    console.error('Get order error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        error: 'Invalid ID',
        details: 'Order ID format is invalid'
      });
    }
    
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to fetch order'
    });
  }
});

// @route   GET /api/orders/number/:orderNumber
// @desc    Get order by order number
// @access  Private
router.get('/number/:orderNumber', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
      .populate('items.productId', 'name images specifications')
      .populate('customerId', 'displayName email');

    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        details: 'Order does not exist'
      });
    }

    // Check if user owns this order or is admin
    // Handle both populated and unpopulated customerId
    const orderCustomerId = order.customerId._id ? order.customerId._id.toString() : order.customerId.toString();
    
    if (orderCustomerId !== req.user.userId && !req.userInfo.isAdmin) {
      return res.status(403).json({
        error: 'Access denied',
        details: 'You can only view your own orders'
      });
    }

    res.json({ order });

  } catch (error) {
    console.error('Get order by number error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to fetch order'
    });
  }
});

// @route   PATCH /api/orders/:id/cancel
// @desc    Cancel an order
// @access  Private
router.patch('/:id/cancel', [
  auth,
  body('reason')
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Cancellation reason must be between 5 and 500 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        details: 'Order does not exist'
      });
    }

    // Check if user owns this order
    if (order.customerId.toString() !== req.user.userId) {
      return res.status(403).json({
        error: 'Access denied',
        details: 'You can only cancel your own orders'
      });
    }

    // Check if order can be cancelled
    if (!['pending', 'confirmed'].includes(order.orderStatus)) {
      return res.status(400).json({
        error: 'Cannot cancel order',
        details: 'Order cannot be cancelled in its current status'
      });
    }

    // Cancel order
    order.orderStatus = 'cancelled';
    order.cancellationReason = reason;
    await order.save();

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
        $inc: { 'analytics.orders': -1 }
      });
    }

    // TODO: Send cancellation email
    // TODO: Send admin notification

    res.json({
      message: 'Order cancelled successfully',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        cancellationReason: order.cancellationReason
      }
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        error: 'Invalid ID',
        details: 'Order ID format is invalid'
      });
    }
    
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to cancel order'
    });
  }
});

// @route   PATCH /api/orders/:id/status
// @desc    Update order status (Admin only)
// @access  Private (Admin only)
router.patch('/:id/status', [
  auth,
  adminAuth,
  body('status')
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
    .withMessage('Invalid order status'),
  body('note')
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Note must be between 5 and 500 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { status, note } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        details: 'Order does not exist'
      });
    }

    // Update order status
    await order.updateStatus(status, req.user.userId, note);

    // TODO: Send status update notification to customer

    res.json({
      message: 'Order status updated successfully',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        updatedAt: order.updatedAt
      }
    });

  } catch (error) {
    console.error('Update order status error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        error: 'Invalid ID',
        details: 'Order ID format is invalid'
      });
    }
    
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to update order status'
    });
  }
});

// @route   PATCH /api/orders/:id/payment-status
// @desc    Update order payment status (Admin only)
// @access  Private (Admin only)
router.patch('/:id/payment-status', [
  auth,
  adminAuth,
  body('paymentStatus')
    .isIn(['pending', 'completed', 'failed', 'processing', 'refunded'])
    .withMessage('Invalid payment status'),
  body('note')
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Note must be between 5 and 500 characters')
], async (req, res) => {
  try {
    console.log('🔐 Payment Status Update: Starting update for order:', req.params.id);
    console.log('🔐 Payment Status Update: MongoDB connection state:', mongoose.connection.readyState);
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Payment Status Update: Validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { paymentStatus, note } = req.body;
    console.log('🔐 Payment Status Update: Request body:', { paymentStatus, note });
    
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️  MongoDB not connected, handling mock order update for ID:', req.params.id);
      
      // For mock orders, we'll simulate a successful update
      const mockOrder = {
        _id: req.params.id,
        orderNumber: 'VF' + Date.now().toString().slice(-8),
        paymentStatus: paymentStatus,
        updatedAt: new Date()
      };
      
      console.log('✅ Mock order update successful:', mockOrder);
      
      return res.json({
        message: 'Payment status updated successfully (mock mode)',
        order: {
          id: mockOrder._id,
          orderNumber: mockOrder.orderNumber,
          paymentStatus: mockOrder.paymentStatus,
          updatedAt: mockOrder.updatedAt
        }
      });
    }
    
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        details: 'Order does not exist'
      });
    }

    // Update payment status
    order.paymentStatus = paymentStatus;
    order.payment.status = paymentStatus;
    
    // Add note to order history if provided
    if (note) {
      if (!order.adminNotes) order.adminNotes = [];
      order.adminNotes.push({
        note: note,
        adminId: req.user.userId,
        timestamp: new Date()
      });
    }
    
    order.updatedAt = new Date();
    await order.save();

    // TODO: Send payment status update notification to customer

    res.json({
      message: 'Payment status updated successfully',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        updatedAt: order.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Payment Status Update: Error occurred:', error);
    console.error('❌ Payment Status Update: Error stack:', error.stack);
    
    if (error.kind === 'ObjectId') {
      console.log('❌ Payment Status Update: ObjectId validation error');
      return res.status(400).json({
        error: 'Invalid ID',
        details: 'Order ID format is invalid'
      });
    }
    
    console.log('❌ Payment Status Update: Returning 500 error');
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to update payment status'
    });
  }
});

// @route   GET /api/orders/admin/all
// @desc    Get all orders (admin only)
// @access  Private (Admin)
router.get('/admin/all', [auth, adminAuth], async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️  MongoDB not connected, returning mock data');
      
      // Return mock data when database is not available
      const mockOrders = [
        {
          _id: 'mock-order-1',
          orderNumber: 'VF2508300001',
          customerInfo: {
            firstName: 'Muhammad Mazhar',
            lastName: 'Iqbal',
            email: 'this.mazhar@gmail.com',
            phone: '+92 302 7721500',
            address: '123 Test Street',
            city: 'Karachi',
            state: 'Sindh',
            zipCode: '12345',
            country: 'Pakistan'
          },
          items: [
            {
              productId: 'mock-product-1',
              name: 'Dry Onion',
              price: 1900,
              currency: 'PKR',
              quantity: 1,
              image: '/images/onion.jpg'
            }
          ],
          totalAmount: 1900,
          currency: 'PKR',
          orderStatus: 'pending',
          paymentStatus: 'processing',
          payment: {
            method: 'cod',
            status: 'processing'
          },
          createdAt: new Date('2025-08-30T15:26:00.000Z'),
          updatedAt: new Date('2025-08-30T15:26:00.000Z')
        },
        {
          _id: 'mock-order-2',
          orderNumber: 'VF2508300002',
          customerInfo: {
            firstName: 'Sarah',
            lastName: 'Ahmed',
            email: 'sarah.ahmed@example.com',
            phone: '+92 301 234 5678',
            address: '456 Park Avenue',
            city: 'Lahore',
            state: 'Punjab',
            zipCode: '54321',
            country: 'Pakistan'
          },
          items: [
            {
              productId: 'mock-product-2',
              name: 'Fresh Tomatoes',
              price: 2000,
              currency: 'PKR',
              quantity: 2,
              image: '/images/tomatoes.jpg'
            }
          ],
          totalAmount: 2400,
          currency: 'PKR',
          orderStatus: 'confirmed',
          paymentStatus: 'completed',
          payment: {
            method: 'bank_transfer',
            status: 'completed'
          },
          createdAt: new Date('2025-08-30T14:15:00.000Z'),
          updatedAt: new Date('2025-08-30T14:15:00.000Z')
        },
        {
          _id: 'mock-order-3',
          orderNumber: 'VF2508300003',
          customerInfo: {
            firstName: 'Ahmed',
            lastName: 'Khan',
            email: 'ahmed.khan@example.com',
            phone: '+92 302 345 6789',
            address: '789 Business District',
            city: 'Islamabad',
            state: 'Federal',
            zipCode: '98765',
            country: 'Pakistan'
          },
          items: [
            {
              productId: 'mock-product-3',
              name: 'Organic Potatoes',
              price: 1500,
              currency: 'PKR',
              quantity: 3,
              image: '/images/potatoes.jpg'
            },
            {
              productId: 'mock-product-4',
              name: 'Fresh Carrots',
              price: 800,
              currency: 'PKR',
              quantity: 2,
              image: '/images/carrots.jpg'
            }
          ],
          totalAmount: 5555,
          currency: 'PKR',
          orderStatus: 'shipped',
          paymentStatus: 'completed',
          payment: {
            method: 'stripe',
            status: 'completed'
          },
          createdAt: new Date('2025-08-30T13:00:00.000Z'),
          updatedAt: new Date('2025-08-30T13:00:00.000Z')
        }
      ];

      return res.json({
        success: true,
        data: {
          orders: mockOrders,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: mockOrders.length,
            itemsPerPage: mockOrders.length,
            hasNextPage: false,
            hasPrevPage: false
          }
        }
      });
    }

    const { page = 1, limit = 50, status, paymentStatus, search } = req.query;
    const skip = (page - 1) * limit;

    console.log('🔍 Admin Orders: Query params:', { page, limit, status, paymentStatus, search });

    // Build filter
    const filter = {};
    if (status && status !== 'all') {
      // Handle comma-separated status values
      if (status.includes(',')) {
        filter.orderStatus = { $in: status.split(',').map(s => s.trim()) };
      } else {
        filter.orderStatus = status;
      }
    }
    if (paymentStatus && paymentStatus !== 'all') {
      // Handle comma-separated payment status values
      if (paymentStatus.includes(',')) {
        filter.paymentStatus = { $in: paymentStatus.split(',').map(s => s.trim()) };
      } else {
        filter.paymentStatus = paymentStatus;
      }
    }
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customerInfo.firstName': { $regex: search, $options: 'i' } },
        { 'customerInfo.lastName': { $regex: search, $options: 'i' } },
        { 'customerInfo.email': { $regex: search, $options: 'i' } },
        { 'customerInfo.phone': { $regex: search, $options: 'i' } }
      ];
    }

    console.log('🔍 Admin Orders: Built filter:', JSON.stringify(filter, null, 2));

    // Get orders with pagination
    console.log('🔍 Admin Orders: Executing database query...');
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('customerId', 'displayName email')
      .lean();

    console.log('🔍 Admin Orders: Database query completed, found orders:', orders.length);

    // Get total count
    const total = await Order.countDocuments(filter);
    console.log('🔍 Admin Orders: Total count:', total);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get admin orders error:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongoNetworkError') {
      return res.status(503).json({
        error: 'Database Connection Error',
        details: 'Unable to connect to database. Please try again later.'
      });
    }
    
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to retrieve orders'
    });
  }
});

// @route   GET /api/orders/admin/download
// @desc    Download orders as CSV or Excel (Admin only)
// @access  Private (Admin only)
router.get('/admin/download', auth, adminAuth, async (req, res) => {
  try {
    const { format = 'csv', status, paymentStatus, search } = req.query;

    // Build filter
    const filter = {};
    if (status && status !== 'all') {
      filter.orderStatus = status;
    }
    if (paymentStatus && paymentStatus !== 'all') {
      filter.paymentStatus = paymentStatus;
    }
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customerInfo.firstName': { $regex: search, $options: 'i' } },
        { 'customerInfo.lastName': { $regex: search, $options: 'i' } },
        { 'customerInfo.email': { $regex: search, $options: 'i' } },
        { 'customerInfo.phone': { $regex: search, $options: 'i' } }
      ];
    }

    // Get all orders for download
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('customerId', 'displayName email')
      .lean();

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Order Number',
        'Customer Name',
        'Email',
        'Phone',
        'Address',
        'City',
        'State',
        'Country',
        'Order Status',
        'Payment Status',
        'Payment Method',
        'Total Amount',
        'Currency',
        'Items',
        'Created At',
        'Updated At'
      ];

      const csvRows = orders.map(order => [
        order.orderNumber,
        `${order.customerInfo.firstName} ${order.customerInfo.lastName}`,
        order.customerInfo.email,
        order.customerInfo.phone,
        order.customerInfo.address,
        order.customerInfo.city,
        order.customerInfo.state,
        order.customerInfo.country,
        order.orderStatus,
        order.paymentStatus,
        order.payment.method,
        order.totalAmount,
        order.currency,
        order.items.map(item => `${item.name} (${item.quantity})`).join('; '),
        new Date(order.createdAt).toLocaleString(),
        new Date(order.updatedAt).toLocaleString()
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="orders_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else if (format === 'excel') {
      // For Excel, we'll return JSON and let the frontend handle Excel generation
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="orders_${new Date().toISOString().split('T')[0]}.json"`);
      res.json({ orders });
    } else {
      res.status(400).json({
        error: 'Invalid format',
        details: 'Format must be csv or excel'
      });
    }
  } catch (error) {
    console.error('Download orders error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to download orders'
    });
  }
});

module.exports = router;
