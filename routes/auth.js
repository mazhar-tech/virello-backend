const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../lib/emailService');
const { generateOTP, sendOTP } = require('../lib/otpService');
const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'fallback-secret-key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('displayName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),
  body('firstName')
    .optional()
    .trim(),
  body('lastName')
    .optional()
    .trim(),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone number must be between 10 and 20 characters')
], async (req, res) => {
  try {
    console.log('📥 Registration request received:', JSON.stringify(req.body, null, 2));
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Registration validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your input data',
        details: errors.array()
      });
    }

    const {
      email,
      password,
      displayName,
      firstName,
      lastName,
      phone,
      address,
      city,
      state,
      zipCode,
      country
    } = req.body;

    console.log('✅ Validation passed, processing registration...');

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.error('❌ User already exists:', email);
      return res.status(400).json({
        error: 'User already exists',
        message: `An account with email "${email}" already exists. Please use a different email or try logging in.`,
        details: 'Email address is already registered'
      });
    }

    console.log('✅ User does not exist, creating new user...');

    // Check if this is an admin user registration
    const isAdminUser = req.body.isAdmin === true || 
                       (req.body.email === process.env.ADMIN_EMAIL && 
                        req.body.password === process.env.ADMIN_PASSWORD) ||
                       // First user is automatically admin
                       (await User.countDocuments() === 0);

    // Create new user
    const user = new User({
      email,
      password,
      displayName,
      profile: {
        firstName,
        lastName,
        phone,
        address: {
          street: address,
          city,
          state,
          zipCode,
          country
        }
      },
      role: isAdminUser ? 'admin' : 'user',
      isAdmin: isAdminUser
    });

    if (isAdminUser) {
      console.log('👑 Creating admin user:', email);
    }

    // Generate verification code
    const verificationCode = generateOTP();
    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    console.log('✅ User saved to database, sending OTP...');

    // Send OTP via preferred method (asynchronously to prevent timeout)
    const otpMethod = process.env.OTP_METHOD || 'email'; // console, email
    const originalEmail = req.body.email;
    
    console.log('📧 Email comparison:');
    console.log('📧 Original email (for sending):', originalEmail);
    console.log('📧 Normalized email (in DB):', user.email);
    
    // Send email asynchronously to prevent timeout
    const sendEmailAsync = async () => {
      try {
        let otpResult;
        if (otpMethod === 'email') {
          // Send email OTP to original email (before normalization)
          otpResult = await sendOTP(originalEmail, verificationCode, 'email');
        } else {
          // Send console OTP (for development)
          otpResult = await sendOTP(user.phone, verificationCode, 'console');
        }
        
        if (!otpResult.success) {
          console.error('❌ Failed to send OTP:', otpResult.error);
        } else {
          console.log(`✅ OTP sent successfully via ${otpResult.method} to:`, otpMethod === 'email' ? user.email : user.phone);
        }
      } catch (error) {
        console.error('❌ Async email sending error:', error);
      }
    };

    // Start email sending in background (don't await)
    sendEmailAsync();

    console.log('✅ Registration completed successfully (email sending in background)');

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.',
      data: {
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          isAdmin: user.isAdmin,
          profile: user.profile,
          isEmailVerified: user.isEmailVerified
        }
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to register user',
      details: error.message
    });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify user email with OTP
// @access  Public
router.post('/verify-email', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
], async (req, res) => {
  try {
    console.log('📥 Email verification request received:', JSON.stringify(req.body, null, 2));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { email, otp } = req.body;
    
    console.log('🔍 Looking for user with email:', email);
    console.log('🔢 OTP provided:', otp);
    
    // Find user by normalized email (since that's how it's stored in DB)
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found with email:', email);
      return res.status(404).json({
        error: 'User not found',
        details: 'User does not exist'
      });
    }
    
    console.log('✅ User found:', user.email);
    console.log('📧 User verification code:', user.emailVerificationCode);
    console.log('⏰ Code expires:', user.emailVerificationExpires);

    if (user.isEmailVerified) {
      return res.status(400).json({
        error: 'Already verified',
        details: 'Email is already verified'
      });
    }

    if (!user.emailVerificationCode || !user.emailVerificationExpires) {
      return res.status(400).json({
        error: 'No verification code',
        details: 'No verification code found. Please request a new one.'
      });
    }

    if (new Date() > user.emailVerificationExpires) {
      return res.status(400).json({
        error: 'Code expired',
        details: 'Verification code has expired. Please request a new one.'
      });
    }

    if (user.emailVerificationCode !== otp) {
      return res.status(400).json({
        error: 'Invalid code',
        details: 'Invalid verification code'
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          isAdmin: user.isAdmin,
          profile: user.profile,
          isEmailVerified: user.isEmailVerified
        },
        token
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to verify email'
    });
  }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend email verification code
