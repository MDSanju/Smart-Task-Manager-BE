const mongoose = require("mongoose");

const blackTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

module.exports = mongoose.model("BlacklistedToken", blackTokenSchema);
