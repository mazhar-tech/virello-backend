const express = require('express');
const mongoose = require('mongoose');
const { body, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');
const router = express.Router();

// Import cloud storage utilities
let cloudinaryUtils = null;
try {
  cloudinaryUtils = require('../utils/cloudinary');
} catch (error) {
  console.log('Cloudinary not configured, using local storage');
}

// Configure multer for file uploads
const isProduction = process.env.NODE_ENV === 'production';
const useCloudStorage = isProduction && cloudinaryUtils; // Use Cloudinary in production if configured

let storage, upload;

if (useCloudStorage && cloudinaryUtils) {
  // Use Cloudinary for production
  console.log('🔧 Using Cloudinary for image storage');
  storage = cloudinaryUtils.storage;
  upload = cloudinaryUtils.upload;
} else {
  // Use local storage (temporary solution)
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(__dirname, '../public/uploads');
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  upload = multer({ 
    storage: storage,
    limits: {
      fileSize: 2 * 1024 * 1024 // Reduced to 2MB limit for better performance
    },
    fileFilter: function (req, file, cb) {
      // Check file type
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'), false);
      }
    }
  });
}

// @route   GET /api/products
// @desc    Get all products with filtering and pagination
// @access  Public
router.get('/', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category must be between 1 and 100 characters'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be between 1 and 200 characters'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min price must be a positive number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max price must be a positive number'),
  query('inStock')
    .optional()
    .isBoolean()
    .withMessage('In stock must be a boolean'),
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'out_of_stock', 'discontinued'])
    .withMessage('Invalid status value')
], async (req, res) => {
  console.log('🔍 Products API called with query:', req.query);
  
  // Check if MongoDB is connected
  if (mongoose.connection.readyState !== 1) {
    console.log('🔍 MongoDB not connected, returning error');
    return res.status(503).json({
      error: 'Database Unavailable',
      details: 'Database connection is not available. Please try again later.'
    });
  }
  
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      category,
      search,
      minPrice,
      maxPrice,
      inStock,
      status = 'active',
      showAll = false
    } = req.query;

    // Build filter
    let filter = {};
    
    // Only apply status filter if showAll is not true and status is not 'all'
    if (showAll !== 'true' && status !== 'all') {
      filter.status = status;
    }
    console.log('🔍 Building filter with status:', status);
    
    if (category) {
      filter.category = category;
    }
    
    if (search) {
      filter.$text = { $search: search };
    }
    
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = parseFloat(maxPrice);
    }
    
    if (inStock === 'true') {
      filter.stock = { $gt: 0 };
    }
    
    console.log('🔍 Final filter:', filter);

    // Execute query
    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log('🔍 Executing query with skip:', skip, 'limit:', limit);
    
    const [products, total] = await Promise.all([
      Product.find(filter)
        .select('-__v')
        .sort({ 'analytics.views': -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .maxTimeMS(15000), // 15 second timeout
      Product.countDocuments(filter).maxTimeMS(15000) // 15 second timeout
    ]);
    
    console.log('🔍 Query results - products found:', products.length, 'total:', total);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage,
        hasPrevPage
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    
    // Check if it's a MongoDB connection error
    if (error.name === 'MongooseError' || error.name === 'MongoServerSelectionError' || error.name === 'MongoNetworkTimeoutError') {
      return res.status(503).json({
        error: 'Database Unavailable',
        details: 'Database connection is not available. Please try again later.'
      });
    }
    
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to fetch products'
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select('-__v');
    
    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
        details: 'Product does not exist'
      });
    }

    // Increment view count
    await product.incrementViews();

    res.json({ product });

  } catch (error) {
    console.error('Get product error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        error: 'Invalid ID',
        details: 'Product ID format is invalid'
      });
    }
    
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to fetch product'
    });
  }
});

// @route   GET /api/products/slug/:slug
// @desc    Get product by slug
// @access  Public
router.get('/slug/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ 'seo.slug': req.params.slug }).select('-__v');
    
    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
        details: 'Product does not exist'
      });
    }

    // Increment view count
    await product.incrementViews();

    res.json({ product });

  } catch (error) {
    console.error('Get product by slug error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to fetch product'
    });
  }
});

