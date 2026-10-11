
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const { fileTypeFromFile } = require("file-type");

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const allowedTypes = {
  "image/jpeg": ".jpeg",
  "image/png": ".png",
  "image/webp": ".webp",
};

// Ensure the uploads directory exists.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },

  filename: (req, file, cb) => {
    cb(null, `${crypto.randomUUID()}.upload`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!Object.prototype.hasOwnProperty.call(allowedTypes, file.mimetype)) {
    const error = new Error(
      "Only JPEG, PNG, and WebP images are allowed."
    );

    error.code = "UNSUPPORTED_FILE_TYPE";
    return cb(error);
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

const validateImageContent = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const originalPath = req.file.path;
  let finalPath;

  try {
    const detected = await fileTypeFromFile(originalPath);

    // Validate the actual file contents, not just its extension
    // or the MIME type supplied by the client.
    if (
      !detected ||
      !Object.prototype.hasOwnProperty.call(
        allowedTypes,
        detected.mime
      )
    ) {
      await fsp.unlink(originalPath).catch(() => {});

      return res.status(400).json({
        message: "Invalid image content. Upload a valid JPEG, PNG, or WebP image.",
      });
    }

    // The declared MIME type must match the detected content.
    if (req.file.mimetype !== detected.mime) {
      await fsp.unlink(originalPath).catch(() => {});

      return res.status(400).json({
        message: "The uploaded file type does not match its contents.",
      });
    }

    finalPath =
      originalPath.slice(0, -".upload".length) +
      allowedTypes[detected.mime];

    await fsp.rename(originalPath, finalPath);

    req.file.path = finalPath;
    req.file.filename = path.basename(finalPath);
    req.file.mimetype = detected.mime;

    return next();
  } catch (error) {
    await fsp.unlink(originalPath).catch(() => {});

    if (finalPath) {
      await fsp.unlink(finalPath).catch(() => {});
    }

    console.error("Image validation failed:", error.message);

    return res.status(400).json({
      message: "Unable to validate the uploaded image.",
    });
  }
};

module.exports = upload;
module.exports.validateImageContent = validateImageContent;
