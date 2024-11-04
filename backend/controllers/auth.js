// controllers/auth.js
import User from '../models/user.js';
import {generateToken} from '../utils/jwtToken.js';
import { validationResult} from 'express-validator';
import bcrypt from 'bcryptjs'; 
import { 
  uploadImage, 
  CLOUDINARY_FOLDERS, 
  DEFAULT_IMAGES 
} from '../utils/cloudinary.js';



export const register = async (req, res) => {
  try {
    // Debug logs
    console.log('Headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body:', req.body);
    console.log('Files:', req.file);
    
    const { name, email, password } = req.body;
    
    // Validate fields
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
        receivedFields: {
          name: !!name?.trim(),
          email: !!email?.trim(),
          password: !!password?.trim()
        }
      });
    }

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }

    let userData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      image: {
        public_id: 'default',
        url: DEFAULT_IMAGES.USER
      }
    };

    let cloudinaryDetails = null;

    // Handle image upload if provided
    if (req.file) {
      try {
        console.log('Starting Cloudinary upload...');
        const cloudinaryResult = await uploadImage(req.file.buffer, {
          folder: CLOUDINARY_FOLDERS.USERS,
          public_id: `user-${Date.now()}`,
          transformation: [
            { width: 300, height: 300, crop: 'fill' },
            { quality: 'auto' }
          ]
        });

        console.log('Cloudinary upload result:', cloudinaryResult);

        userData.image = {
          public_id: cloudinaryResult.public_id,
          url: cloudinaryResult.secure_url
        };

        cloudinaryDetails = {
          url: cloudinaryResult.secure_url,
          public_id: cloudinaryResult.public_id,
          format: cloudinaryResult.format,
          resource_type: cloudinaryResult.resource_type,
          created_at: cloudinaryResult.created_at,
          folder: CLOUDINARY_FOLDERS.USERS,
          width: cloudinaryResult.width,
          height: cloudinaryResult.height,
          bytes: cloudinaryResult.bytes,
          type: cloudinaryResult.type,
          placeholder: cloudinaryResult.placeholder || false,
          original_filename: req.file.originalname,
          transformation: cloudinaryResult.eager || cloudinaryResult.transformation || [],
          secure_url: cloudinaryResult.secure_url,
          asset_id: cloudinaryResult.asset_id,
          version: cloudinaryResult.version
        };
      } catch (cloudinaryError) {
        console.error('Cloudinary upload error:', cloudinaryError);
        // Continue with default image if upload fails
      }
    }

    // Create user
    console.log('Creating user with data:', userData);
    const user = await User.create(userData);

    // Generate token
    const token = generateToken(user);

    // Send response
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasImage: user.image.public_id !== 'default',
        image: {
          url: user.image.url,
          public_id: user.image.public_id
        }
      },
      cloudinaryDetails: cloudinaryDetails // Include Cloudinary details if image was uploaded
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};



export const login = async (req, res) => {
  try {
      const { email, password } = req.body;
      
      if (!email || !password) {
          return res.status(400).json({
              success: false,
              message: 'Please provide email and password'
          });
      }

      // Find user with only necessary fields + password
      const user = await User.findOne({ email })
          .select('name email password role image');  // Don't use lean() here as we need the mongoose document methods

      console.log('User found:', { exists: !!user, email });

      if (!user) {
          return res.status(401).json({
              success: false,
              message: 'Invalid credentials'
          });
      }

      // Use the matchPassword method from your User model
      const isMatch = await user.matchPassword(password);
      console.log('Password validation:', { isValid: isMatch });

      if (!isMatch) {
          return res.status(401).json({
              success: false,
              message: 'Invalid credentials'
          });
      }

      // Generate token
      const token = generateToken({
          _id: user._id,
          role: user.role,
          email: user.email,
          name: user.name
      });

      // Convert to object and remove password
      const userObject = user.toObject();
      delete userObject.password;

      res.status(200).json({
          success: true,
          token,
          user: {
              _id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
              image: user.image
          }
      });

  } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
          success: false,
          message: 'Server error during login',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
  }
};


export const logout = (req, res) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error during logout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized access'
      });
    }

    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// controllers/auth.controller.js (updated)
export const checkAuth = async (req, res) => {
  try {
      // Verify req.user exists
      if (!req.user) {
          return res.status(401).json({
              success: false,
              isAuthenticated: false,
              message: 'User not authenticated'
          });
      }

      // Return user data
      return res.status(200).json({
          success: true,
          isAuthenticated: true,
          user: {
              _id: req.user._id,
              name: req.user.name,
              email: req.user.email,
              role: req.user.role,
              image: req.user.image,
              createdAt: req.user.createdAt,
              updatedAt: req.user.updatedAt
          }
      });

  } catch (error) {
      console.error('Auth check error:', error);
      return res.status(500).json({
          success: false,
          message: 'Server error during auth check',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
  }
};

export const updateProfile = async (req, res) => {
  try {
      const userId = req.user._id;
      const { name, email } = req.body;

      // Check if email is being changed and if it's already in use
      if (email && email !== req.user.email) {
          const emailExists = await User.findOne({ email, _id: { $ne: userId } });
          if (emailExists) {
              return res.status(400).json({
                  success: false,
                  message: 'Email is already in use'
              });
          }
      }

      // Prepare update data
      let updateData = {
          name: name || req.user.name,
          email: email || req.user.email
      };

      // Handle profile image if uploaded
      if (req.file) {
          updateData.image = {
              data: req.file.buffer,
              contentType: req.file.mimetype
          };
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
          userId,
          updateData,
          { new: true, runValidators: true }
      ).select('-password');

      res.status(200).json({
          success: true,
          message: 'Profile updated successfully',
          user: {
              _id: updatedUser._id,
              name: updatedUser.name,
              email: updatedUser.email,
              role: updatedUser.role,
              hasImage: !!updatedUser.image
          }
      });

  } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({
          success: false,
          message: 'Server error during profile update',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
  }
};

export default {
  register,
  login,
  logout,
  getUserProfile,
  updateProfile,
  checkAuth,
};