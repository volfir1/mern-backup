import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { DEFAULT_IMAGES } from '../utils/cloudinary.js';

const userSchema = new mongoose.Schema({
  // Personal Information
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/,
      'Please provide a valid email'
    ]
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/, 'Please provide a valid phone number']
  },

  // Authentication
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },

  // Profile
  image: {
    public_id: {
      type: String,
      default: 'default'
    },
    url: {
      type: String,
      default: 'default_avatar_url'
    }
  },
  bio: {
    type: String,
    maxlength: [200, 'Bio cannot be more than 200 characters']
  },

  // Address Information
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },

  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,

  // Password Reset
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,

  // Account Activity
  lastLogin: {
    type: Date,
    default: Date.now
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  provider: {
    type: String,
    enum: ['local', 'google', 'both'],
    default: 'local'
  },
  googleId: {
    type: String,
    sparse: true // Allows null/undefined values
  },
  lockUntil: Date,

  // Preferences
  notifications: {
    email: {
      marketing: { type: Boolean, default: true },
      orderUpdates: { type: Boolean, default: true },
      security: { type: Boolean, default: true }
    }
  },
  
  // Refresh Token
  refreshToken: {
    type: String,
    select: false
  },

  // New Fields
  tokenVersion: {
    type: String,
    default: () => crypto.randomBytes(8).toString('hex')
  },
  lastActivity: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ email: 1, provider: 1 });

// Virtuals
userSchema.virtual('fullName').get(function() {
  return this.name;
});

userSchema.virtual('fullAddress').get(function() {
  if (!this.address) return '';
  const { street, city, state, postalCode, country } = this.address;
  return `${street}, ${city}, ${state} ${postalCode}, ${country}`.trim();
});

// Middleware
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified or new
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Methods

userSchema.methods = {
  // Password comparison
  matchPassword: async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  },

  // Generate email verification token
  generateEmailVerificationToken: function() {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    this.emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
      
    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    
    return verificationToken;
  },

  // Generate password reset token
  generatePasswordResetToken: function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
      
    this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    
    return resetToken;
  },

  // Check if password changed after token issued
  hasPasswordChangedAfter: function(timestamp) {
    if (this.passwordChangedAt) {
      const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
      return timestamp < changedTimestamp;
    }
    return false;
  },

  // Increment login attempts
  incrementLoginAttempts: async function() {
    // Reset login attempts if lock has expired
    if (this.lockUntil && this.lockUntil < Date.now()) {
      this.loginAttempts = 1;
      this.lockUntil = undefined;
    } else {
      // Increment attempts
      this.loginAttempts += 1;
      
      // Lock account if max attempts reached
      if (this.loginAttempts >= 5 && !this.lockUntil) {
        this.lockUntil = Date.now() + 3600000; // Lock for 1 hour
      }
    }
    
    await this.save();
    return this.lockUntil;
  },

  // Reset login attempts
  resetLoginAttempts: function() {
    return this.updateOne({
      $set: {
        loginAttempts: 5,
        lockUntil: null
      }
    });
  }
};

const User = mongoose.model('User', userSchema);

export default User;