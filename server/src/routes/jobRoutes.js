const express = require("express");
const mongoose = require("mongoose");
const Job = require("../models/Job");
const Application = require("../models/Application");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();
const jobTypes = ["Full-time", "Part-time", "Internship", "Contract"];
const workplaces = ["Remote", "Hybrid", "On-site"];
const stringFields = ["title", "company", "location", "salary", "description", "experience", "category"];
const arrayFields = ["responsibilities", "requirements", "skills"];

function requireEmployer(req, res, next) {
  if (req.user.role !== "employer") {
    return res.status(403).json({ success: false, message: "Employer account required." });
  }
  next();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
}

function readJobFields(body, partial = false) {
  const fields = {};
  for (const key of stringFields) {
    if (!(key in body)) continue;
    if (typeof body[key] !== "string") throw new Error(key + " must be text.");
    fields[key] = body[key].trim();
  }
  for (const key of arrayFields) {
    if (!(key in body)) continue;
    if (!Array.isArray(body[key]) || body[key].some((item) => typeof item !== "string")) {
      throw new Error(key + " must be a list of text values.");
    }
    fields[key] = body[key].map((item) => item.trim()).filter(Boolean).slice(0, 30);
  }
  if ("type" in body) {
    if (!jobTypes.includes(body.type)) throw new Error("Choose a valid employment type.");
    fields.type = body.type;
  }
  if ("workplace" in body) {
    if (!workplaces.includes(body.workplace)) throw new Error("Choose a valid workplace.");
    fields.workplace = body.workplace;
  }
  if (!partial) {
    for (const key of ["title", "company", "location", "description"]) {
      if (!fields[key]) throw new Error(key + " is required.");
      if (fields[key].length > (key === "description" ? 5000 : 120)) throw new Error(key + " is too long.");
    }
    if (!fields.type) fields.type = "Full-time";
    if (!fields.workplace) fields.workplace = "On-site";
  }
  return fields;
}

function isOwner(job, userId) {
  return job && String(job.employer) === String(userId);
}

router.get("/", async (req, res) => {
  try {
    const { q = "", location = "", type = "", workplace = "" } = req.query;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const filter = { isActive: true };
    if (q.trim()) {
      const search = new RegExp(escapeRegex(q.trim()), "i");
      filter.$or = [{ title: search }, { company: search }, { description: search }, { skills: search }, { category: search }];
    }
    if (location.trim()) filter.location = new RegExp(escapeRegex(location.trim()), "i");
    if (type) filter.type = type;
    if (workplace) filter.workplace = workplace;

    const [jobs, total] = await Promise.all([
      Job.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Job.countDocuments(filter),
    ]);
    res.json({ success: true, data: jobs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Fetch jobs error:", error.message);
    res.status(500).json({ success: false, message: "Unable to fetch jobs." });
  }
});

router.get("/mine", requireAuth, requireEmployer, async (req, res) => {
  try {
    const jobs = await Job.find({ employer: req.user._id }).sort({ updatedAt: -1 }).lean();
    const ids = jobs.map((job) => job._id);
    const counts = await Application.aggregate([
      { $match: { job: { $in: ids }, status: { $ne: "withdrawn" } } },
      { $group: { _id: "$job", count: { $sum: 1 } } },
    ]);
    const countByJob = new Map(counts.map((item) => [String(item._id), item.count]));
    res.json({ success: true, data: jobs.map((job) => ({ ...job, applicationCount: countByJob.get(String(job._id)) || 0 })) });
  } catch (error) {
    console.error("Fetch employer jobs error:", error.message);
    res.status(500).json({ success: false, message: "Unable to fetch your job posts." });
  }
});

router.post("/", requireAuth, requireEmployer, async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const fields = readJobFields(body);
    const initials = fields.company.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    const job = await Job.create({ ...fields, employer: req.user._id, isActive: true, initials });
    res.status(201).json({ success: true, data: job });
  } catch (error) {
    if (error.name === "ValidationError" || error.message.endsWith("is required.") || error.message.endsWith("is too long.") || error.message.endsWith("must be text.") || error.message.endsWith("must be a list of text values.") || error.message.startsWith("Choose a valid")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Create job error:", error.message);
    res.status(500).json({ success: false, message: "Unable to create the job post." });
  }
});

router.get("/manage/:jobId", requireAuth, requireEmployer, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.jobId)) return res.status(400).json({ success: false, message: "Invalid job ID." });
    const job = await Job.findById(req.params.jobId).lean();
    if (!isOwner(job, req.user._id)) return res.status(404).json({ success: false, message: "Job post not found." });
    res.json({ success: true, data: job });
  } catch (error) {
    console.error("Load job for editing error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load this job post." });
  }
});

router.patch("/manage/:jobId", requireAuth, requireEmployer, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.jobId)) return res.status(400).json({ success: false, message: "Invalid job ID." });
    const job = await Job.findById(req.params.jobId);
    if (!isOwner(job, req.user._id)) return res.status(404).json({ success: false, message: "Job post not found." });
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const fields = readJobFields(body, true);
    if ("isActive" in body) {
      if (typeof body.isActive !== "boolean") return res.status(400).json({ success: false, message: "isActive must be true or false." });
      fields.isActive = body.isActive;
    }
    Object.assign(job, fields);
    await job.save();
    res.json({ success: true, data: job });
  } catch (error) {
    if (error.name === "ValidationError" || error.message.endsWith("must be text.") || error.message.endsWith("must be a list of text values.") || error.message.startsWith("Choose a valid")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Update job error:", error.message);
    res.status(500).json({ success: false, message: "Unable to update this job post." });
  }
});

router.delete("/manage/:jobId", requireAuth, requireEmployer, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.jobId)) return res.status(400).json({ success: false, message: "Invalid job ID." });
    const job = await Job.findById(req.params.jobId);
    if (!isOwner(job, req.user._id)) return res.status(404).json({ success: false, message: "Job post not found." });
    job.isActive = false;
    await job.save();
    res.json({ success: true, data: job, message: "Job post closed." });
  } catch (error) {
    console.error("Close job error:", error.message);
    res.status(500).json({ success: false, message: "Unable to close this job post." });
  }
});

router.get("/manage/:jobId/applications", requireAuth, requireEmployer, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.jobId)) return res.status(400).json({ success: false, message: "Invalid job ID." });
    const job = await Job.findById(req.params.jobId).select("_id employer");
    if (!isOwner(job, req.user._id)) return res.status(404).json({ success: false, message: "Job post not found." });
    const applications = await Application.find({ job: job._id, status: { $ne: "withdrawn" } })
      .sort({ createdAt: -1 })
      .populate("applicant", "name email")
      .lean();
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error("Fetch job applicants error:", error.message);
    res.status(500).json({ success: false, message: "Unable to fetch applicants." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid job ID." });
    const job = await Job.findOne({ _id: req.params.id, isActive: true }).lean();
    if (!job) return res.status(404).json({ success: false, message: "Job not found." });
    res.json({ success: true, data: job });
  } catch (error) {
    console.error("Fetch job details error:", error.message);
    res.status(500).json({ success: false, message: "Unable to fetch job details." });
  }
});

module.exports = router;

