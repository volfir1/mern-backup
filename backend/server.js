// server.js
import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";
import cors from "cors";
import morgan from "morgan";
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { corsOptions } from "./config/cors.js";
import connectDatabase from "./config/database.js";
import apiRoutes from "./app.js";

// Initialize dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: `${__dirname}/.env` });

// Create Express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware Setup
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

// Mount API routes
app.use("/api", apiRoutes);

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);

  // Handle different types of errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(error => error.message)
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value entered'
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  // Default error response
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Server Startup Function
const startServer = async () => {
  try {
    // Connect to Database
    await connectDatabase();
    
    // Start Server
    const server = app.listen(port, () => {
      console.log(`
        🚀 Server is running!
        🌍 Environment: ${process.env.NODE_ENV || "development"}
        🚪 Port: ${port}
        🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}
      `);
    });

    // Graceful Shutdown Handler
    const gracefulShutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
      try {
        await new Promise((resolve) => {
          server.close(resolve);
          console.log('HTTP server closed');
        });
        process.exit(0);
      } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled rejections
    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION! 💥', err);
      gracefulShutdown('UNHANDLED REJECTION');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('UNCAUGHT EXCEPTION! 💥', err);
      gracefulShutdown('UNCAUGHT EXCEPTION');
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export default app;