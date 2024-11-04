// middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import crypto from 'crypto';

// Generate tokens
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: userId, role, version: crypto.randomBytes(8).toString('hex') },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// Middleware to check for basic security headers
export const securityHeaders = (req, res, next) => {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
};

// Enhanced protect middleware
export const protect = async (req, res, next) => {
  try {
    let token = req.headers.authorization?.startsWith('Bearer')
      ? req.headers.authorization.split(' ')[1]
      : req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token not found'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.id)
        .select('name email role image isActive isEmailVerified lastLogin tokenVersion')
        .lean();

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Security checks
      if (!user.isActive || !user.isEmailVerified) {
        return res.status(403).json({
          success: false,
          message: !user.isActive ? 'Account is inactive' : 'Email not verified',
          requiresVerification: !user.isEmailVerified
        });
      }

      req.user = user;
      next();

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        // Try to refresh the token
        return refreshAccessToken(req, res, next);
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Refresh token middleware
export const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    const user = await User.findById(decoded.id);

    if (!user || user.tokenVersion !== decoded.version) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user._id, user.role);

    // Set cookies
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Continue with the refreshed token
    req.user = user;
    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// Role-based authorization with additional security checks
export const authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Additional security checks for sensitive roles
      if (roles.includes('admin')) {
        // Check last password change
        const user = await User.findById(req.user._id).select('+passwordChangedAt');
        
        if (user.passwordChangedAt) {
          const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
          
          if (req.decoded.iat < changedTimestamp) {
            return res.status(401).json({
              success: false,
              message: 'Recent password change detected. Please login again.'
            });
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};