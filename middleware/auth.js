const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        details: 'No token provided'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    } catch (jwtError) {
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Access denied',
          details: 'Invalid token'
        });
      }
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Access denied',
          details: 'Token expired'
        });
      }
      
      throw jwtError;
    }
    
    // Check if user still exists in database
    const user = await User.findById(decoded.userId).select('-password');
    
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

    // Add user info to request
    req.user = decoded;
    req.userInfo = user;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Authentication failed'
    });
  }
};

// Optional auth middleware - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
      

      
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = decoded;
        req.userInfo = user;
      }
    }
    
    next();
  } catch (error) {
    // Silently continue if token is invalid
    next();
  }
};

// Admin auth middleware
const adminAuth = async (req, res, next) => {
  try {
    // First check if user is authenticated
    if (!req.user || !req.userInfo) {
      return res.status(401).json({
        error: 'Access denied',
        details: 'Authentication required'
      });
    }

    // Check if user is admin - temporarily bypass email verification for admin users
    if (!req.userInfo.isAdmin && req.userInfo.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        details: 'Admin privileges required'
      });
    }

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Authorization failed'
    });
  }
};

// Role-based auth middleware
const roleAuth = (...roles) => {
  return async (req, res, next) => {
    try {
      // First check if user is authenticated
      if (!req.user || !req.userInfo) {
        return res.status(401).json({
          error: 'Access denied',
          details: 'Authentication required'
        });
      }

      // Check if user has required role
      if (!roles.includes(req.userInfo.role) && !req.userInfo.isAdmin) {
        return res.status(403).json({
          error: 'Access denied',
          details: `Required roles: ${roles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Role auth middleware error:', error);
      res.status(500).json({
        error: 'Server Error',
        details: 'Authorization failed'
      });
    }
  };
};

module.exports = { auth, optionalAuth, adminAuth, roleAuth };
