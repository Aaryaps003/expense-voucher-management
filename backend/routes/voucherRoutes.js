
const express = require("express");
const router = express.Router();

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");
const { validateImageContent } = require("../middleware/uploadMiddleware");

const {
  createVoucher,
  getMyVouchers,
  uploadEmployeeSignature,
  submitVoucher,
  getPendingVouchers,
  getAllVouchers,
  uploadDirectorSignature,
  updateDraftVoucher,
  deleteDraftVoucher,
  approveVoucher,
  rejectVoucher,
  getDashboardStats,
} = require("../controllers/voucherController");

const {
  getVoucherSignature,
} = require("../controllers/signatureController");

// ==================================================
// DASHBOARD STATISTICS
// GET /api/vouchers/stats
// ==================================================

router.get(
  "/stats",
  protect,
  authorize("Employee", "Director", "Accounts"),
  getDashboardStats
);

// ==================================================
// DIRECTOR AND ACCOUNTS
// ==================================================

router.get(
  "/all",
  protect,
  authorize("Director", "Accounts"),
  getAllVouchers
);

// ==================================================
// DIRECTOR ONLY
// ==================================================

router.get(
  "/pending",
  protect,
  authorize("Director"),
  getPendingVouchers
);

router.post(
  "/:id/director-signature",
  protect,
  authorize("Director"),
  upload.single("signature"),
  validateImageContent,
  uploadDirectorSignature
);

router.patch(
  "/:id/approve",
  protect,
  authorize("Director"),
  approveVoucher
);

router.patch(
  "/:id/reject",
  protect,
  authorize("Director"),
  rejectVoucher
);

// ==================================================
// EMPLOYEE ONLY
// ==================================================

router.get(
  "/",
  protect,
  authorize("Employee"),
  getMyVouchers
);

router.post(
  "/",
  protect,
  authorize("Employee"),
  createVoucher
);

router.patch(
  "/:id",
  protect,
  authorize("Employee"),
  updateDraftVoucher
);

router.delete(
  "/:id",
  protect,
  authorize("Employee"),
  deleteDraftVoucher
);

router.post(
  "/:id/signature",
  protect,
  authorize("Employee"),
  upload.single("signature"),
  validateImageContent,
  uploadEmployeeSignature
);

router.patch(
  "/:id/submit",
  protect,
  authorize("Employee"),
  submitVoucher
);

// ==================================================
// AUTHENTICATED SIGNATURE RETRIEVAL
// ==================================================

router.get(
  "/:id/signature/:type",
  protect,
  getVoucherSignature
);

module.exports = router;
