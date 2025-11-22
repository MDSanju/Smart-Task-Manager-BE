const mongoose = require("mongoose");

const TeamMemberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  role: { type: String, default: "member", trim: true },
  capacity: { type: Number, default: 1, min: 0, max: 5 },
  createdAt: { type: Date, default: Date.now },
});

const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // team creator
  members: { type: [TeamMemberSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Team", TeamSchema);