// @access  Public
router.post('/resend-verification', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        details: 'User does not exist'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        error: 'Already verified',
        details: 'Email is already verified'
      });
    }

    // Generate new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Send OTP via preferred method (asynchronously to prevent timeout)
    const otpMethod = process.env.OTP_METHOD || 'email';
    const originalEmail = req.body.email;
    
    console.log('📧 Email comparison (resend):');
    console.log('📧 Original email (for sending):', originalEmail);
    console.log('📧 Normalized email (in DB):', user.email);
    
    // Send email asynchronously to prevent timeout
    const sendEmailAsync = async () => {
      try {
        let otpResult;
        if (otpMethod === 'email') {
          // Send email OTP to original email (before normalization)
          otpResult = await sendOTP(originalEmail, verificationCode, 'email');
        } else {
          // Send console OTP (for development)
          otpResult = await sendOTP(user.phone, verificationCode, 'console');
        }
        
        if (!otpResult.success) {
          console.error('❌ Failed to send OTP:', otpResult.error);
        } else {
          console.log(`✅ New OTP sent successfully via ${otpResult.method} to:`, otpMethod === 'email' ? user.email : user.phone);
        }
      } catch (error) {
        console.error('❌ Async email sending error:', error);
      }
    };

    // Start email sending in background (don't await)
    sendEmailAsync();

    res.json({
      success: true,
      message: 'Verification code sent successfully'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to send verification code'
    });
  }
});

