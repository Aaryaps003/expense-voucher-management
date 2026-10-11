
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const voucherRoutes = require("./routes/voucherRoutes");
const { protect } = require("./middleware/authMiddleware");

const app = express();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(express.json());

// Health-check route
app.get("/", (req, res) => {
  res.send("Expense Voucher Management System API is running!");
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Protected current-user endpoint
app.get("/api/auth/me", protect, (req, res) => {
  res.json({
    message: "Authenticated successfully",
    user: req.user,
  });
});

// Voucher routes
app.use("/api/vouchers", voucherRoutes);

// Connect to MongoDB and start server
async function startServer() {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI is missing from .env");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from .env");
    }

    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
