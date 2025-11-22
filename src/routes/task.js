const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const {
  createTaskValidation,
  updateTaskValidation,
} = require("../utils/taskValidators");
const auth = require("../middleware/authMiddleware");

// POST /api/tasks
router.post("/", auth, createTaskValidation, taskController.createTask);

// GET /api/tasks  -> query params: projectId, memberId, status, priority
router.get("/", auth, taskController.getTasks);

// GET /api/tasks/:taskId
router.get("/:taskId", auth, taskController.getTaskById);

// PUT /api/tasks/:taskId
router.put("/:taskId", auth, updateTaskValidation, taskController.updateTask);

// DELETE /api/tasks/:taskId
router.delete("/:taskId", auth, taskController.deleteTask);

module.exports = router;
