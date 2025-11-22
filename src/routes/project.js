const express = require("express");
const router = express.Router();
const projectController = require("../controllers/projectController");
const {
  createProjectValidation,
  updateProjectValidation,
} = require("../utils/projectValidators");
const auth = require("../middleware/authMiddleware");

// POST /api/projects
router.post(
  "/",
  auth,
  createProjectValidation,
  projectController.createProject
);

// GET /api/projects  -> projects owned by user
router.get("/", auth, projectController.getMyProjects);

// GET /api/projects/:projectId
router.get("/:projectId", auth, projectController.getProjectById);

// PUT /api/projects/:projectId
router.put(
  "/:projectId",
  auth,
  updateProjectValidation,
  projectController.updateProject
);

// DELETE /api/projects/:projectId
router.delete("/:projectId", auth, projectController.deleteProject);

module.exports = router;
