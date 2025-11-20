const jwt = require("jsonwebtoken");
const BlacklistedToken = require("../models/BlacklistedToken");

module.exports = async function (req, res, next) {
  const token = req.header("x-auth-token");
  if (!token)
    return res.status(401).json({ msg: "No token, authorization denied" });

  try {
    const black = await BlacklistedToken.findOne({ token });
    if (black)
      return res
        .status(401)
        .json({ msg: "Token has been revoked. Please login again." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(401).json({ msg: "Token is not valid" });
  }
};
