// routes/user.js
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    updateUserRole,
    getUserStats,
    updateUserPassword,
    toggleUserStatus
} from '../controllers/user.js';
import {
    updateUserValidation,
    updateRoleValidation,
    changePasswordValidation
} from '../middleware/validation.js';
import { createUploadMiddleware, HandleMulterError } from '../middleware/multer.js';

const router = express.Router();

// Protect all routes & restrict to admin
// router.use(protect);
// router.use(authorize('admin'));

// User statistics route
router.get('/stats', getUserStats);

// Basic CRUD routes
router.route('/')
    .get(getAllUsers);

// Update user routes with proper file handling
router.route('/:id')
    .get(getUserById)
    .put(
        createUploadMiddleware.profile(), // Use profile upload middleware
        updateUserValidation,
        updateUser
    )
    .delete(deleteUser);

// Special operations routes
router.put('/:id/role', updateRoleValidation, updateUserRole);
router.put('/:id/password', changePasswordValidation, updateUserPassword);
router.patch('/:id/toggle-status', toggleUserStatus);

// Error handling
router.use(HandleMulterError);

// Error handling for undefined routes
router.all('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});

export default router;