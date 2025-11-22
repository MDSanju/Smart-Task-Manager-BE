const Task = require("../models/Task");
const Project = require("../models/Project");
const Team = require("../models/Team");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

// helper: check assignedMemberId belongs to project's team members
async function validateAssignedMember(project, assignedMemberId) {
  if (!assignedMemberId) return { ok: true, name: "Unassigned" };

  // find the team doc
  const team = await Team.findById(project.team);
  if (!team) return { ok: false, msg: "Linked team not found" };

  const member = team.members.find(
    (m) => m._id && m._id.toString() === assignedMemberId.toString()
  );
  if (!member)
    return { ok: false, msg: "Assigned member not found in project team" };

  return { ok: true, name: member.name };
}

// Create task
exports.createTask = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const {
    title,
    description,
    project: projectId,
    assignedMemberId,
    priority,
    status,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(projectId))
    return res.status(400).json({ msg: "Invalid project id" });

  try {
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ msg: "Project not found" });
    if (project.owner.toString() !== req.user.id)
      return res.status(403).json({ msg: "Access denied" });

    // validate assigned member
    let assignedMemberName = "Unassigned";
    if (assignedMemberId) {
      if (!mongoose.Types.ObjectId.isValid(assignedMemberId))
        return res.status(400).json({ msg: "Invalid member id" });
      const v = await validateAssignedMember(project, assignedMemberId);
      if (!v.ok) return res.status(400).json({ msg: v.msg });
      assignedMemberName = v.name;
    }

    const task = new Task({
      title,
      description: description || "",
      project: projectId,
      assignedMemberId: assignedMemberId || null,
      assignedMemberName,
      priority: priority || "Medium",
      status: status || "Pending",
      createdBy: req.user.id,
    });

    await task.save();
    return res.status(201).json(task);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};

// Get tasks with optional filters (projectId, memberId, status, priority)
exports.getTasks = async (req, res) => {
  const { projectId, memberId, status, priority } = req.query;

  const filter = {};

  try {
    // If projectId provided — validate and ensure user owns the project
    if (projectId) {
      if (!mongoose.Types.ObjectId.isValid(projectId))
        return res.status(400).json({ msg: "Invalid project id" });
      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ msg: "Project not found" });
      if (project.owner.toString() !== req.user.id)
        return res.status(403).json({ msg: "Access denied" });
      filter.project = projectId;
    } else {
      // If no project filter, return tasks across all projects owned by user.
      // find user's projects ids
      const projects = await Project.find({ owner: req.user.id }).select("_id");
      const projectIds = projects.map((p) => p._id);
      filter.project = { $in: projectIds };
    }

    if (memberId) {
      if (!mongoose.Types.ObjectId.isValid(memberId))
        return res.status(400).json({ msg: "Invalid member id" });
      filter.assignedMemberId = mongoose.Types.ObjectId(memberId);
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    return res.json(tasks);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};

// Get single task by id
exports.getTaskById = async (req, res) => {
  const { taskId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(taskId))
    return res.status(400).json({ msg: "Invalid task id" });

  try {
    const task = await Task.findById(taskId).populate("project", "name");
    if (!task) return res.status(404).json({ msg: "Task not found" });

    const project = await Project.findById(task.project);
    if (!project) return res.status(404).json({ msg: "Project not found" });
    if (project.owner.toString() !== req.user.id)
      return res.status(403).json({ msg: "Access denied" });

    return res.json(task);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};

// Update task
exports.updateTask = async (req, res) => {
  const { taskId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(taskId))
    return res.status(400).json({ msg: "Invalid task id" });

  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { title, description, assignedMemberId, priority, status } = req.body;

  try {
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ msg: "Task not found" });

    const project = await Project.findById(task.project);
    if (!project) return res.status(404).json({ msg: "Project not found" });
    if (project.owner.toString() !== req.user.id)
      return res.status(403).json({ msg: "Access denied" });

    if (typeof title !== "undefined") task.title = title;
    if (typeof description !== "undefined") task.description = description;

    if (typeof assignedMemberId !== "undefined") {
      if (!assignedMemberId) {
        // unassign
        task.assignedMemberId = null;
        task.assignedMemberName = "Unassigned";
      } else {
        if (!mongoose.Types.ObjectId.isValid(assignedMemberId))
          return res.status(400).json({ msg: "Invalid member id" });
        const v = await validateAssignedMember(project, assignedMemberId);
        if (!v.ok) return res.status(400).json({ msg: v.msg });
        task.assignedMemberId = assignedMemberId;
        task.assignedMemberName = v.name;
      }
    }

    if (typeof priority !== "undefined") task.priority = priority;
    if (typeof status !== "undefined") task.status = status;

    await task.save();
    return res.json(task);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};

// Delete task
exports.deleteTask = async (req, res) => {
  const { taskId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(taskId))
    return res.status(400).json({ msg: "Invalid task id" });

  try {
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ msg: "Task not found" });

    const project = await Project.findById(task.project);
    if (!project) return res.status(404).json({ msg: "Project not found" });
    if (project.owner.toString() !== req.user.id)
      return res.status(403).json({ msg: "Access denied" });

    await task.remove();
    return res.json({ msg: "Task deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};

// Optional: cascade delete tasks when project removed
exports.deleteTasksByProject = async (projectId) => {
  try {
    await Task.deleteMany({ project: projectId });
  } catch (err) {
    console.error("Error deleting tasks by project:", err);
  }
};
