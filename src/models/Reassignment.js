const mongoose = require("mongoose");

const ReassignmentSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },

  fromMemberId: { type: mongoose.Schema.Types.ObjectId, default: null },
  fromMemberName: { type: String, default: "Unassigned" },

  toMemberId: { type: mongoose.Schema.Types.ObjectId, default: null },
  toMemberName: { type: String, default: "Unassigned" },

  movedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }, // who triggered
  movedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Reassignment", ReassignmentSchema);
