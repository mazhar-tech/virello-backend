const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {


    const user = await User.findOne({ 
      _id: req.user.userId, 
      isActive: true, 
      isEmailVerified: true 
    }).select('-password');
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        details: 'User does not exist or email not verified'
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to fetch profile'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update current user profile
// @access  Private
router.put('/profile', [
  auth,
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Display name must be between 2 and 100 characters'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone number must be between 10 and 20 characters'),
  body('address')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
  body('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  body('state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters'),
  body('zipCode')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Zip code must be between 3 and 20 characters'),
  body('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters')
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

    const updateData = {};
    
    if (req.body.displayName) updateData.displayName = req.body.displayName;
    if (req.body.firstName || req.body.lastName || req.body.phone || 
        req.body.address || req.body.city || req.body.state || 
        req.body.zipCode || req.body.country) {
      updateData.profile = {};
      if (req.body.firstName) updateData.profile.firstName = req.body.firstName;
      if (req.body.lastName) updateData.profile.lastName = req.body.lastName;
      if (req.body.phone) updateData.profile.phone = req.body.phone;
      if (req.body.address || req.body.city || req.body.state || 
          req.body.zipCode || req.body.country) {
        updateData.profile.address = {};
        if (req.body.address) updateData.profile.address.street = req.body.address;
        if (req.body.city) updateData.profile.address.city = req.body.city;
        if (req.body.state) updateData.profile.address.state = req.body.state;
        if (req.body.zipCode) updateData.profile.address.zipCode = req.body.zipCode;
        if (req.body.country) updateData.profile.address.country = req.body.country;
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        details: 'User does not exist'
      });
    }

    res.json({
      message: 'Profile updated successfully',
      user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to update profile'
    });
  }
});

// @route   PUT /api/users/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', [
  auth,
  body('language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language code must be between 2 and 5 characters'),
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be exactly 3 characters'),
  body('notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notifications must be a boolean'),
  body('notifications.sms')
    .optional()
    .isBoolean()
    .withMessage('SMS notifications must be a boolean'),
  body('notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Push notifications must be a boolean')
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

    const updateData = {};
    
    if (req.body.language) updateData['preferences.language'] = req.body.language;
    if (req.body.currency) updateData['preferences.currency'] = req.body.currency;
    
    if (req.body.notifications) {
      if (req.body.notifications.email !== undefined) {
        updateData['preferences.notifications.email'] = req.body.notifications.email;
      }
      if (req.body.notifications.sms !== undefined) {
        updateData['preferences.notifications.sms'] = req.body.notifications.sms;
      }
      if (req.body.notifications.push !== undefined) {
        updateData['preferences.notifications.push'] = req.body.notifications.push;
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        details: 'User does not exist'
      });
    }

    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to update preferences'
    });
  }
});

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', [
  auth,
  body('password')
    .notEmpty()
    .withMessage('Password is required to confirm account deletion')
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

    const { password } = req.body;
    

    
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        details: 'User does not exist'
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        error: 'Invalid password',
        details: 'Password is incorrect'
      });
    }

    // Deactivate user instead of deleting
    user.isActive = false;
    await user.save();

    res.json({
      message: 'Account deactivated successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to deactivate account'
    });
  }
});

// @route   GET /api/users
// @desc    Get all users (for dashboard)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      data: users,
      total: users.length
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to fetch users'
    });
  }
});

// @route   GET /api/users/admin/all
// @desc    Get all users (Admin only)
// @access  Private (Admin only)
router.get('/admin/all', [
  auth,
  adminAuth,
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('role')
    .optional()
    .isIn(['user', 'admin', 'moderator'])
    .withMessage('Invalid role value'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('Is active must be a boolean'),
  query('search')
    .optional()
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

    const { page = 1, limit = 50, role, isActive, search } = req.query;

    let filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      User.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      users,
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
    console.error('Get admin users error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to fetch users'
    });
  }
});

// @route   GET /api/users/admin/:id
// @desc    Get user by ID (Admin only)
// @access  Private (Admin only)
router.get('/admin/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        details: 'User does not exist'
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get admin user error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        error: 'Invalid ID',
        details: 'User ID format is invalid'
      });
    }
    
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to fetch user'
    });
  }
});

// @route   PUT /api/users/admin/:id
// @desc    Update user by ID (Admin only)
// @access  Private (Admin only)
router.put('/admin/:id', [
  auth,
  adminAuth,
  body('role')
    .optional()
    .isIn(['user', 'admin', 'moderator'])
    .withMessage('Invalid role value'),
  body('isAdmin')
    .optional()
    .isBoolean()
    .withMessage('Is admin must be a boolean'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Is active must be a boolean')
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

    const updateData = {};
    if (req.body.role !== undefined) updateData.role = req.body.role;
    if (req.body.isAdmin !== undefined) updateData.isAdmin = req.body.isAdmin;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        details: 'User does not exist'
      });
    }

    res.json({
      message: 'User updated successfully',
      user
    });

  } catch (error) {
    console.error('Update admin user error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        error: 'Invalid ID',
        details: 'User ID format is invalid'
      });
    }
    
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to update user'
    });
  }
});

// @route   DELETE /api/users/admin/:id
// @desc    Delete user by ID (Admin only)
// @access  Private (Admin only)
router.delete('/admin/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        details: 'User does not exist'
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.userId) {
      return res.status(400).json({
        error: 'Cannot delete yourself',
        details: 'You cannot delete your own account'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete admin user error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        error: 'Invalid ID',
        details: 'User ID format is invalid'
      });
    }
    
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to delete user'
    });
  }
});

// @route   GET /api/users/admin/download
// @desc    Download users as CSV or Excel (Admin only)
// @access  Private (Admin only)
router.get('/admin/download', auth, adminAuth, async (req, res) => {
  try {
    const { format = 'csv', role, isActive, search } = req.query;

    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    // Get all users for download
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'User ID',
        'Email',
        'Display Name',
        'First Name',
        'Last Name',
        'Phone',
        'Address',
        'City',
        'State',
        'Country',
        'Role',
        'Is Admin',
        'Is Active',
        'Email Verified',
        'Created At',
        'Updated At'
      ];

      const csvRows = users.map(user => [
        user._id,
        user.email,
        user.displayName,
        user.profile?.firstName || '',
        user.profile?.lastName || '',
        user.profile?.phone || '',
        user.profile?.address || '',
        user.profile?.city || '',
        user.profile?.state || '',
        user.profile?.country || '',
        user.role,
        user.isAdmin ? 'Yes' : 'No',
        user.isActive ? 'Yes' : 'No',
        user.isEmailVerified ? 'Yes' : 'No',
        new Date(user.createdAt).toLocaleString(),
        new Date(user.updatedAt).toLocaleString()
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="users_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else if (format === 'excel') {
      // For Excel, we'll return JSON and let the frontend handle Excel generation
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="users_${new Date().toISOString().split('T')[0]}.json"`);
      res.json({ users });
    } else {
      res.status(400).json({
        error: 'Invalid format',
        details: 'Format must be csv or excel'
      });
    }
  } catch (error) {
    console.error('Download users error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to download users'
    });
  }
});

module.exports = router;
