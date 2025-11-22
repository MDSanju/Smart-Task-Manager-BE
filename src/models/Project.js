const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true }, // linked team
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // creator (user)
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Project", ProjectSchema);
