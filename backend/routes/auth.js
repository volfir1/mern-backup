// routes/auth.js
import express from 'express';
import {
    register,
    login,
    logout,
    getUserProfile,
    checkAuth,
    updateProfile
} from '../controllers/auth.js';
import { protect, authorize, securityHeaders, refreshAccessToken } from '../middleware/auth.js'; // Updated import
import { 
    registerValidation, 
    loginValidation,
    updateUserValidation,
    handleValidation 
} from '../middleware/validation.js';
import { 
    createUploadMiddleware,
    HandleMulterError 
} from '../middleware/multer.js';
import { verificationControllers } from '../utils/emailVerification.js';
import { authLimiter, apiLimiter, createEndpointLimiter } from '../utils/rateLimiter.js';

const router = express.Router();

// Apply security headers to all routes
router.use(securityHeaders);

// Public routes with rate limiting
router.post('/register', 
    authLimiter,  // Strict rate limiting for registration
    createUploadMiddleware.profile(),
    registerValidation,
    handleValidation,
    register
);

router.post('/login', 
    authLimiter,  // Strict rate limiting for login
    loginValidation, 
    handleValidation, 
    login
);

router.post('/logout', apiLimiter, logout);

// Email verification routes with rate limiting
router.get('/verify-email', 
    apiLimiter,
    verificationControllers.verifyEmail
);

router.post('/resend-verification', 
    createEndpointLimiter(5, 60), // 5 requests per hour
    verificationControllers.resendVerification
);

router.post('/google', 
    authLimiter,
    verificationControllers.googleAuth
);

// Protected routes - apply general API rate limiting
router.use(protect);
router.use(apiLimiter);

// Profile routes
const profileLimiter = createEndpointLimiter(20, 15); // 20 requests per 15 minutes

router.get('/profile', 
    profileLimiter,
    getUserProfile
);

router.put('/profile', 
    profileLimiter,
    createUploadMiddleware.profile(),
    updateUserValidation,
    handleValidation,
    updateProfile
);

// Auth check routes
router.get('/check', 
    createEndpointLimiter(30, 15), // 30 requests per 15 minutes
    checkAuth
);

// Admin routes with stricter rate limiting
const adminLimiter = createEndpointLimiter(50, 60); // 50 requests per hour

router.get('/admin', 
    adminLimiter,
    authorize('admin'), 
    (req, res) => {
        res.status(200).json({
            success: true,
            message: 'Admin access granted',
            timestamp: new Date().toISOString()
        });
    }
);

// Debug routes (only available in development)
if (process.env.NODE_ENV === 'development') {
    router.get('/test-auth', 
        protect, 
        authorize('admin'), 
        (req, res) => {
            res.json({
                success: true,
                message: 'You have admin access',
                user: {
                    id: req.user._id,
                    name: req.user.name,
                    email: req.user.email,
                    role: req.user.role
                },
                decoded: req.decoded,
                timestamp: new Date().toISOString()
            });
        }
    );

    router.get('/debug-token', 
        protect, 
        (req, res) => {
            res.json({
                success: true,
                user: req.user,
                decoded: req.decoded,
                token: req.headers.authorization?.split(' ')[1],
                timestamp: new Date().toISOString()
            });
        }
    );
}

// Error handling middleware
router.use(HandleMulterError);

// 404 handler for auth routes
router.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found in auth routes`
    });
});

// Error handler
router.use((err, req, res, next) => {
    console.error('Auth route error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

export default router;