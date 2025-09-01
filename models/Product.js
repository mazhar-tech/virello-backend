const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  packaging: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  currency: {
    type: String,
    default: 'USD',
    maxlength: 3
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'out_of_stock', 'discontinued'],
    default: 'active'
  },
  minOrder: {
    type: Number,
    min: 1,
    default: 1
  },
  imageUrl: {
    type: String,
    trim: true
  },
  images: {
    main: String,
    gallery: [String]
  },
  specifications: {
    moistureContent: String,
    ashContent: String,
    proteinContent: String,
    shelfLife: String,
    storageConditions: String,
    packagingSize: String,
    weight: String,
    dimensions: String
  },
  benefits: [String],
  applications: [String],
  certifications: [String],
  tags: [String],
  sku: {
    type: String,
    unique: true,
    sparse: true
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true
  },
  supplier: {
    name: String,
    contact: String,
    country: String
  },
  shipping: {
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    shippingClass: String
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    slug: {
      type: String,
      unique: true,
      sparse: true
    }
  },
  analytics: {
    views: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text', category: 'text' });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ status: 1 });

// Virtual for main image URL
productSchema.virtual('mainImageUrl').get(function() {
  return this.imageUrl || this.images.main || this.images.gallery?.[0] || null;
});

// Virtual for availability
productSchema.virtual('isAvailable').get(function() {
  return this.status === 'active' && this.stock > 0;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock <= 10) return 'low_stock';
  return 'in_stock';
});

// Method to update stock
productSchema.methods.updateStock = function(quantity, operation = 'decrease') {
  if (operation === 'decrease') {
    if (this.stock < quantity) {
      throw new Error('Insufficient stock');
    }
    this.stock -= quantity;
  } else if (operation === 'increase') {
    this.stock += quantity;
  }
  
  // Update status based on stock
  if (this.stock === 0) {
    this.status = 'out_of_stock';
  } else if (this.status === 'out_of_stock') {
    this.status = 'active';
  }
  
  return this.save();
};

// Method to increment views
productSchema.methods.incrementViews = function() {
  this.analytics.views += 1;
  return this.save();
};

// Static method to get products by category
productSchema.statics.getByCategory = function(category, limit = 20) {
  return this.find({ 
    category, 
    status: 'active' 
  })
  .limit(limit)
  .sort({ 'analytics.views': -1 });
};

// Static method to search products
productSchema.statics.search = function(query, options = {}) {
  const { category, minPrice, maxPrice, inStock, limit = 20, page = 1 } = options;
  
  let filter = { status: 'active' };
  
  if (query) {
    filter.$text = { $search: query };
  }
  
  if (category) {
    filter.category = category;
  }
  
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }
  
  if (inStock) {
    filter.stock = { $gt: 0 };
  }
  
  return this.find(filter)
    .limit(limit)
    .skip((page - 1) * limit)
    .sort({ 'analytics.views': -1 });
};

module.exports = mongoose.model('Product', productSchema);


