// config/database.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDatabase = async () => {
  try {
    const uri = process.env.DB_URI;

    if (!uri) {
      throw new Error("Database URI is not defined in environment variables");
    }

    // Disconnect from any existing connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    console.log("Attempting to connect to MongoDB...");

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,     // Close sockets after 45 seconds of inactivity
      maxPoolSize: 50,            // Maintain up to 50 socket connections
      connectTimeoutMS: 10000,    // Give up initial connection after 10 seconds
      retryWrites: true,          // Automatically retry failed writes
    });

    // Success handlers
    mongoose.connection.on('connected', () => {
      console.log(`MongoDB connected successfully to HOST: ${conn.connection.host}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Error handlers
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });

    return conn;
  } catch (error) {
    console.error("Database connection error:", {
      message: error.message,
      uri: process.env.DB_URI?.replace(/\/\/[^:]+:[^@]+@/, '//****:****@') // Log URI with hidden credentials
    });
    
    // If this is a known MongoDB error, provide more specific feedback
    if (error.name === 'MongoServerSelectionError') {
      console.error("Could not connect to any MongoDB servers");
    } else if (error.name === 'MongoNetworkError') {
      console.error("Network error occurred while trying to connect to MongoDB");
    }

    throw error; // Let the calling function handle the error
  }
};

// Helper function to check database connection status
export const checkDatabaseConnection = () => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[state] || 'unknown';
};

export default connectDatabase;