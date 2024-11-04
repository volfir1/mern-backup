// utils/emailVerification.js
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/user.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken'; // Import jsonwebtoken

// Configure Google OAuth2 client
const oAuth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage'
);

// Create Mailtrap transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "fc692358dbbbca", // Your Mailtrap username
      pass: "4c98765ee18bdc" // Add your Mailtrap password here
    }
  });
};

// Enhanced email template
const createEmailTemplate = (name, verificationUrl) => `
  <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
    <h1 style="color: #333; text-align: center;">Welcome to Gadget Galaxy!</h1>
    <p style="color: #666; font-size: 16px; line-height: 1.5;">
      Hi ${name},
    </p>
    <p style="color: #666; font-size: 16px; line-height: 1.5;">
      Thanks for joining Gadget Galaxy! Please verify your email address by clicking the button below:
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" 
         style="background-color: #4CAF50; color: white; padding: 12px 25px; 
                text-decoration: none; border-radius: 4px; display: inline-block;">
        Verify My Email
      </a>
    </div>
    <p style="color: #666;">
      Or copy and paste this link in your browser:
      <br>
      ${verificationUrl}
    </p>
    <p style="color: #999; font-size: 14px;">
      This link will expire in 24 hours.
    </p>
    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
      <p style="color: #999; font-size: 12px;">
        © ${new Date().getFullYear()} Gadget Galaxy. All rights reserved.
      </p>
    </div>
  </div>
`;

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

export const verificationUtils = {
  // Send verification email using Mailtrap
  sendVerificationEmail: async (user) => {
    try {
      const verificationToken = user.generateEmailVerificationToken();
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
      
      const transporter = createTransporter();
      
      await transporter.sendMail({
        from: '"Gadget Galaxy" <gadget-galaxy-service@mern-project-440505.iam.gserviceaccount.com>',
        to: user.email,
        subject: 'Welcome to Gadget Galaxy - Verify Your Email',
        html: createEmailTemplate(user.name, verificationUrl)
      });

      await user.save();
      return verificationToken;
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Error sending verification email');
    }
  },

  // Verify email token
  verifyEmailToken: async (token) => {
    try {
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: Date.now() }
      });

      if (!user) {
        throw new Error('Invalid or expired verification token');
      }

      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      return user;
    } catch (error) {
      throw new Error('Email verification failed');
    }
  },

  // Google Sign-in verification with enhanced error handling
  verifyGoogleToken: async (token) => {
    try {
      console.log('Verifying Google token:', token);
      
      const ticket = await oAuth2Client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      
      const payload = ticket.getPayload();
      console.log('Google payload:', payload);
      
      if (!payload.email_verified) {
        throw new Error('Google email not verified');
      }

      let user = await User.findOne({ email: payload.email });
      
      if (!user) {
        // Create new user
        user = await User.create({
          email: payload.email,
          name: payload.name,
          role: 'user',
          image: {
            public_id: 'google_profile',
            url: payload.picture || 'default_image_url'
          },
          isEmailVerified: true, // Google accounts are pre-verified
          password: crypto.randomBytes(32).toString('hex'), // Random password
          provider: 'google'
        });
      } else {
        // Update existing user's Google info
        user.isEmailVerified = true;
        user.image = {
          public_id: 'google_profile',
          url: payload.picture || user.image.url
        };
        user.lastLogin = new Date();
        await user.save();
      }

      return user;
    } catch (error) {
      console.error('Google verification error:', error);
      throw new Error('Google authentication failed');
    }
  }
};

export const verificationControllers = {
  // Email verification endpoint
  verifyEmail: async (req, res) => {
    try {
      const { token } = req.query;
      const user = await verificationUtils.verifyEmailToken(token);
      const authToken = generateToken(user);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        token: authToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified: true,
          image: user.image
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Resend verification email endpoint
  resendVerification: async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email is already verified'
        });
      }

      await verificationUtils.sendVerificationEmail(user);

      res.status(200).json({
        success: true,
        message: 'Verification email sent successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error sending verification email'
      });
    }
  },

  googleAuth: async (req, res) => {
    try {
        console.log('Google auth request body:', req.body);
        
        const { credential, isRegistration } = req.body; // Add isRegistration flag
        
        if (!credential) {
            return res.status(400).json({
                success: false,
                message: 'No credential provided'
            });
        }

        try {
            // Verify Google token
            const ticket = await oAuth2Client.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID
            });

            const payload = ticket.getPayload();
            console.log('Google payload:', payload);

            if (!payload.email_verified) {
                return res.status(400).json({
                    success: false,
                    message: 'Google email not verified'
                });
            }

            // Check if user exists
            let user = await User.findOne({ email: payload.email });

            // Handle Login vs Registration
            if (!user && !isRegistration) {
                // User doesn't exist and trying to login
                return res.status(404).json({
                    success: false,
                    message: 'Account not found. Please register first.',
                    isNewUser: true
                });
            }

            if (user && isRegistration) {
                // User exists and trying to register
                return res.status(400).json({
                    success: false,
                    message: 'Account already exists. Please login instead.',
                    isNewUser: false
                });
            }

            if (!user) {
                // Create new user with Google data
                user = await User.create({
                    email: payload.email,
                    name: payload.name,
                    firstName: payload.given_name,
                    lastName: payload.family_name,
                    role: 'user',
                    provider: 'google',
                    googleId: payload.sub,
                    image: {
                        public_id: 'google_profile',
                        url: payload.picture || 'default_url'
                    },
                    isEmailVerified: true,
                    password: crypto.randomBytes(32).toString('hex'),
                    lastLogin: new Date(),
                    isNewUser: false // Set to false after creation
                });
            } else {
                // Update existing user
                user.isEmailVerified = true;
                user.lastLogin = new Date();
                user.name = payload.name;
                user.firstName = payload.given_name;
                user.lastName = payload.family_name;
                user.googleId = payload.sub;
                
                if (payload.picture) {
                    user.image = {
                        public_id: 'google_profile',
                        url: payload.picture
                    };
                }

                if (user.provider !== 'google') {
                    user.provider = 'both';
                }

                await user.save();
            }

            // Generate tokens
            const authToken = generateToken(user);
            const refreshToken = jwt.sign(
                { id: user._id },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: '7d' }
            );

            // Set cookies
            res.cookie('accessToken', authToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 15 * 60 * 1000
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            // Send response
            return res.status(200).json({
                success: true,
                message: `Google ${isRegistration ? 'registration' : 'login'} successful`,
                token: authToken,
                user: {
                    _id: user._id,
                    name: user.name,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role,
                    image: user.image,
                    isEmailVerified: true,
                    provider: user.provider,
                    createdAt: user.createdAt,
                    isNewUser: false
                }
            });

        } catch (verifyError) {
            console.error('Google token verification failed:', verifyError);
            return res.status(401).json({
                success: false,
                message: 'Invalid Google credential'
            });
        }

    } catch (error) {
        console.error('Google auth error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error during Google authentication',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
}