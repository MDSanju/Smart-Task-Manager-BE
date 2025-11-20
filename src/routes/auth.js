const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { registerValidation, loginValidation } = require("../utils/validators");
const auth = require("../middleware/authMiddleware");

router.post("/register", registerValidation, authController.register);
router.post("/login", loginValidation, authController.login);
router.post("/logout", auth, authController.logout);

router.get("/me", auth, authController.getMe);

module.exports = router;
