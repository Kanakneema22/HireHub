const express = require("express");
const mongoose = require("mongoose");
const Application = require("../models/Application");
const Job = require("../models/Job");
const Profile = require("../models/Profile");
const Notification = require("../models/Notification");
const requireAuth = require("../middleware/requireAuth");
const { getObject } = require("../storage/objectStorage");

const router = express.Router();
router.use(requireAuth);

function requireEmployer(req, res, next) {
  if (req.user.role !== "employer") return res.status(403).json({ success: false, message: "Employer account required." });
  next();
}

function createProfileSnapshot(user, profile) {
  return {
    name: user.name, email: user.email, phone: profile?.phone || "", location: profile?.location || "",
    headline: profile?.headline || "", bio: profile?.bio || "", skills: profile?.skills || [],
    education: profile?.education || [], experience: profile?.experience || [], resumeFileName: profile?.resumeFileName || "",
  };
}
function missingApplicationProfileFields(user, profile) {
  const missing = [];
  if (!user.name?.trim()) missing.push("Full name");
  if (!user.email?.trim()) missing.push("Email address");
  if (!profile?.phone?.trim()) missing.push("Phone number");
  if (!profile?.location?.trim()) missing.push("Location");
  if (!profile?.headline?.trim()) missing.push("Professional headline");
  if (!profile?.skills?.some((skill) => skill.trim())) missing.push("At least one skill");
  if (!profile?.education?.some((item) => item.level?.trim() && item.institute?.trim())) missing.push("Education (qualification and institute)");
  if (!profile?.resumeFileName || !(profile.resumeStorageKey || profile.resumeData?.length)) missing.push("Resume");
  return missing;
}
function requireJobSeeker(req, res, next) {
  if (req.user.role !== "job-seeker") {
    return res.status(403).json({ success: false, message: "Only job seeker accounts can apply to jobs." });
  }
  next();
}

router.patch("/manage/:applicationId/status", requireEmployer, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const status = req.body?.status;
    if (!mongoose.isValidObjectId(applicationId)) return res.status(400).json({ success: false, message: "Invalid application ID." });
    if (!["reviewing", "accepted", "declined"].includes(status)) return res.status(400).json({ success: false, message: "Choose a valid application status." });
    const application = await Application.findById(applicationId).populate("job", "employer title company");
    if (!application || String(application.job?.employer) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }
    if (!["submitted", "reviewing"].includes(application.status)) {
      return res.status(409).json({ success: false, message: "This application already has a final status." });
    }
    const previousStatus = application.status;
    application.status = status;
    await application.save();
    if (previousStatus !== status) {
      const roleLabel = [application.job?.title, application.job?.company].filter(Boolean).join(" at ").slice(0, 100) || "this role";
      const messages = {
        reviewing: "The hiring team is reviewing your application for " + roleLabel + ".",
        accepted: "Congratulations! Your application for " + roleLabel + " was accepted. The team may contact you with next steps.",
        declined: "Thank you for applying for " + roleLabel + ". The team has decided not to move forward this time. Keep exploring your next opportunity.",
      };
      Notification.create({
        user: application.applicant,
        application: application._id,
        job: application.job._id,
        type: "application-status",
        message: messages[status],
      }).catch((notificationError) => console.error("Create application notification error:", notificationError.message));
    }
    res.json({ success: true, data: application });
  } catch (error) {
    console.error("Update application status error:", error.message);
    res.status(500).json({ success: false, message: "Unable to update the application." });
  }
});
router.get("/mine", requireJobSeeker, async (req, res) => {
  try {
    const applications = await Application.find({ applicant: req.user._id })
      .sort({ updatedAt: -1 })
      .populate("job", "title company location type workplace salary")
      .lean();
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error("Fetch applications error:", error.message);
    res.status(500).json({ success: false, message: "Unable to fetch your applications." });
  }
});

router.post("/:jobId", requireJobSeeker, async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID." });
    }
    const job = await Job.findOne({ _id: jobId, isActive: true }).select("_id");
    if (!job) return res.status(404).json({ success: false, message: "This job is no longer available." });

    const coverLetter = typeof req.body?.coverLetter === "string" ? req.body.coverLetter.trim() : "";
    if (coverLetter.length > 2000) {
      return res.status(400).json({ success: false, message: "Cover letter must be 2,000 characters or fewer." });
    }

    const profile = await Profile.findOne({ user: req.user._id }).select("+resumeData");
    const missingFields = missingApplicationProfileFields(req.user, profile);
    if (missingFields.length) {
      return res.status(400).json({ success: false, message: "Complete your required profile details and add a resume before applying.", missingFields });
    }
    const profileSnapshot = createProfileSnapshot(req.user, profile);
    const existing = await Application.findOne({ job: jobId, applicant: req.user._id });
    if (existing && existing.status !== "withdrawn") {
      return res.status(409).json({ success: false, message: "You have already applied to this job." });
    }
    if (existing) {
      existing.coverLetter = coverLetter;
      existing.profileSnapshot = profileSnapshot;
      existing.status = "submitted";
      await existing.save();
      return res.status(200).json({ success: true, data: existing });
    }

    const application = await Application.create({ job: jobId, applicant: req.user._id, coverLetter, profileSnapshot });
    res.status(201).json({ success: true, data: application });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: "You have already applied to this job." });
    console.error("Submit application error:", error.message);
    res.status(500).json({ success: false, message: "Unable to submit your application." });
  }
});