// @route   GET /api/auth/test-email-config
// @desc    Test email configuration and send test email
// @access  Private (Admin only)
router.get('/test-email-config', auth, adminAuth, async (req, res) => {
  try {
    console.log('🔧 Testing email configuration...');
    
    // Check environment variables
    const emailConfig = {
      EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'not set',
      EMAIL_USER: process.env.EMAIL_USER ? 'set' : 'not set',
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? 'set' : 'not set',
      EMAIL_FROM: process.env.EMAIL_FROM || 'not set',
      OTP_METHOD: process.env.OTP_METHOD || 'not set',
      NODE_ENV: process.env.NODE_ENV || 'not set',
      FRONTEND_URL: process.env.FRONTEND_URL || 'not set'
    };
    
    console.log('📧 Email configuration:', emailConfig);
    
    // Test sending a simple email
    const { sendVerificationEmail } = require('../lib/emailService');
    const testEmail = req.user.email; // Send to admin's email
    const testOTP = '123456';
    
    console.log('📤 Sending test email to:', testEmail);
    const result = await sendVerificationEmail(testEmail, testOTP);
    
    res.json({
      success: true,
      message: 'Email configuration test completed',
      emailConfig,
      testResult: result
    });
    
  } catch (error) {
    console.error('❌ Email configuration test error:', error);
    res.status(500).json({
      success: false,
      error: 'Email configuration test failed',
      details: error.message
    });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
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

    const { email, password } = req.body;



    // Try database connection if available
    try {
      // Check if user exists
      const user = await User.findOne({ email, isActive: true });
      if (!user) {
        return res.status(401).json({
          error: 'Authentication failed',
          details: 'Invalid credentials'
        });
      }

      // Check if email is verified (skip for admin users)
      if (!user.isEmailVerified && !user.isAdmin && user.role !== 'admin') {
        return res.status(401).json({
          error: 'Email not verified',
          details: 'Please verify your email before logging in'
        });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          error: 'Authentication failed',
          details: 'Invalid credentials'
        });
      }

      // Generate token
      const token = generateToken(user._id);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user._id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            isAdmin: user.isAdmin,
            profile: user.profile,
            preferences: user.preferences
          },
          token
        }
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({
        error: 'Database Error',
        details: 'Database connection failed. Please try again later.'
      });
    }

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to authenticate user'
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', auth, async (req, res) => {
  try {
    // Get current user
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        details: 'User does not exist'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Access denied',
        details: 'User account is deactivated'
      });
    }

    // Generate new token
    const token = generateToken(user._id);

    res.json({
      message: 'Token refreshed successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          isAdmin: user.isAdmin,
          profile: user.profile,
          preferences: user.preferences
        },
        token
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to refresh token'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {


    // For real users, query the database
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        details: 'User does not exist'
      });
    }

    res.json({
      data: {
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          isAdmin: user.isAdmin,
          profile: user.profile,
          preferences: user.preferences,
          lastLogin: user.lastLogin,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to get user profile'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
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
    .withMessage('Phone number must be between 10 and 20 characters')
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

    const {
      displayName,
      firstName,
      lastName,
      phone,
      address,
      city,
      state,
      zipCode,
      country
    } = req.body;

    const updateData = {};
    
    if (displayName) updateData.displayName = displayName;
    if (firstName || lastName || phone || address || city || state || zipCode || country) {
      updateData.profile = {};
      if (firstName) updateData.profile.firstName = firstName;
      if (lastName) updateData.profile.lastName = lastName;
      if (phone) updateData.profile.phone = phone;
      if (address || city || state || zipCode || country) {
        updateData.profile.address = {};
        if (address) updateData.profile.address.street = address;
        if (city) updateData.profile.address.city = city;
        if (state) updateData.profile.address.state = state;
        if (zipCode) updateData.profile.address.zipCode = zipCode;
        if (country) updateData.profile.address.country = country;
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
      data: {
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          isAdmin: user.isAdmin,
          profile: user.profile,
          preferences: user.preferences
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to update profile'
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', [
  auth,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
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

    const { currentPassword, newPassword } = req.body;



    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        details: 'User does not exist'
      });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        error: 'Invalid password',
        details: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to change password'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset OTP
// @access  Public
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    console.log('📥 Forgot password request received:', JSON.stringify(req.body, null, 2));
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Forgot password validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your input data',
        details: errors.array()
      });
    }

    const { email } = req.body;

    console.log('🔍 Looking for user with email:', email);

    // Find user by normalized email
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      console.log('❌ User not found with email:', email);
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset OTP has been sent'
      });
    }

    console.log('✅ User found:', user.email);

    // Generate OTP for password reset
    const resetOTP = generateOTP();
    user.passwordResetOTP = resetOTP;
    user.passwordResetOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    console.log('✅ Reset OTP generated and saved to database');

    // Send OTP via preferred method (asynchronously to prevent timeout)
    const otpMethod = process.env.OTP_METHOD || 'email';
    const originalEmail = req.body.email;
    
    console.log('📧 Email comparison (forgot password):');
    console.log('📧 Original email (for sending):', originalEmail);
    console.log('📧 Normalized email (in DB):', user.email);
    
    // Send email asynchronously to prevent timeout
    const sendEmailAsync = async () => {
      try {
        let otpResult;
        if (otpMethod === 'email') {
          // Send email OTP to original email (before normalization)
          otpResult = await sendOTP(originalEmail, resetOTP, 'email');
        } else {
          // Send console OTP (for development)
          otpResult = await sendOTP(user.phone, resetOTP, 'console');
        }
        
        if (!otpResult.success) {
          console.error('❌ Failed to send reset OTP:', otpResult.error);
        } else {
          console.log(`✅ Reset OTP sent successfully via ${otpResult.method} to:`, otpMethod === 'email' ? user.email : user.phone);
        }
      } catch (error) {
        console.error('❌ Async email sending error:', error);
      }
    };

    // Start email sending in background (don't await)
    sendEmailAsync();

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset OTP has been sent'
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to process password reset request',
      details: error.message
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with OTP
// @access  Public
router.post('/reset-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
], async (req, res) => {
  try {
    console.log('📥 Reset password request received:', JSON.stringify(req.body, null, 2));
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Reset password validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your input data',
        details: errors.array()
      });
    }

    const { email, otp, newPassword } = req.body;

    console.log('🔍 Looking for user with email:', email);
    console.log('🔢 OTP provided:', otp);

    // Find user by normalized email
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      console.log('❌ User not found with email:', email);
      return res.status(404).json({
        error: 'User not found',
        details: 'User does not exist'
      });
    }

    console.log('✅ User found:', user.email);
    console.log('📧 User reset OTP:', user.passwordResetOTP);
    console.log('⏰ OTP expires:', user.passwordResetOTPExpires);

    if (!user.passwordResetOTP || !user.passwordResetOTPExpires) {
      return res.status(400).json({
        error: 'No reset OTP',
        details: 'No password reset OTP found. Please request a new one.'
      });
    }

    if (new Date() > user.passwordResetOTPExpires) {
      return res.status(400).json({
        error: 'OTP expired',
        details: 'Password reset OTP has expired. Please request a new one.'
      });
    }

    if (user.passwordResetOTP !== otp) {
      return res.status(400).json({
        error: 'Invalid OTP',
        details: 'Invalid password reset OTP'
      });
    }

    // Update password and clear reset OTP
    user.password = newPassword;
    user.passwordResetOTP = null;
    user.passwordResetOTPExpires = null;
    await user.save();

    console.log('✅ Password reset successfully for user:', user.email);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to reset password',
      details: error.message
    });
  }
});

