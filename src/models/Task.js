const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  // assignedMemberId stores the _id (as ObjectId) of the team member subdocument
  // (we won't reference a separate collection; we'll validate membership on create/update)
  assignedMemberId: { type: mongoose.Schema.Types.ObjectId, default: null },
  assignedMemberName: { type: String, default: "Unassigned" }, // convenient denormalized
  priority: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium",
  },
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Done"],
    default: "Pending",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

// Update updatedAt on save
TaskSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Task", TaskSchema);