// @route   GET /api/products/category/:category
// @desc    Get products by category
// @access  Public
router.get('/category/:category', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
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

    const { page = 1, limit = 20 } = req.query;
    const { category } = req.params;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [products, total] = await Promise.all([
      Product.getByCategory(category, parseInt(limit), parseInt(page)),
      Product.countDocuments({ category, status: 'active' })
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      products,
      category,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage,
        hasPrevPage
      }
    });

  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to fetch products by category'
    });
  }
});

// @route   POST /api/products
// @desc    Create a new product
// @access  Private (Admin only)
router.post('/', [
  auth,
  adminAuth,
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Name must be between 2 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  body('category')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category must be between 2 and 100 characters'),
  body('packaging')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Packaging must be between 2 and 100 characters'),
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be exactly 3 characters'),
  body('minOrder')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Min order must be a positive integer'),
  body('imageUrl')
    .optional()
    .isString()
    .withMessage('Image URL must be a string'),
  body('sku')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('SKU must be between 3 and 50 characters'),
  body('barcode')
    .optional()
    .trim()
    .isLength({ min: 8, max: 20 })
    .withMessage('Barcode must be between 8 and 20 characters'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'out_of_stock', 'discontinued'])
    .withMessage('Invalid status value')
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

    const productData = req.body;
    
    console.log('🔍 Product creation - received data:', productData);
    console.log('🔍 Product creation - status from request:', productData.status);

    // Check if SKU or barcode already exists
    if (productData.sku) {
      const existingSku = await Product.findOne({ sku: productData.sku });
      if (existingSku) {
        return res.status(400).json({
          error: 'Duplicate SKU',
          details: 'A product with this SKU already exists'
        });
      }
    }

    if (productData.barcode) {
      const existingBarcode = await Product.findOne({ barcode: productData.barcode });
      if (existingBarcode) {
        return res.status(400).json({
          error: 'Duplicate barcode',
          details: 'A product with this barcode already exists'
        });
      }
    }

    // Generate slug if not provided
    if (!productData.seo?.slug) {
      productData.seo = productData.seo || {};
      productData.seo.slug = productData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    // Set default values
    productData.status = productData.status || 'active';
    productData.currency = productData.currency || 'USD';
    productData.minOrder = productData.minOrder || 1;
    
    console.log('🔍 Product creation - final status before save:', productData.status);

    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      message: 'Product created successfully',
      product
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to create product'
    });
  }
});

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private (Admin only)
router.put('/:id', [
  auth,
  adminAuth,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Name must be between 2 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  body('category')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category must be between 2 and 100 characters'),
  body('packaging')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Packaging must be between 2 and 100 characters')
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

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
        details: 'Product does not exist'
      });
    }

    res.json({
      message: 'Product updated successfully',
      product
    });

  } catch (error) {
    console.error('Update product error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        error: 'Invalid ID',
        details: 'Product ID format is invalid'
      });
    }
    
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to update product'
    });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private (Admin only)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
        details: 'Product does not exist'
      });
    }

    res.json({
      message: 'Product deleted successfully',
      productId: req.params.id
    });

  } catch (error) {
    console.error('Delete product error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        error: 'Invalid ID',
        details: 'Product ID format is invalid'
      });
    }
    
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to delete product'
    });
  }
});

// @route   PATCH /api/products/:id/stock
// @desc    Update product stock
// @access  Private (Admin only)
router.patch('/:id/stock', [
  auth,
  adminAuth,
  body('quantity')
    .isInt()
    .withMessage('Quantity must be an integer'),
  body('operation')
    .isIn(['increase', 'decrease'])
    .withMessage('Operation must be either increase or decrease')
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

    const { quantity, operation } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
        details: 'Product does not exist'
      });
    }

    await product.updateStock(quantity, operation);

    res.json({
      message: 'Stock updated successfully',
      product: {
        id: product._id,
        name: product.name,
        stock: product.stock,
        status: product.status
      }
    });

  } catch (error) {
    console.error('Update stock error:', error);
    
    if (error.message === 'Insufficient stock') {
      return res.status(400).json({
        error: 'Insufficient stock',
        details: error.message
      });
    }
    
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to update stock'
    });
  }
});

