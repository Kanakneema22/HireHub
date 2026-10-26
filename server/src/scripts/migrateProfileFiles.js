require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Profile = require("../models/Profile");
const { isObjectStorageConfigured, putObject } = require("../storage/objectStorage");

async function migrateProfileFiles() {
  if (!isObjectStorageConfigured()) {
    throw new Error("Configure all S3_* object-storage variables before migrating profile files.");
  }
  const removeSource = process.argv.includes("--remove-source");
  await connectDB();
  const profiles = await Profile.find({
    $or: [
      { photoData: { $exists: true, $ne: null } },
      { resumeData: { $exists: true, $ne: null } },
    ],
  }).select("+photoData +resumeData");
  let migrated = 0;
  let cleaned = 0;

  for (const profile of profiles) {
    let changed = false;
    for (const kind of ["photo", "resume"]) {
      const dataField = kind + "Data";
      const keyField = kind + "StorageKey";
      const data = profile[dataField];
      if (data && !profile[keyField]) {
        const key = "profiles/" + String(profile.user) + "/" + kind + "-" + String(profile._id);
        await putObject(key, data, profile[kind + "MimeType"] || "application/octet-stream");
        profile[keyField] = key;
        migrated += 1;
        changed = true;
      }
      if (removeSource && profile[keyField] && profile[dataField]) {
        profile[dataField] = undefined;
        cleaned += 1;
        changed = true;
      }
    }
    if (changed) await profile.save();
  }
  console.log("Profile file objects copied:", migrated);
  if (removeSource) console.log("Source file buffers removed after successful copies:", cleaned);
  else console.log("MongoDB source files were retained. Verify files before rerunning with --remove-source.");
}

migrateProfileFiles()
  .catch((error) => {
    console.error("Profile file migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });
