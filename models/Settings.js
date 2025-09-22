const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  // Shipping Settings
  minimumOrderAmount: {
    type: Number,
    required: true,
    default: 10000
  },
  shippingCharge: {
    type: Number,
    required: true,
    default: 300
  },
  freeShippingCurrency: {
    type: String,
    required: true,
    default: 'PKR'
  },
  freeShippingEnabled: {
    type: Boolean,
    required: true,
    default: true
  },

  // Discount Settings
  discountSettings: {
    enabled: {
      type: Boolean,
      required: true,
      default: true
    },
    defaultDiscountPercentage: {
      type: Number,
      required: true,
      default: 20
    },
    minimumDiscountAmount: {
      type: Number,
      required: true,
      default: 100
    },
    maximumDiscountAmount: {
      type: Number,
      required: true,
      default: 5000
    },
    discountCurrency: {
      type: String,
      required: true,
      default: 'PKR'
    },
    showOriginalPrice: {
      type: Boolean,
      required: true,
      default: true
    },
    showDiscountBadge: {
      type: Boolean,
      required: true,
      default: true
    },
    discountBadgeText: {
      type: String,
      required: true,
      default: 'SAVE'
    }
  },

  // Shipping Zones
  shippingZones: [{
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    countries: [{
      type: String,
      required: true
    }],
    shippingCharge: {
      type: Number,
      required: true
    },
    freeShippingThreshold: {
      type: Number,
      required: false
    }
  }],

  // Metadata
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
SettingsSchema.index({}, { unique: true });

module.exports = mongoose.model('Settings', SettingsSchema);
