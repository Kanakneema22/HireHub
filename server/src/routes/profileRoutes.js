const express = require("express");
const { randomUUID } = require("node:crypto");
const expressRaw = express.raw;
const Profile = require("../models/Profile");
const User = require("../models/User");
const requireAuth = require("../middleware/requireAuth");
const { deleteObject, getObject, isObjectStorageConfigured, putObject } = require("../storage/objectStorage");

const router = express.Router();
router.use(requireAuth);

const photoTypes = ["image/jpeg", "image/png", "image/webp"];
const resumeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function safeName(value, fallback) {
  const name = typeof value === "string" ? decodeURIComponent(value).replace(/[\\/\r\n"]/g, "").trim() : "";
  return (name || fallback).slice(0, 160);
}

function publicProfile(profile, user) {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    phone: profile.phone,
    location: profile.location,
    headline: profile.headline,
    bio: profile.bio,
    skills: profile.skills,
    education: profile.education,
    experience: profile.experience,
    photo: profile.photoFileName ? { fileName: profile.photoFileName, mimeType: profile.photoMimeType } : null,
    resume: profile.resumeFileName ? { fileName: profile.resumeFileName, mimeType: profile.resumeMimeType } : null,
  };
}

async function saveProfileFile(profile, kind, bytes, mimeType, fileName) {
  const storageField = kind + "StorageKey";
  const dataField = kind + "Data";
  const oldKey = profile[storageField];
  const useObjectStorage = isObjectStorageConfigured();
  if (!useObjectStorage && process.env.NODE_ENV === "production") throw new Error("Object storage is not configured for production uploads.");
  if (useObjectStorage) {
    const key = "profiles/" + String(profile.user) + "/" + kind + "-" + randomUUID();
    await putObject(key, bytes, mimeType);
    profile[storageField] = key;
    profile[dataField] = undefined;
  } else {
    if (oldKey) throw new Error("Object storage is required to replace this stored file.");
    profile[storageField] = "";
    profile[dataField] = bytes;
  }
  profile[kind + "MimeType"] = mimeType;
  profile[kind + "FileName"] = fileName;
  await profile.save();
  if (oldKey && oldKey !== profile[storageField]) {
    deleteObject(oldKey).catch((error) => console.error("Remove replaced profile object error:", error.message));
  }
}

async function removeProfileFile(profile, kind) {
  const storageField = kind + "StorageKey";
  const oldKey = profile[storageField];
  profile[storageField] = "";
  profile[kind + "Data"] = undefined;
  profile[kind + "MimeType"] = "";
  profile[kind + "FileName"] = "";
  await profile.save();
  if (oldKey) deleteObject(oldKey).catch((error) => console.error("Remove profile object error:", error.message));
}

async function readProfileFile(profile, kind) {
  const key = profile[kind + "StorageKey"];
  if (key) return getObject(key);
  return profile[kind + "Data"];
}
async function findOrCreateProfile(userId) {
  let profile = await Profile.findOne({ user: userId });
  if (!profile) profile = await Profile.create({ user: userId });
  return profile;
}

router.get("/", async (req, res) => {
  try {
    const profile = await findOrCreateProfile(req.user._id);
    res.json({ success: true, data: publicProfile(profile, req.user) });
  } catch (error) {
    console.error("Fetch profile error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load your profile." });
  }
});

router.patch("/", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const profile = await findOrCreateProfile(req.user._id);
    const allowedText = ["phone", "location", "headline", "bio"];
    for (const field of allowedText) {
      if (field in body) {
        if (typeof body[field] !== "string") return res.status(400).json({ success: false, message: field + " must be text." });
        profile[field] = body[field].trim();
      }
    }
    if ("name" in body) {
      if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 80) {
        return res.status(400).json({ success: false, message: "Name must be between 2 and 80 characters." });
      }
      req.user.name = body.name.trim();
      await req.user.save();
    }
    if ("skills" in body) {
      if (!Array.isArray(body.skills) || body.skills.some((skill) => typeof skill !== "string")) {
        return res.status(400).json({ success: false, message: "Skills must be a list of text values." });
      }
      profile.skills = body.skills.map((skill) => skill.trim()).filter(Boolean).slice(0, 30);
    }
    if ("education" in body) {
      if (!Array.isArray(body.education) || body.education.length > 10) return res.status(400).json({ success: false, message: "Add up to 10 education entries." });
      for (const item of body.education) {
        if (typeof item.level !== "string" || typeof item.institute !== "string") return res.status(400).json({ success: false, message: "Each education entry needs a level and institute." });
        const pct = item.percentage === "" || item.percentage == null ? null : Number(item.percentage);
        const year = item.year === "" || item.year == null ? null : Number(item.year);
        if (pct !== null && (!Number.isFinite(pct) || pct < 0 || pct > 100)) return res.status(400).json({ success: false, message: "Education percentage must be between 0 and 100." });
        if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2100)) return res.status(400).json({ success: false, message: "Enter a valid education year." });
      }
      profile.education = body.education.map((item) => ({
        level: item.level.trim(),
        institute: item.institute.trim(),
        year: item.year === "" || item.year == null ? null : Number(item.year),
        percentage: item.percentage === "" || item.percentage == null ? null : Number(item.percentage),
      }));
    }
    if ("experience" in body) {
      if (!Array.isArray(body.experience) || body.experience.length > 10) return res.status(400).json({ success: false, message: "Add up to 10 experience entries." });
      for (const item of body.experience) {
        if (typeof item.title !== "string" || typeof item.company !== "string") return res.status(400).json({ success: false, message: "Each experience entry needs a role and company." });
        if (item.years !== "" && item.years != null && (!Number.isFinite(Number(item.years)) || Number(item.years) < 0 || Number(item.years) > 60)) return res.status(400).json({ success: false, message: "Experience years must be between 0 and 60." });
      }
      profile.experience = body.experience.map((item) => ({
        title: item.title.trim(),
        company: item.company.trim(),
        years: item.years === "" || item.years == null ? null : Number(item.years),
      }));
    }

    for (const field of allowedText) {
      const maximum = field === "bio" ? 1500 : field === "headline" ? 140 : field === "phone" ? 25 : 120;
      if (profile[field].length > maximum) return res.status(400).json({ success: false, message: field + " is too long." });
    }
    await profile.save();
    res.json({ success: true, data: publicProfile(profile, req.user) });
  } catch (error) {
    console.error("Update profile error:", error.message);
    res.status(500).json({ success: false, message: "Unable to save your profile." });
  }
});