// @route   GET /api/products/search/suggestions
// @desc    Get search suggestions
// @access  Public
router.get('/search/suggestions', [
  query('q')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
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

    const { q } = req.query;

    const suggestions = await Product.find({
      $text: { $search: q },
      status: 'active'
    })
    .select('name category')
    .limit(10)
    .sort({ 'analytics.views': -1 });

    res.json({ suggestions });

  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to get search suggestions'
    });
  }
});

// @route   GET /api/products/optimized-image/:filename
// @desc    Serve optimized product image
// @access  Public
router.get('/optimized-image/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, '../public/uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Set cache headers for better performance
    res.set({
      'Cache-Control': 'public, max-age=31536000', // 1 year cache
      'ETag': `"${filename}"`,
      'Content-Type': 'image/jpeg'
    });
    
    // Send the file
    res.sendFile(imagePath);
  } catch (error) {
    console.error('Error serving optimized image:', error);
    res.status(500).json({ error: 'Error serving image' });
  }
});

// @route   GET /api/products/test-cloudinary
// @desc    Test Cloudinary connectivity
// @access  Private (Admin only)
router.get('/test-cloudinary', auth, adminAuth, async (req, res) => {
  try {
    console.log('🔧 Testing Cloudinary connectivity...');
    
    if (!cloudinaryUtils) {
      return res.status(500).json({
        error: 'Cloudinary not configured',
        details: 'Cloudinary utilities not available'
      });
    }

    // Test Cloudinary API
    const testResult = await cloudinaryUtils.cloudinary.api.ping();
    console.log('🔧 Cloudinary ping result:', testResult);
    
    res.json({
      message: 'Cloudinary test successful',
      result: testResult,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        isProduction: isProduction,
        useCloudStorage: useCloudStorage,
        cloudinaryConfigured: !!cloudinaryUtils
      }
    });
  } catch (error) {
    console.error('❌ Cloudinary test failed:', error);
    res.status(500).json({
      error: 'Cloudinary test failed',
      details: error.message
    });
  }
});

// @route   POST /api/products/upload-image
// @desc    Upload product image (cloud storage in production, local in development)
// @access  Private (Admin only)
router.post('/upload-image', auth, adminAuth, upload.single('image'), async (req, res) => {
  try {
    console.log('🔧 Upload endpoint - Environment check:');
    console.log('  NODE_ENV:', process.env.NODE_ENV);
    console.log('  isProduction:', isProduction);
    console.log('  useCloudStorage:', useCloudStorage);
    console.log('  cloudinaryUtils available:', !!cloudinaryUtils);

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        details: 'Please select an image file'
      });
    }

    console.log('🔧 Upload file received:', {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    let imageUrl, filename, storageType;

    if (useCloudStorage) {
      // Cloud storage (production)
      imageUrl = req.file.path; // Cloudinary provides the full URL
      filename = req.file.filename; // Cloudinary public_id
      storageType = 'cloudinary';
      
      console.log('🔧 Products: Using cloud storage:', imageUrl);
    } else {
      // Local storage (temporary solution for Railway)
      // Use Railway domain for image URLs
      // Use optimized image endpoint for better performance
      const baseUrl = 'https://virello-backend-production.up.railway.app';
      console.log('🔧 Base URL being used:', baseUrl);
      console.log('🔧 Filename:', req.file.filename);
      imageUrl = `${baseUrl}/api/products/optimized-image/${req.file.filename}`;
      console.log('🔧 Final optimized image URL:', imageUrl);
      filename = req.file.filename;
      storageType = 'local-railway';
      
      console.log('🔧 Products: Using local storage with Railway URL:', imageUrl);
    }
    
    res.status(200).json({
      message: `Image uploaded to ${storageType} storage successfully`,
      imageUrl: imageUrl,
      filename: filename,
      storage: storageType
    });
  } catch (error) {
    console.error('❌ Image upload error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Clean up local file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      error: 'Upload failed',
      details: error.message
    });
  }
});

module.exports = router;
