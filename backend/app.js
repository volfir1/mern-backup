// app.js
import express from "express";
import productRoutes from "./routes/product.js";
import categoryRoutes from "./routes/category.js";
import subcategoryRoutes from "./routes/subcategory.js";
import supplierRoutes from "./routes/supplier.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import { protect } from "./middleware/auth.js";

const router = express.Router();

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Public routes
router.use("/auth", authRoutes);

// Protected routes with middleware
router.use("/products", protect, productRoutes);
router.use("/categories", protect, categoryRoutes);
router.use("/subcategories", protect, subcategoryRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/users", protect, userRoutes);

export default router;