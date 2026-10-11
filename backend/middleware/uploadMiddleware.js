
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs/promises");
const { fileTypeFromFile } = require("file-type");

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const allowedTypes = {
  "image/jpeg": ".jpeg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },

  filename: (req, file, cb) => {
    // Never trust the original filename or extension.
    cb(null, `${crypto.randomUUID()}.upload`);
  },
});

const fileFilter = (req, file, cb) => {
  // Early rejection only. Actual file contents are checked after upload.
  if (!Object.keys(allowedTypes).includes(file.mimetype)) {
    return cb(
      new Error("Only JPEG, PNG, and WebP images are allowed")
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
});

// Inspect the actual uploaded file before the controller processes it.
const validateImageContent = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const detected = await fileTypeFromFile(req.file.path);

    if (
      !detected ||
      !Object.prototype.hasOwnProperty.call(
        allowedTypes,
        detected.mime
      )
    ) {
      await fs.unlink(req.file.path).catch(() => {});

      return res.status(400).json({
        message: "Invalid image content. Upload a JPEG, PNG, or WebP image.",
      });
    }

    // Ensure the declared MIME type matches the detected content.
    if (req.file.mimetype !== detected.mime) {
      await fs.unlink(req.file.path).catch(() => {});

      return res.status(400).json({
        message: "Image content does not match its declared file type.",
      });
    }

    // Give the file a safe, server-generated extension.
    const finalPath =
      `${req.file.path.slice(0, -".upload".length)}` +
      allowedTypes[detected.mime];

    await fs.rename(req.file.path, finalPath);

    req.file.path = finalPath;
    req.file.filename = path.basename(finalPath);
    req.file.mimetype = detected.mime;

    next();
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => {});

    console.error("Image validation failed:", error.message);

    return res.status(400).json({
      message: "Unable to validate uploaded image.",
    });
  }
};

module.exports = upload;
module.exports.validateImageContent = validateImageContent;
