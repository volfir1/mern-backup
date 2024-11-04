// middleware/validation.js
import { check, validationResult } from 'express-validator';

// Export the validation handler so it can be used in the validation arrays
export const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// Registration validation rules
const registerRules = [
    check('name')
        .exists().withMessage('Name is required')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    
    check('email')
        .exists().withMessage('Email is required')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    
    check('password')
        .exists().withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/\d/)
        .withMessage('Password must contain at least one number')
        .matches(/[a-zA-Z]/)
        .withMessage('Password must contain at least one letter')
];

// Login validation rules
const loginRules = [
    check('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    check('password')
        .exists()
        .withMessage('Password is required')
        .notEmpty()
        .withMessage('Password cannot be empty')
];

// Update user validation rules
const updateUserRules = [
    check('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    check('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    check('password')
        .optional()
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/\d/)
        .withMessage('Password must contain at least one number')
        .matches(/[a-zA-Z]/)
        .withMessage('Password must contain at least one letter'),
    check('role')
        .optional()
        .isIn(['user', 'admin'])
        .withMessage('Invalid role specified'),
    check('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean value')
];

// Role validation rules
const roleRules = [
    check('role')
        .exists()
        .withMessage('Role is required')
        .isIn(['user', 'admin'])
        .withMessage('Invalid role specified')
];

// Password change validation rules
const passwordChangeRules = [
    check('currentPassword')
        .exists()
        .withMessage('Current password is required'),
    check('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
        .matches(/\d/)
        .withMessage('New password must contain at least one number')
        .matches(/[a-zA-Z]/)
        .withMessage('New password must contain at least one letter')
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error('New password must be different from current password');
            }
            return true;
        }),
    check('confirmPassword')
        .exists()
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Password confirmation does not match new password');
            }
            return true;
        })
];

// Export validation middlewares (combining rules with the handler)
export const registerValidation = [...registerRules, handleValidation];
export const loginValidation = [...loginRules, handleValidation];
export const updateUserValidation = [...updateUserRules, handleValidation];
export const updateRoleValidation = [...roleRules, handleValidation];
export const changePasswordValidation = [...passwordChangeRules, handleValidation];