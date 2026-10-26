const express = require("express");
const mongoose = require("mongoose");
const Job = require("../models/Job");
const SavedJob = require("../models/SavedJob");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();
router.use(requireAuth);

function requireJobSeeker(req, res, next) {
  if (req.user.role !== "job-seeker") return res.status(403).json({ success: false, message: "Only job seekers can save jobs." });
  next();
}

router.get("/", requireJobSeeker, async (req, res) => {
  try {
    const savedJobs = await SavedJob.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("job", "title company location type workplace salary posted color initials skills category experience isActive")
      .lean();
    res.json({ success: true, data: savedJobs.filter((item) => item.job) });
  } catch (error) {
    console.error("Fetch saved jobs error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load saved jobs." });
  }
});

router.post("/:jobId", requireJobSeeker, async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!mongoose.isValidObjectId(jobId)) return res.status(400).json({ success: false, message: "Invalid job ID." });
    const job = await Job.findOne({ _id: jobId, isActive: true }).select("_id");
    if (!job) return res.status(404).json({ success: false, message: "This job is no longer available." });
    const saved = await SavedJob.findOneAndUpdate(
      { user: req.user._id, job: jobId },
      { $setOnInsert: { user: req.user._id, job: jobId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).populate("job", "title company location type workplace salary posted color initials skills category experience isActive");
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    if (error.code === 11000) {
      const saved = await SavedJob.findOne({ user: req.user._id, job: req.params.jobId }).populate("job", "title company location type workplace salary posted color initials skills category experience isActive");
      return res.status(200).json({ success: true, data: saved });
    }
    console.error("Save job error:", error.message);
    res.status(500).json({ success: false, message: "Unable to save this job." });
  }
});

router.delete("/:jobId", requireJobSeeker, async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!mongoose.isValidObjectId(jobId)) return res.status(400).json({ success: false, message: "Invalid job ID." });
    await SavedJob.deleteOne({ user: req.user._id, job: jobId });
    res.json({ success: true, message: "Job removed from saved jobs." });
  } catch (error) {
    console.error("Unsave job error:", error.message);
    res.status(500).json({ success: false, message: "Unable to remove this saved job." });
  }
});

module.exports = router;
