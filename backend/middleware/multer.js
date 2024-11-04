// middleware/multer.js
import multer from "multer";

// Constants
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml"
];

const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5;

// Define field names for different types
const FIELD_NAMES = {
  PROFILE: 'image',
  PRODUCT: 'image',
  CATEGORY: 'image',
  SUBCATEGORY: 'image'
};

// Storage configuration
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types are: ${ALLOWED_FILE_TYPES.join(", ")}`
      ),
      false
    );
  }
};

// Create configurable multer instance
const createMulterInstance = ({
  fileType = 'image',
  maxSize = FILE_SIZE_LIMIT,
  maxCount = 1
} = {}) => {
  return multer({
    storage,
    limits: {
      fileSize: maxSize,
      files: maxCount
    },
    fileFilter
  });
};

// Create upload middleware factories
const createUploadMiddleware = {
  // For user profiles and registration
  profile: () => {
    const upload = createMulterInstance({ fileType: 'image' });
    return wrapMulterMiddleware(upload.single(FIELD_NAMES.PROFILE));
  },

  // For products
  product: () => {
    const upload = createMulterInstance({ maxCount: MAX_FILES });
    return wrapMulterMiddleware(upload.array(FIELD_NAMES.PRODUCT, MAX_FILES));
  },

  // For categories
  category: () => {
    const upload = createMulterInstance();
    return wrapMulterMiddleware(upload.single(FIELD_NAMES.CATEGORY));
  },

  // For subcategories
  subcategory: () => {
    const upload = createMulterInstance();
    return wrapMulterMiddleware(upload.single(FIELD_NAMES.SUBCATEGORY));
  },

  // For custom uploads
  custom: ({ fieldName, maxCount = 1, maxSize = FILE_SIZE_LIMIT }) => {
    const upload = createMulterInstance({ maxSize, maxCount });
    return wrapMulterMiddleware(
      maxCount === 1 
        ? upload.single(fieldName)
        : upload.array(fieldName, maxCount)
    );
  }
};

// Enhanced Multer Error Handler
const HandleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const errorMessages = {
      LIMIT_FILE_SIZE: `File too large. Maximum size is ${FILE_SIZE_LIMIT / (1024 * 1024)}MB`,
      LIMIT_FILE_COUNT: `Too many files. Maximum is ${MAX_FILES} files`,
      LIMIT_UNEXPECTED_FILE: `Invalid field name. Please use correct field name for your upload type: ${Object.values(FIELD_NAMES).join(', ')}`,
      LIMIT_FIELD_KEY: "Field name too long",
      LIMIT_FIELD_VALUE: "Field value too long",
      LIMIT_FIELD_COUNT: "Too many fields",
      LIMIT_PART_COUNT: "Too many parts"
    };

    return res.status(400).json({
      success: false,
      message: errorMessages[error.code] || "Error uploading file",
      error: {
        code: error.code,
        field: error.field,
        message: error.message
      },
      allowedFields: FIELD_NAMES
    });
  }

  if (error.message.includes("Invalid file type")) {
    return res.status(400).json({
      success: false,
      message: error.message,
      allowedTypes: ALLOWED_FILE_TYPES
    });
  }

  next(error);
};

// Enhanced wrapper function
const wrapMulterMiddleware = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        HandleMulterError(err, req, res, next);
      } else {
        if (req.file) {
          req.fileInfo = {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
          };
        }
        if (req.files) {
          req.filesInfo = req.files.map(file => ({
            fieldname: file.fieldname,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
          }));
        }
        next();
      }
    });
  };
};

export {
  createUploadMiddleware,
  HandleMulterError,
  ALLOWED_FILE_TYPES,
  FILE_SIZE_LIMIT,
  MAX_FILES,
  FIELD_NAMES
};