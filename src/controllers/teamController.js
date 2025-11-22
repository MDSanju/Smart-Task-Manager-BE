const Team = require("../models/Team");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

exports.createTeam = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { name, description } = req.body;
  try {
    const team = new Team({
      name,
      description: description || "",
      owner: req.user.id,
      members: [],
    });
    await team.save();
    return res.status(201).json(team);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};

exports.getMyTeams = async (req, res) => {
  try {
    const teams = await Team.find({ owner: req.user.id }).select("-__v");
    return res.json(teams);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};

exports.getTeamById = async (req, res) => {
  const { teamId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(teamId))
    return res.status(400).json({ msg: "Invalid team id" });

  try {
    const team = await Team.findById(teamId).select("-__v");
    if (!team) return res.status(404).json({ msg: "Team not found" });
    // ensure owner can read — or allow if member? For now owner only
    if (team.owner.toString() !== req.user.id)
      return res.status(403).json({ msg: "Access denied" });
    return res.json(team);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};

exports.addMember = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { teamId } = req.params;
  const { name, role = "member", capacity = 1 } = req.body;

  if (!mongoose.Types.ObjectId.isValid(teamId))
    return res.status(400).json({ msg: "Invalid team id" });

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ msg: "Team not found" });
    if (team.owner.toString() !== req.user.id)
      return res.status(403).json({ msg: "Access denied" });

    // Optional: limit total members per team? (not required)
    // Add member
    const newMember = { name, role, capacity };
    team.members.push(newMember);
    await team.save();

    // Return the just-added member (last in array)
    const added = team.members[team.members.length - 1];
    return res.status(201).json(added);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};

exports.updateMember = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { teamId, memberId } = req.params;
  const { name, role, capacity } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(teamId) ||
    !mongoose.Types.ObjectId.isValid(memberId)
  ) {
    return res.status(400).json({ msg: "Invalid id" });
  }

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ msg: "Team not found" });
    if (team.owner.toString() !== req.user.id)
      return res.status(403).json({ msg: "Access denied" });

    const member = team.members.id(memberId);
    if (!member) return res.status(404).json({ msg: "Member not found" });

    if (typeof name !== "undefined") member.name = name;
    if (typeof role !== "undefined") member.role = role;
    if (typeof capacity !== "undefined") member.capacity = capacity;

    await team.save();
    return res.json(member);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};

exports.removeMember = async (req, res) => {
  const { teamId, memberId } = req.params;

  if (
    !mongoose.Types.ObjectId.isValid(teamId) ||
    !mongoose.Types.ObjectId.isValid(memberId)
  ) {
    return res.status(400).json({ msg: "Invalid id" });
  }

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ msg: "Team not found" });
    if (team.owner.toString() !== req.user.id)
      return res.status(403).json({ msg: "Access denied" });

    // Check member exists
    const memberExists = team.members.some(
      (m) => m._id && m._id.toString() === memberId
    );
    if (!memberExists) return res.status(404).json({ msg: "Member not found" });

    // Remove by filtering the members array
    team.members = team.members.filter(
      (m) => !(m._id && m._id.toString() === memberId)
    );

    await team.save();
    return res.json({ msg: "Member removed" });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};
