const multer = require("multer"); // handling file uploads
const path = require("path"); // helps work with file paths & extensions
const fs = require("fs");

const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(" Created uploads directory");
}

// Set storage
const storage = multer.diskStorage({
  destination(req, file, cb) {
    console.log(" Setting destination: uploads/");
    cb(null, "uploads/");
  },
  filename(req, file, cb) {
    const uniqueName = `${file.fieldname}-${Date.now()}${path.extname(
      file.originalname
    )}`;
    console.log(" Generated filename:", uniqueName);
    cb(null, uniqueName);
  },
});

// Check file type
function checkFileType(file, cb) {
  console.log(" Checking file type for:", file.originalname);
  console.log(" MIME type:", file.mimetype);

  const filetypes = /jpg|jpeg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  console.log(" Extension valid:", extname);
  console.log(" MIME type valid:", mimetype);

  if (extname && mimetype) {
    console.log(" File type validation passed");
    return cb(null, true);
  } else {
    console.log(" File type validation failed");
    cb(new Error("Images only! Allowed types: jpg, jpeg, png"));
  }
}

//validae allow file types
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    fieldSize: 2 * 1024 * 1024, // 2MB for text fields
  },
  fileFilter: function (req, file, cb) {
    console.log(" Multer fileFilter called for field:", file.fieldname);
    checkFileType(file, cb);
  },
});

module.exports = upload;
