
const mongoose = require("mongoose");
const crypto = require("crypto");

const voucherSchema = new mongoose.Schema(
  {
    voucherNumber: {
      type: String,
      unique: true,
      required: true,
      default: () => `EV-${crypto.randomUUID()}`,
    },

    voucherDate: {
      type: Date,
      default: Date.now,
    },

    expenseDate: {
      type: Date,
      required: true,
    },

    department: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    amount: {
      type: Number,
      required: true,
      min: [0.01, "Amount must be greater than zero"],
    },

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    employeeSignature: {
      type: String,
      default: "",
    },

    directorSignature: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "Draft",
        "Submitted",
        "Pending Approval",
        "Approved",
        "Rejected",
      ],
      default: "Draft",
    },

    approvalDate: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Voucher = mongoose.model("Voucher", voucherSchema);

module.exports = Voucher;
