const Project = require("../models/Project");
const Team = require("../models/Team");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

exports.createProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { name, description, team } = req.body;

  if (!mongoose.Types.ObjectId.isValid(team))
    return res.status(400).json({ msg: "Invalid team id" });

  try {
    // verify team exists and belongs to current user (owner)
    const teamDoc = await Team.findById(team);
    if (!teamDoc) return res.status(404).json({ msg: "Team not found" });
    if (teamDoc.owner.toString() !== req.user.id)
      return res.status(403).json({ msg: "Access denied" });

    const project = new Project({
      name,
      description: description || "",
      team,
      owner: req.user.id,
    });

    await project.save();
    return res.status(201).json(project);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};

exports.getMyProjects = async (req, res) => {
  try {
    // returns projects owned by current user
    const projects = await Project.find({ owner: req.user.id }).populate(
      "team",
      "name"
    );
    return res.json(projects);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};

exports.getProjectById = async (req, res) => {
  const { projectId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(projectId))
    return res.status(400).json({ msg: "Invalid project id" });

  try {
    const project = await Project.findById(projectId).populate("team", "name");
    if (!project) return res.status(404).json({ msg: "Project not found" });
    if (project.owner.toString() !== req.user.id)
      return res.status(403).json({ msg: "Access denied" });
    return res.json(project);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};

exports.updateProject = async (req, res) => {
  const { projectId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(projectId))
    return res.status(400).json({ msg: "Invalid project id" });

  const { name, description } = req.body;
  try {
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ msg: "Project not found" });
    if (project.owner.toString() !== req.user.id)
      return res.status(403).json({ msg: "Access denied" });

    if (typeof name !== "undefined") project.name = name;
    if (typeof description !== "undefined") project.description = description;

    await project.save();
    return res.json(project);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};

exports.deleteProject = async (req, res) => {
  const { projectId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(projectId))
    return res.status(400).json({ msg: "Invalid project id" });

  try {
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ msg: "Project not found" });
    if (project.owner.toString() !== req.user.id)
      return res.status(403).json({ msg: "Access denied" });

    // Delete project and tasks - we will let Task controller handle task deletion by project
    await project.remove();
    return res.json({ msg: "Project deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};