// @route   POST /api/auth/resend-reset-otp
// @desc    Resend password reset OTP
// @access  Public
router.post('/resend-reset-otp', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    console.log('📥 Resend reset OTP request received:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Resend reset OTP validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your input data',
        details: errors.array()
      });
    }

    const { email } = req.body;

    console.log('🔍 Looking for user with email:', email);

    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      console.log('❌ User not found with email:', email);
      return res.status(404).json({
        error: 'User not found',
        details: 'User does not exist'
      });
    }

    console.log('✅ User found:', user.email);

    // Generate new reset OTP
    const resetOTP = generateOTP();
    user.passwordResetOTP = resetOTP;
    user.passwordResetOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    console.log('✅ New reset OTP generated and saved to database');

    // Send OTP via preferred method (asynchronously to prevent timeout)
    const otpMethod = process.env.OTP_METHOD || 'email';
    const originalEmail = req.body.email;
    
    console.log('📧 Email comparison (resend reset OTP):');
    console.log('📧 Original email (for sending):', originalEmail);
    console.log('📧 Normalized email (in DB):', user.email);
    
    // Send email asynchronously to prevent timeout
    const sendEmailAsync = async () => {
      try {
        let otpResult;
        if (otpMethod === 'email') {
          // Send email OTP to original email (before normalization)
          otpResult = await sendOTP(originalEmail, resetOTP, 'email');
        } else {
          // Send console OTP (for development)
          otpResult = await sendOTP(user.phone, resetOTP, 'console');
        }
        
        if (!otpResult.success) {
          console.error('❌ Failed to send reset OTP:', otpResult.error);
        } else {
          console.log(`✅ Reset OTP resent successfully via ${otpResult.method} to:`, otpMethod === 'email' ? user.email : user.phone);
        }
      } catch (error) {
        console.error('❌ Async email sending error:', error);
      }
    };

    // Start email sending in background (don't await)
    sendEmailAsync();

    res.json({
      success: true,
      message: 'Password reset OTP sent successfully'
    });

  } catch (error) {
    console.error('❌ Resend reset OTP error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to send password reset OTP',
      details: error.message
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', auth, async (req, res) => {
  try {
    // Get current user
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        error: 'Access denied',
        details: 'User not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Access denied',
        details: 'User account is deactivated'
      });
    }

    // Generate new token
    const newToken = generateToken(user._id);

    res.json({
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          isAdmin: user.isAdmin,
          profile: user.profile,
          preferences: user.preferences
        }
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to refresh token'
    });
  }
});


// @route   POST /api/auth/change-password
// @desc    Change password (requires authentication)
// @access  Private
router.post('/change-password', auth, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    console.log('📥 Change password request received for user:', userId);

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    user.password = hashedNewPassword;
    await user.save();

    console.log('✅ Password changed successfully for user:', userId);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', auth, (req, res) => {
  res.json({
    message: 'Logout successful'
  });
});

module.exports = router;
