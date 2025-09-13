const User = require("../models/User");
const Otp = require("../models/Otp");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const fs = require("fs");

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// Signup Logic
exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Please fill all required fields" });
    }

    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res
        .status(400)
        .json({ message: "Username or email already taken" });
    }

    const user = await User.create({ username, email, password });
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// SignIn Logic
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Send OTP for password reset
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    //const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digits
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await Otp.deleteMany({ email }); // Remove old OTPs
    await Otp.create({ email, otp: otpCode, expiresAt });

    // Gmail transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Ezy Cook Recipe App" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP code is ${otpCode}. It will expire in 5 minutes.`,
    });

    res.json({ message: "OTP sent to email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Verify OTP and reset password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const otpRecord = await Otp.findOne({ email, otp });

    if (!otpRecord) return res.status(400).json({ message: "Invalid OTP" });
    if (otpRecord.expiresAt < new Date())
      return res.status(400).json({ message: "OTP expired" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    await Otp.deleteMany({ email });

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update profile (with image)
// exports.updateProfile = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     const { name, username, email, phoneNumber } = req.body;

//     if (name) user.name = name;
//     if (username) user.username = username;
//     if (email) user.email = email;
//     if (phoneNumber) user.phoneNumber = phoneNumber;
//     if (req.file) user.profileImage = req.file.path;

//     await user.save();

//     res.json({ message: 'Profile updated', user });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // exclude password
    if (!user) return res.status(404).json({ message: "User not found" });

    // Build full image URL if profileImage exists
    // let fullImageUrl = "";
    // if (user.profileImage) {
    //   fullImageUrl = `${req.protocol}://${req.get("host")}${user.profileImage}`;
    // }

    res.json({
      message: "Profile fetched successfully",
      user: {
        ...user.toObject(),
        profileImage: user.profileImage || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Update profile (with image) - new
exports.updateProfile = async (req, res) => {
  console.log(" === PROFILE UPDATE REQUEST ===");
  console.log(" Request body:", req.body);
  console.log(" Request file:", req.file);
  console.log(" User ID from token:", req.user?.id);
  console.log(" Content-Type:", req.headers["content-type"]);

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log(" User not found for ID:", req.user.id);
      return res.status(404).json({ message: "User not found" });
    }

    console.log(" Found user:", user.username || user.email);

    // Use empty object as fallback if req.body is undefined
    const { name, username, email, phoneNumber } = req.body || {};

    console.log(" Fields to update:", { name, username, email, phoneNumber });

    // Store original values for comparison
    const originalValues = {
      name: user.name,
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profileImage: user.profileImage,
    };

    // Update only if fields exist and are not empty strings
    if (name !== undefined && name !== "") {
      user.name = name;
      console.log(" Updated name:", name);
    }
    if (username !== undefined && username !== "") {
      user.username = username;
      console.log("Updated username:", username);
    }
    if (email !== undefined && email !== "") {
      user.email = email;
      console.log(" Updated email:", email);
    }
    if (phoneNumber !== undefined && phoneNumber !== "") {
      user.phoneNumber = phoneNumber;
      console.log(" Updated phoneNumber:", phoneNumber);
    }

    // Handle profile image
    if (req.file) {
      console.log(" Image file details:");
      console.log("  - Original name:", req.file.originalname);
      console.log("  - Field name:", req.file.fieldname);
      console.log("  - MIME type:", req.file.mimetype);
      console.log("  - Size:", req.file.size, "bytes");
      console.log("  - Saved path:", req.file.path);
      console.log("  - Filename:", req.file.filename);

      // Delete old profile image if exists
      if (user.profileImage && fs.existsSync(user.profileImage)) {
        try {
          fs.unlinkSync(user.profileImage);
          console.log(" Deleted old profile image:", user.profileImage);
        } catch (deleteError) {
          console.log("Could not delete old image:", deleteError.message);
        }
      }

      user.profileImage = req.file.path;
      console.log(" Updated profile image path:", req.file.path);
    } else {
      console.log(" No image file in request");
    }

    // Save user
    console.log(" Saving user to database...");
    await user.save();
    console.log(" User saved successfully");

    // Log what actually changed
    const changes = {};
    if (originalValues.name !== user.name)
      changes.name = { old: originalValues.name, new: user.name };
    if (originalValues.username !== user.username)
      changes.username = { old: originalValues.username, new: user.username };
    if (originalValues.email !== user.email)
      changes.email = { old: originalValues.email, new: user.email };
    if (originalValues.phoneNumber !== user.phoneNumber)
      changes.phoneNumber = {
        old: originalValues.phoneNumber,
        new: user.phoneNumber,
      };
    if (originalValues.profileImage !== user.profileImage)
      changes.profileImage = {
        old: originalValues.profileImage,
        new: user.profileImage,
      };

    console.log(" Changes made:", changes);
    console.log(" === PROFILE UPDATE SUCCESSFUL ===");

    // Return updated user (excluding sensitive data)
    const userResponse = {
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.json({
      message: "Profile updated successfully",
      user: userResponse,
      changes: Object.keys(changes), // Just the field names that changed
    });
  } catch (err) {
    console.error(" Error updating profile:", err);
    console.error(" Error stack:", err.stack);

    // If it's a multer error, provide specific message
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ message: "File too large. Maximum size is 5MB." });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ message: "Unexpected file field." });
    }

    res.status(500).json({
      message: "Error updating profile",
      error: err.message,
      // Include more details in development
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }
};
