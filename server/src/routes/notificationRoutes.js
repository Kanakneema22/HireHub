const express = require("express");
const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const [items, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(30)
        .populate("job", "title company")
        .lean(),
      Notification.countDocuments({ user: req.user._id, readAt: null }),
    ]);
    res.json({ success: true, data: { items: items.filter((item) => item.job), unreadCount } });
  } catch (error) {
    console.error("Fetch notifications error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load notifications." });
  }
});

router.patch("/read-all", async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
    res.json({ success: true, message: "Notifications marked as read." });
  } catch (error) {
    console.error("Mark notifications read error:", error.message);
    res.status(500).json({ success: false, message: "Unable to update notifications." });
  }
});

router.patch("/:notificationId/read", async (req, res) => {
  try {
    const { notificationId } = req.params;
    if (!mongoose.isValidObjectId(notificationId)) return res.status(400).json({ success: false, message: "Invalid notification ID." });
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: req.user._id },
      { $set: { readAt: new Date() } },
      { new: true },
    );
    if (!notification) return res.status(404).json({ success: false, message: "Notification not found." });
    res.json({ success: true, data: notification });
  } catch (error) {
    console.error("Mark notification read error:", error.message);
    res.status(500).json({ success: false, message: "Unable to update this notification." });
  }
});

router.delete("/:notificationId", async (req, res) => {
  try {
    const { notificationId } = req.params;
    if (!mongoose.isValidObjectId(notificationId)) return res.status(400).json({ success: false, message: "Invalid notification ID." });
    const notification = await Notification.findOneAndDelete({ _id: notificationId, user: req.user._id });
    if (!notification) return res.status(404).json({ success: false, message: "Notification not found." });
    res.json({ success: true, message: "Notification deleted." });
  } catch (error) {
    console.error("Delete notification error:", error.message);
    res.status(500).json({ success: false, message: "Unable to delete this notification." });
  }
});
module.exports = router;
