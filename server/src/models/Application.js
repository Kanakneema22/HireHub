const mongoose = require("mongoose");

const educationSnapshotSchema = new mongoose.Schema(
  {
    level: String,
    institute: String,
    year: Number,
    percentage: Number,
  },
  { _id: false },
);

const experienceSnapshotSchema = new mongoose.Schema(
  {
    title: String,
    company: String,
    years: Number,
  },
  { _id: false },
);

const profileSnapshotSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    location: String,
    headline: String,
    bio: String,
    skills: { type: [String], default: [] },
    education: { type: [educationSnapshotSchema], default: [] },
    experience: { type: [experienceSnapshotSchema], default: [] },
    resumeFileName: String,
  },
  { _id: false },
);

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    coverLetter: { type: String, trim: true, maxlength: 2000, default: "" },
    profileSnapshot: { type: profileSnapshotSchema, default: () => ({}) },
    status: { type: String, enum: ["submitted", "reviewing", "accepted", "declined", "withdrawn"], default: "submitted" },
  },
  { timestamps: true },
);

applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

module.exports = mongoose.model("Application", applicationSchema);