router.get("/:applicationId/photo", async (req, res) => {
  try {
    const { applicationId } = req.params;
    if (!mongoose.isValidObjectId(applicationId)) return res.status(400).json({ success: false, message: "Invalid application ID." });
    const application = await Application.findById(applicationId).select("applicant job").populate("job", "employer");
    if (!application) return res.status(404).json({ success: false, message: "Application not found." });
    const isApplicant = String(application.applicant) === String(req.user._id);
    const isOwningEmployer = req.user.role === "employer" && String(application.job?.employer) === String(req.user._id);
    if (!isApplicant && !isOwningEmployer) return res.status(404).json({ success: false, message: "Photo not found." });
    const profile = await Profile.findOne({ user: application.applicant }).select("photoStorageKey photoMimeType +photoData");
    if (!profile) return res.status(404).json({ success: false, message: "No profile photo found." });
    const photoData = profile.photoStorageKey ? await getObject(profile.photoStorageKey) : profile.photoData;
    if (!photoData) return res.status(404).json({ success: false, message: "No profile photo found." });
    res.set({ "Content-Type": profile.photoMimeType || "application/octet-stream", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    res.send(photoData);
  } catch (error) {
    console.error("Fetch applicant photo error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load this applicant photo." });
  }
});

router.get("/:applicationId/resume", async (req, res) => {
  try {
    const { applicationId } = req.params;
    if (!mongoose.isValidObjectId(applicationId)) return res.status(400).json({ success: false, message: "Invalid application ID." });
    const application = await Application.findById(applicationId).select("applicant job").populate("job", "employer title company");
    if (!application) return res.status(404).json({ success: false, message: "Application not found." });
    const isApplicant = String(application.applicant) === String(req.user._id);
    const isOwningEmployer = req.user.role === "employer" && String(application.job?.employer) === String(req.user._id);
    if (!isApplicant && !isOwningEmployer) return res.status(404).json({ success: false, message: "Resume not found." });

    const profile = await Profile.findOne({ user: application.applicant }).select("+resumeData");
    if (!profile) return res.status(404).json({ success: false, message: "No resume is attached to this profile." });
    const resumeData = profile.resumeStorageKey ? await getObject(profile.resumeStorageKey) : profile.resumeData;
    if (!resumeData) return res.status(404).json({ success: false, message: "No resume is attached to this profile." });
    res.set({
      "Content-Type": profile.resumeMimeType || "application/octet-stream",
      "Content-Disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(profile.resumeFileName || "resume"),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.send(resumeData);
  } catch (error) {
    console.error("Download applicant resume error:", error.message);
    res.status(500).json({ success: false, message: "Unable to download this resume." });
  }
});
router.delete("/history/:applicationId", requireJobSeeker, async (req, res) => {
  try {
    const { applicationId } = req.params;
    if (!mongoose.isValidObjectId(applicationId)) return res.status(400).json({ success: false, message: "Invalid application ID." });
    const application = await Application.findOne({ _id: applicationId, applicant: req.user._id, status: "withdrawn" });
    if (!application) return res.status(404).json({ success: false, message: "Withdrawn application not found." });
    await application.deleteOne();
    res.json({ success: true, message: "Application removed from history." });
  } catch (error) {
    console.error("Delete withdrawn application error:", error.message);
    res.status(500).json({ success: false, message: "Unable to remove this application from history." });
  }
});
router.delete("/:applicationId", requireJobSeeker, async (req, res) => {
  try {
    const { applicationId } = req.params;
    if (!mongoose.isValidObjectId(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid application ID." });
    }
    const application = await Application.findOne({ _id: applicationId, applicant: req.user._id });
    if (!application) return res.status(404).json({ success: false, message: "Application not found." });
    if (application.status === "withdrawn") {
      return res.status(409).json({ success: false, message: "This application has already been withdrawn." });
    }
    application.status = "withdrawn";
    await application.save();
    res.json({ success: true, data: application });
  } catch (error) {
    console.error("Withdraw application error:", error.message);
    res.status(500).json({ success: false, message: "Unable to withdraw your application." });
  }
});

module.exports = router;



