const express = require("express");
const User = require("../models/User");
const requireAuth = require("../middleware/requireAuth");
const {
  clearAuthCookie,
  createToken,
  getJwtSecret,
  hashPassword,
  setAuthCookie,
  verifyPassword,
} = require("../utils/authSecurity");

const router = express.Router();

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function issueSession(res, user) {
  setAuthCookie(res, createToken(user._id));
  return res.json({ success: true, data: { user: publicUser(user) } });
}

function serverConfigError(res) {
  return res
    .status(500)
    .json({
      success: false,
      message:
        "Server authentication is not configured. Set a random JWT_SECRET in server/.env.",
    });
}

router.post("/register", async (req, res) => {
  try {
    getJwtSecret();
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const role = body.role || "job-seeker";
    if (name.length < 2 || name.length > 80)
      return res
        .status(400)
        .json({
          success: false,
          message: "Name must be between 2 and 80 characters.",
        });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      return res
        .status(400)
        .json({ success: false, message: "Enter a valid email address." });
    if (password.length < 8 || password.length > 128)
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be between 8 and 128 characters.",
        });
    if (!["job-seeker", "employer"].includes(role))
      return res
        .status(400)
        .json({ success: false, message: "Choose a valid account type." });

    const passwordHash = await hashPassword(password);
    const user = await User.create({ name, email, passwordHash, role });
    return issueSession(res, user);
  } catch (error) {
    if (error.message.includes("JWT_SECRET")) return serverConfigError(res);
    if (error.code === 11000)
      return res
        .status(409)
        .json({
          success: false,
          message: "An account with this email already exists.",
        });
    console.error("Registration error:", error.message);
    return res
      .status(500)
      .json({
        success: false,
        message: "Unable to create your account right now.",
      });
  }
});

router.post("/login", async (req, res) => {
  try {
    getJwtSecret();
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || password.length > 128)
      return res
        .status(401)
        .json({ success: false, message: "Email or password is incorrect." });
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await verifyPassword(password, user.passwordHash)))
      return res
        .status(401)
        .json({ success: false, message: "Email or password is incorrect." });
    return issueSession(res, user);
  } catch (error) {
    if (error.message.includes("JWT_SECRET")) return serverConfigError(res);
    console.error("Login error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Unable to log in right now." });
  }
});

router.get("/me", requireAuth, (req, res) =>
  res.json({ success: true, data: { user: publicUser(req.user) } }),
);
router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: "You have been logged out." });
});

module.exports = router;
