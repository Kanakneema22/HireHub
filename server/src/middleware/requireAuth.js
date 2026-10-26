const User = require("../models/User");
const { getTokenFromRequest, verifyToken } = require("../utils/authSecurity");

async function requireAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return res.status(401).json({ success: false, message: "Please log in to continue." });
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ success: false, message: "Your session is no longer valid. Please log in again." });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Your session is invalid or has expired. Please log in again." });
  }
}

module.exports = requireAuth;