router.put(
  "/photo",
  expressRaw({ type: photoTypes, limit: "3mb" }),
  async (req, res) => {
    try {
      const mimeType = req.get("content-type") || "";
      if (!photoTypes.includes(mimeType)) return res.status(415).json({ success: false, message: "Choose a JPEG, PNG, or WebP photo." });
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ success: false, message: "Choose a photo file." });
      const profile = await findOrCreateProfile(req.user._id);
      await saveProfileFile(profile, "photo", req.body, mimeType, safeName(req.get("x-file-name"), "profile-photo"));
      res.json({ success: true, data: publicProfile(profile, req.user) });
    } catch (error) {
      console.error("Save profile photo error:", error.message);
      res.status(error.type === "entity.too.large" ? 413 : error.message.includes("Object storage is") ? 503 : 500).json({ success: false, message: error.type === "entity.too.large" ? "Photo must be 3 MB or smaller." : error.message.includes("Object storage is") ? error.message : "Unable to save your photo." });
    }
  },
);

router.get("/photo", async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id }).select("+photoData");
    if (!profile) return res.status(404).json({ success: false, message: "No profile photo found." });
    const photoData = await readProfileFile(profile, "photo");
    if (!photoData) return res.status(404).json({ success: false, message: "No profile photo found." });
    res.set({ "Content-Type": profile.photoMimeType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    res.send(photoData);
  } catch (error) {
    console.error("Fetch profile photo error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load your photo." });
  }
});

router.delete("/photo", async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });
    await removeProfileFile(profile, "photo");
    res.json({ success: true, data: publicProfile(profile, req.user) });
  } catch (error) {
    console.error("Delete profile photo error:", error.message);
    res.status(500).json({ success: false, message: "Unable to remove your photo." });
  }
});

router.put(
  "/resume",
  expressRaw({ type: resumeTypes, limit: "5mb" }),
  async (req, res) => {
    try {
      const mimeType = req.get("content-type") || "";
      if (!resumeTypes.includes(mimeType)) return res.status(415).json({ success: false, message: "Choose a PDF, DOC, or DOCX resume." });
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ success: false, message: "Choose a resume file." });
      const profile = await findOrCreateProfile(req.user._id);
      await saveProfileFile(profile, "resume", req.body, mimeType, safeName(req.get("x-file-name"), "resume"));
      res.json({ success: true, data: publicProfile(profile, req.user) });
    } catch (error) {
      console.error("Save resume error:", error.message);
      res.status(error.type === "entity.too.large" ? 413 : error.message.includes("Object storage is") ? 503 : 500).json({ success: false, message: error.type === "entity.too.large" ? "Resume must be 5 MB or smaller." : error.message.includes("Object storage is") ? error.message : "Unable to save your resume." });
    }
  },
);

router.get("/resume", async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id }).select("+resumeData");
    if (!profile) return res.status(404).json({ success: false, message: "No resume found." });
    const resumeData = await readProfileFile(profile, "resume");
    if (!resumeData) return res.status(404).json({ success: false, message: "No resume found." });
    res.set({ "Content-Type": profile.resumeMimeType, "Content-Disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(profile.resumeFileName || "resume"), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    res.send(resumeData);
  } catch (error) {
    console.error("Fetch resume error:", error.message);
    res.status(500).json({ success: false, message: "Unable to download your resume." });
  }
});

router.delete("/resume", async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });
    await removeProfileFile(profile, "resume");
    res.json({ success: true, data: publicProfile(profile, req.user) });
  } catch (error) {
    console.error("Delete resume error:", error.message);
    res.status(500).json({ success: false, message: "Unable to remove your resume." });
  }
});

module.exports = router;
