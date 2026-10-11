
const fs = require("fs/promises");
const path = require("path");

const Voucher = require("../models/Voucher");
const User = require("../models/User");

// ==================================================
// HELPERS
// ==================================================

const removeUploadedFile = async (filename) => {
  if (!filename) return;

  const filePath = path.join(
    process.cwd(),
    "uploads",
    path.basename(filename)
  );

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("File deletion error:", error.message);
    }
  }
};

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const allowedStatuses = [
  "Draft",
  "Submitted",
  "Pending Approval",
  "Approved",
  "Rejected",
];

// Build filters shared by search, status, department, category and dates.
const buildVoucherFilter = async (query) => {
  const {
    search,
    status,
    department,
    category,
    startDate,
    endDate,
  } = query;

  const filter = {};

  if (status) {
    if (!allowedStatuses.includes(status)) {
      const error = new Error("Invalid voucher status filter.");
      error.statusCode = 400;
      throw error;
    }

    filter.status = status;
  }

  if (department?.trim()) {
    filter.department = {
      $regex: escapeRegex(department.trim()),
      $options: "i",
    };
  }

  if (category?.trim()) {
    filter.category = {
      $regex: escapeRegex(category.trim()),
      $options: "i",
    };
  }

  if (startDate || endDate) {
    const dateFilter = {};

    if (startDate) {
      const start = new Date(startDate);

      if (Number.isNaN(start.getTime())) {
        const error = new Error("Invalid startDate.");
        error.statusCode = 400;
        throw error;
      }

      start.setHours(0, 0, 0, 0);
      dateFilter.$gte = start;
    }

    if (endDate) {
      const end = new Date(endDate);

      if (Number.isNaN(end.getTime())) {
        const error = new Error("Invalid endDate.");
        error.statusCode = 400;
        throw error;
      }

      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    if (
      dateFilter.$gte &&
      dateFilter.$lte &&
      dateFilter.$gte > dateFilter.$lte
    ) {
      const error = new Error(
        "startDate cannot be later than endDate."
      );
      error.statusCode = 400;
      throw error;
    }

    filter.expenseDate = dateFilter;
  }

  if (search?.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");

    const matchingUsers = await User.find({
      $or: [
        { name: regex },
        { email: regex },
      ],
    }).select("_id");

    filter.$or = [
      { voucherNumber: regex },
      { title: regex },
      { department: regex },
      { category: regex },
      { description: regex },
      {
        employee: {
          $in: matchingUsers.map((user) => user._id),
        },
      },
    ];
  }

  return filter;
};

// ==================================================
// 1. CREATE VOUCHER
// POST /api/vouchers
// ==================================================

const createVoucher = async (req, res) => {
  try {
    const {
      expenseDate,
      department,
      title,
      category,
      description,
      amount,
    } = req.body;

    if (
      !expenseDate ||
      typeof department !== "string" ||
      !department.trim() ||
      typeof title !== "string" ||
      !title.trim() ||
      typeof category !== "string" ||
      !category.trim() ||
      amount === undefined ||
      amount === null ||
      amount === ""
    ) {
      return res.status(400).json({
        message:
          "Expense date, department, title, category, and amount are required.",
      });
    }

    if (
      description !== undefined &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        message: "Description must be text.",
      });
    }

    const parsedAmount = Number(amount);
    const parsedDate = new Date(expenseDate);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than zero.",
      });
    }

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        message: "Invalid expense date.",
      });
    }

    const voucher = await Voucher.create({
      expenseDate: parsedDate,
      department: department.trim(),
      title: title.trim(),
      category: category.trim(),
      description: description?.trim() || "",
      amount: parsedAmount,
      employee: req.user._id,
      status: "Draft",
    });

    return res.status(201).json({
      message: "Voucher created successfully.",
      voucher,
    });
  } catch (error) {
    console.error("Create voucher error:", error.message);

    return res.status(500).json({
      message: "Failed to create voucher.",
    });
  }
};

// ==================================================
// 2. GET MY VOUCHERS
// GET /api/vouchers
// ==================================================

const getMyVouchers = async (req, res) => {
  try {
    const vouchers = await Voucher.find({
      employee: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      count: vouchers.length,
      vouchers,
    });
  } catch (error) {
    console.error("Get my vouchers error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve your vouchers.",
    });
  }
};

// ==================================================
// 3. UPLOAD EMPLOYEE SIGNATURE
// POST /api/vouchers/:id/signature
// ==================================================

const uploadEmployeeSignature = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please upload a valid signature image.",
      });
    }

    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      await removeUploadedFile(req.file.filename);

      return res.status(404).json({
        message: "Voucher not found.",
      });
    }

    if (voucher.employee.toString() !== req.user._id.toString()) {
      await removeUploadedFile(req.file.filename);

      return res.status(403).json({
        message: "You cannot modify another employee's voucher.",
      });
    }

    if (voucher.status !== "Draft") {
      await removeUploadedFile(req.file.filename);

      return res.status(400).json({
        message: "Only Draft vouchers can receive an employee signature.",
      });
    }

    const previousSignature = voucher.employeeSignature;

    voucher.employeeSignature = req.file.filename;
    await voucher.save();

    if (previousSignature) {
      await removeUploadedFile(previousSignature);
    }

    return res.status(200).json({
      message: "Employee signature uploaded successfully.",
      voucher,
    });
  } catch (error) {
    if (req.file?.filename) {
      await removeUploadedFile(req.file.filename);
    }

    console.error("Employee signature error:", error.message);

    return res.status(500).json({
      message: "Failed to upload employee signature.",
    });
  }
};

