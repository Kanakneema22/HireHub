const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Profile = require("../src/models/Profile");
const SavedJob = require("../src/models/SavedJob");
const Notification = require("../src/models/Notification");

test("profile validates education percentage bounds", async () => {
  const profile = new Profile({
    user: new mongoose.Types.ObjectId(),
    education: [{ level: "Bachelor", institute: "Sample University", percentage: 101 }],
  });
  await assert.rejects(profile.validate(), (error) => {
    assert.match(error.message, /percentage/);
    return true;
  });
});

test("saved jobs enforce owner and job references with unique pairs", async () => {
  const record = new SavedJob({ user: new mongoose.Types.ObjectId(), job: new mongoose.Types.ObjectId() });
  await record.validate();
  assert.ok(SavedJob.schema.indexes().some(([keys, options]) => keys.user === 1 && keys.job === 1 && options.unique));
});

test("notifications require a user, application, job and message", async () => {
  const valid = new Notification({
    user: new mongoose.Types.ObjectId(),
    application: new mongoose.Types.ObjectId(),
    job: new mongoose.Types.ObjectId(),
    type: "application-status",
    message: "Your application is now in review.",
  });
  await valid.validate();
  assert.equal(valid.readAt, null);
  const invalid = new Notification({ type: "wrong", message: "" });
  await assert.rejects(invalid.validate());
});
