
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const voucherRoutes = require("./routes/voucherRoutes");
const { protect } = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 5000;

// --------------------------------------------------
// CORS
// --------------------------------------------------

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// --------------------------------------------------
// REQUEST BODY PARSING
// --------------------------------------------------

app.use(express.json({ limit: "100kb" }));

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/", (req, res) => {
  res.status(200).json({
    message: "ExpenseFlow API is running.",
  });
});

// --------------------------------------------------
// AUTHENTICATION ROUTES
// --------------------------------------------------

app.use("/api/auth", authRoutes);

app.get("/api/auth/me", protect, (req, res) => {
  res.status(200).json({
    user: req.user,
  });
});

// --------------------------------------------------
// VOUCHER ROUTES
// --------------------------------------------------

app.use("/api/vouchers", voucherRoutes);

// --------------------------------------------------
// CENTRALIZED ERROR HANDLER
// Keep this after all routes and middleware.
// --------------------------------------------------

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  // Oversized JSON request body
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      message: "Request body is too large.",
    });
  }

  // Malformed JSON request body
  if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    Object.prototype.hasOwnProperty.call(err, "body")
  ) {
    return res.status(400).json({
      message: "Invalid JSON request body.",
    });
  }

  // Unsupported signature image MIME type
  if (err.code === "UNSUPPORTED_FILE_TYPE") {
    return res.status(400).json({
      message: "Only JPEG, PNG, and WebP images are allowed.",
    });
  }

  // Multer upload errors
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: "Signature image must not exceed 2 MB.",
      });
    }

    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        message: "Only one signature image may be uploaded.",
      });
    }

    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        message: "Unexpected upload field.",
      });
    }

    return res.status(400).json({
      message: "Invalid file upload request.",
    });
  }

  // Log server-side details without exposing them to clients.
  console.error("Unhandled request error:", err.message);

  return res.status(500).json({
    message: "An unexpected server error occurred.",
  });
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

async function startServer() {
  if (!process.env.MONGO_URI) {
    console.error("Missing required environment variable: MONGO_URI");
    process.exit(1);
  }

  if (!process.env.JWT_SECRET) {
    console.error("Missing required environment variable: JWT_SECRET");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully.");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error.message);
    process.exit(1);
  }
}

startServer();