// ==================================================
// 4. SUBMIT VOUCHER
// PATCH /api/vouchers/:id/submit
// ==================================================

const submitVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      return res.status(404).json({
        message: "Voucher not found.",
      });
    }

    if (voucher.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You cannot submit another employee's voucher.",
      });
    }

    if (voucher.status !== "Draft") {
      return res.status(400).json({
        message: "Only Draft vouchers can be submitted.",
      });
    }

    if (!voucher.employeeSignature) {
      return res.status(400).json({
        message: "Upload your signature before submitting.",
      });
    }

    voucher.status = "Pending Approval";
    await voucher.save();

    return res.status(200).json({
      message: "Voucher submitted for approval.",
      voucher,
    });
  } catch (error) {
    console.error("Submit voucher error:", error.message);

    return res.status(500).json({
      message: "Failed to submit voucher.",
    });
  }
};

// ==================================================
// 5. GET PENDING VOUCHERS
// GET /api/vouchers/pending
// ==================================================

const getPendingVouchers = async (req, res) => {
  try {
    const vouchers = await Voucher.find({
      status: "Pending Approval",
    })
      .populate("employee", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: vouchers.length,
      vouchers,
    });
  } catch (error) {
    console.error("Get pending vouchers error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve pending vouchers.",
    });
  }
};

// ==================================================
// 6. GET ALL VOUCHERS: SEARCH, FILTERS, PAGINATION
// GET /api/vouchers/all
// ==================================================

const getAllVouchers = async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        message:
          "Page must be a positive integer and limit must be between 1 and 100.",
      });
    }

    const filter = await buildVoucherFilter(req.query);
    const skip = (page - 1) * limit;

    const [total, vouchers] = await Promise.all([
      Voucher.countDocuments(filter),
      Voucher.find(filter)
        .populate("employee", "name email")
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({
      count: vouchers.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      vouchers,
    });
  } catch (error) {
    console.error("Get all vouchers error:", error.message);

    return res.status(error.statusCode || 500).json({
      message: error.statusCode
        ? error.message
        : "Failed to retrieve vouchers.",
    });
  }
};

// ==================================================
// 7. UPLOAD DIRECTOR SIGNATURE
// POST /api/vouchers/:id/director-signature
// ==================================================

const uploadDirectorSignature = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please upload a valid Director signature image.",
      });
    }

    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      await removeUploadedFile(req.file.filename);

      return res.status(404).json({
        message: "Voucher not found.",
      });
    }

    if (voucher.status !== "Pending Approval") {
      await removeUploadedFile(req.file.filename);

      return res.status(400).json({
        message: "Only pending vouchers can receive a Director signature.",
      });
    }

    const previousSignature = voucher.directorSignature;

    voucher.directorSignature = req.file.filename;
    await voucher.save();

    if (previousSignature) {
      await removeUploadedFile(previousSignature);
    }

    return res.status(200).json({
      message: "Director signature uploaded successfully.",
      voucher,
    });
  } catch (error) {
    if (req.file?.filename) {
      await removeUploadedFile(req.file.filename);
    }

    console.error("Director signature error:", error.message);

    return res.status(500).json({
      message: "Failed to upload Director signature.",
    });
  }
};

// ==================================================
// 8. UPDATE DRAFT VOUCHER
// PATCH /api/vouchers/:id
// ==================================================

const updateDraftVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      return res.status(404).json({
        message: "Voucher not found.",
      });
    }

    if (voucher.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You cannot edit another employee's voucher.",
      });
    }

    if (voucher.status !== "Draft") {
      return res.status(400).json({
        message: "Only Draft vouchers can be edited.",
      });
    }

    const allowedFields = [
      "expenseDate",
      "department",
      "title",
      "category",
      "description",
      "amount",
    ];

    const fields = Object.keys(req.body);

    if (fields.length === 0) {
      return res.status(400).json({
        message: "Provide at least one field to update.",
      });
    }

    const invalidFields = fields.filter(
      (field) => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        message: "One or more fields cannot be updated.",
        invalidFields,
      });
    }

    for (const field of fields) {
      const value = req.body[field];

      if (["department", "title", "category"].includes(field)) {
        if (typeof value !== "string" || !value.trim()) {
          return res.status(400).json({
            message: `${field} must be a non-empty string.`,
          });
        }

        voucher[field] = value.trim();
      } else if (field === "description") {
        if (typeof value !== "string") {
          return res.status(400).json({
            message: "Description must be text.",
          });
        }

        voucher.description = value.trim();
      } else if (field === "amount") {
        const amount = Number(value);

        if (!Number.isFinite(amount) || amount <= 0) {
          return res.status(400).json({
            message: "Amount must be greater than zero.",
          });
        }

        voucher.amount = amount;
      } else if (field === "expenseDate") {
        const date = new Date(value);

        if (!value || Number.isNaN(date.getTime())) {
          return res.status(400).json({
            message: "Invalid expense date.",
          });
        }

        voucher.expenseDate = date;
      }
    }

    await voucher.save();

    return res.status(200).json({
      message: "Draft voucher updated successfully.",
      voucher,
    });
  } catch (error) {
    console.error("Update voucher error:", error.message);

    return res.status(500).json({
      message: "Failed to update voucher.",
    });
  }
};

