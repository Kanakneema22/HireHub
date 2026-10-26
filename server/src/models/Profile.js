const mongoose = require("mongoose");

const educationSchema = new mongoose.Schema(
  {
    level: { type: String, trim: true, maxlength: 80 },
    institute: { type: String, trim: true, maxlength: 120 },
    year: { type: Number, min: 1900, max: 2100, default: null },
    percentage: { type: Number, min: 0, max: 100, default: null },
  },
  { _id: false },
);

const experienceSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 100 },
    company: { type: String, trim: true, maxlength: 120 },
    years: { type: Number, min: 0, max: 60, default: null },
  },
  { _id: false },
);

const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    phone: { type: String, trim: true, maxlength: 25, default: "" },
    location: { type: String, trim: true, maxlength: 120, default: "" },
    headline: { type: String, trim: true, maxlength: 140, default: "" },
    bio: { type: String, trim: true, maxlength: 1500, default: "" },
    skills: { type: [String], default: [] },
    education: { type: [educationSchema], default: [] },
    experience: { type: [experienceSchema], default: [] },
    photoStorageKey: { type: String, default: "" },
    photoData: { type: Buffer, select: false },
    photoMimeType: { type: String, default: "" },
    photoFileName: { type: String, default: "" },
    resumeStorageKey: { type: String, default: "" },
    resumeData: { type: Buffer, select: false },
    resumeMimeType: { type: String, default: "" },
    resumeFileName: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Profile", profileSchema);
