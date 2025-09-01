const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and String for frontend orders
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    maxlength: 3
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  image: String,
  sku: String,
  specifications: mongoose.Schema.Types.Mixed
});

const customerInfoSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  zipCode: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  }
});

const shippingInfoSchema = new mongoose.Schema({
  method: {
    type: String,
    required: true,
    enum: ['standard', 'express', 'overnight', 'pickup']
  },
  cost: {
    type: Number,
    required: true,
    min: 0
  },
  estimatedDelivery: Date,
  trackingNumber: String,
  carrier: String,
  status: {
    type: String,
    enum: ['pending', 'shipped', 'delivered', 'returned'],
    default: 'pending'
  }
});

const paymentInfoSchema = new mongoose.Schema({
  method: {
    type: String,
    required: true,
    enum: ['stripe', 'paypal', 'bank_transfer', 'cash_on_delivery', 'cod', 'card', 'jazz_cash', 'easypesa']
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: String,
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    maxlength: 3
  },
  gatewayResponse: mongoose.Schema.Types.Mixed,
  refundedAmount: {
    type: Number,
    default: 0
  },
  refundReason: String
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerInfo: {
    type: customerInfoSchema,
    required: true
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  shipping: {
    type: shippingInfoSchema,
    required: true
  },
  payment: {
    type: paymentInfoSchema,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    maxlength: 3
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  notes: {
    customer: String,
    internal: String
  },
  tags: [String],
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  estimatedDelivery: Date,
  actualDelivery: Date,
  cancellationReason: String,
  returnReason: String,
  adminNotes: [{
    note: String,
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  notifications: {
    orderConfirmation: { sent: Boolean, sentAt: Date },
    shippingConfirmation: { sent: Boolean, sentAt: Date },
    deliveryConfirmation: { sent: Boolean, sentAt: Date }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
orderSchema.index({ customerId: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'customerInfo.email': 1 });
orderSchema.index({ 'customerInfo.phone': 1 });
orderSchema.index({ priority: 1 });

// Virtual for order summary
orderSchema.virtual('orderSummary').get(function() {
  return {
    orderNumber: this.orderNumber,
    totalItems: this.items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: this.totalAmount,
    currency: this.currency,
    status: this.orderStatus
  };
});

// Virtual for is urgent
orderSchema.virtual('isUrgent').get(function() {
  return this.priority === 'urgent' || this.priority === 'high';
});

// Method to update order status
orderSchema.methods.updateStatus = function(newStatus, adminId = null, note = null) {
  const oldStatus = this.orderStatus;
  this.orderStatus = newStatus;
  
  if (adminId && note) {
    this.adminNotes.push({
      note: `Status changed from ${oldStatus} to ${newStatus}: ${note}`,
      adminId,
      timestamp: new Date()
    });
  }
  
  // Update timestamps based on status
  if (newStatus === 'shipped') {
    this.shipping.status = 'shipped';
  } else if (newStatus === 'delivered') {
    this.shipping.status = 'delivered';
    this.actualDelivery = new Date();
  }
  
  return this.save();
};

// Method to add admin note
orderSchema.methods.addAdminNote = function(note, adminId) {
  this.adminNotes.push({
    note,
    adminId,
    timestamp: new Date()
  });
  return this.save();
};

// Static method to generate order number
orderSchema.statics.generateOrderNumber = function() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `VF${year}${month}${day}${random}`;
};

// Static method to get orders by status
orderSchema.statics.getByStatus = function(status, limit = 50, page = 1) {
  return this.find({ orderStatus: status })
    .populate('customerId', 'displayName email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
};

// Static method to get customer orders
orderSchema.statics.getCustomerOrders = function(customerId, limit = 20, page = 1) {
  return this.find({ customerId })
    .populate('items.productId', 'name images')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
};

// Pre-validate middleware to generate order number (runs before validation)
orderSchema.pre('validate', function(next) {
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = this.constructor.generateOrderNumber();
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);