// ==================================================
// 9. DELETE DRAFT VOUCHER
// DELETE /api/vouchers/:id
// ==================================================

const deleteDraftVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      return res.status(404).json({
        message: "Voucher not found.",
      });
    }

    if (voucher.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You cannot delete another employee's voucher.",
      });
    }

    if (voucher.status !== "Draft") {
      return res.status(400).json({
        message: "Only Draft vouchers can be deleted.",
      });
    }

    const signature = voucher.employeeSignature;

    await voucher.deleteOne();

    if (signature) {
      await removeUploadedFile(signature);
    }

    return res.status(200).json({
      message: "Draft voucher deleted successfully.",
    });
  } catch (error) {
    console.error("Delete voucher error:", error.message);

    return res.status(500).json({
      message: "Failed to delete voucher.",
    });
  }
};

// ==================================================
// 10. APPROVE VOUCHER
// PATCH /api/vouchers/:id/approve
// ==================================================

const approveVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      return res.status(404).json({
        message: "Voucher not found.",
      });
    }

    if (voucher.status !== "Pending Approval") {
      return res.status(400).json({
        message: "Only pending vouchers can be approved.",
      });
    }

    if (!voucher.directorSignature) {
      return res.status(400).json({
        message: "Upload the Director signature before approval.",
      });
    }

    voucher.status = "Approved";
    voucher.approvalDate = new Date();
    voucher.rejectionReason = "";

    await voucher.save();

    return res.status(200).json({
      message: "Voucher approved successfully.",
      voucher,
    });
  } catch (error) {
    console.error("Approve voucher error:", error.message);

    return res.status(500).json({
      message: "Failed to approve voucher.",
    });
  }
};

// ==================================================
// 11. REJECT VOUCHER
// PATCH /api/vouchers/:id/reject
// ==================================================

const rejectVoucher = async (req, res) => {
  try {
    const reason =
      typeof req.body.rejectionReason === "string"
        ? req.body.rejectionReason.trim()
        : typeof req.body.reason === "string"
          ? req.body.reason.trim()
          : "";

    if (!reason) {
      return res.status(400).json({
        message: "A rejection reason is required.",
      });
    }

    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      return res.status(404).json({
        message: "Voucher not found.",
      });
    }

    if (voucher.status !== "Pending Approval") {
      return res.status(400).json({
        message: "Only pending vouchers can be rejected.",
      });
    }

    voucher.status = "Rejected";
    voucher.rejectionReason = reason;
    voucher.approvalDate = null;

    await voucher.save();

    return res.status(200).json({
      message: "Voucher rejected successfully.",
      voucher,
    });
  } catch (error) {
    console.error("Reject voucher error:", error.message);

    return res.status(500).json({
      message: "Failed to reject voucher.",
    });
  }
};

// ==================================================
// 12. DASHBOARD STATISTICS
// GET /api/vouchers/stats
// ==================================================

const getDashboardStats = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === "Employee") {
      filter.employee = req.user._id;
    } else if (
      !["Director", "Accounts"].includes(req.user.role)
    ) {
      return res.status(403).json({
        message: "Access denied.",
      });
    }

    const [total, groupedStats, amountStats] = await Promise.all([
      Voucher.countDocuments(filter),

      Voucher.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      Voucher.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            approvedAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "Approved"] },
                  "$amount",
                  0,
                ],
              },
            },
            pendingAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "Pending Approval"] },
                  "$amount",
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const statusCounts = {
      Draft: 0,
      Submitted: 0,
      "Pending Approval": 0,
      Approved: 0,
      Rejected: 0,
    };

    for (const item of groupedStats) {
      statusCounts[item._id] = item.count;
    }

    const amounts = amountStats[0] || {
      totalAmount: 0,
      approvedAmount: 0,
      pendingAmount: 0,
    };

    return res.status(200).json({
      role: req.user.role,
      total,
      statusCounts,
      amounts: {
        totalAmount: amounts.totalAmount,
        approvedAmount: amounts.approvedAmount,
        pendingAmount: amounts.pendingAmount,
      },
    });
  } catch (error) {
    console.error("Dashboard statistics error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve dashboard statistics.",
    });
  }
};

// ==================================================
// EXPORTS
// ==================================================

module.exports = {
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
};
