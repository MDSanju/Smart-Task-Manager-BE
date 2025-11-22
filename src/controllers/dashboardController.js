const Project = require("../models/Project");
const Task = require("../models/Task");
const Team = require("../models/Team");
const Reassignment = require("../models/Reassignment");
const mongoose = require("mongoose");

/**
 * GET /api/dashboard/summary
 * returns totalProjects, totalTasks for current user (across user's projects)
 */
exports.getSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const projects = await Project.find({ owner: userId }).select("_id");
    const projectIds = projects.map((p) => p._id);

    const totalProjects = projectIds.length;
    const totalTasks = await Task.countDocuments({
      project: { $in: projectIds },
    });

    return res.json({ totalProjects, totalTasks });
  } catch (err) {
    console.error("getSummary error:", err);
    return res.status(500).send("Server error");
  }
};

/**
 * GET /api/dashboard/team-summary/:teamId
 * Shows each member's current assigned tasks vs capacity and overloaded flag
 */
exports.getTeamSummary = async (req, res) => {
  try {
    const { teamId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(teamId))
      return res.status(400).json({ msg: "Invalid team id" });

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ msg: "Team not found" });
    // Ensure ownership (only owner can view dashboard for that team)
    if (team.owner.toString() !== req.user.id)
      return res.status(403).json({ msg: "Access denied" });

    // Collect project ids for that team (and owned by user)
    const projects = await Project.find({
      team: teamId,
      owner: req.user.id,
    }).select("_id");
    const projectIds = projects.map((p) => p._id);

    // If no projects -> all counts 0
    // count tasks per member across those projects
    const agg = await Task.aggregate([
      {
        $match: {
          project: { $in: projectIds },
          assignedMemberId: { $ne: null },
        },
      },
      { $group: { _id: "$assignedMemberId", count: { $sum: 1 } } },
    ]);

    // map memberId -> count
    const counts = {};
    agg.forEach((a) => {
      counts[a._id.toString()] = a.count;
    });

    // Build summary for each member
    const membersSummary = team.members.map((m) => {
      const id = m._id ? m._id.toString() : null;
      const assignedCount = id && counts[id] ? counts[id] : 0;
      const overloaded =
        assignedCount > (typeof m.capacity === "number" ? m.capacity : 0);
      return {
        memberId: m._id,
        name: m.name,
        role: m.role,
        capacity: m.capacity,
        assignedCount,
        overloaded,
      };
    });

    // Also include unassigned tasks count for this team's projects
    const unassignedCount = await Task.countDocuments({
      project: { $in: projectIds },
      assignedMemberId: null,
    });

    return res.json({
      teamId,
      teamName: team.name,
      projectCount: projectIds.length,
      unassignedCount,
      members: membersSummary,
    });
  } catch (err) {
    console.error("getTeamSummary error:", err);
    return res.status(500).send("Server error");
  }
};

/**
 * POST /api/dashboard/reassign
 * Body: { teamId }
 * Auto-balance algorithm:
 * - Find overloaded members (assignedCount > capacity)
 * - Find members with free capacity (capacity - assignedCount > 0)
 * - Move oldest Pending tasks from overloaded -> available (FIFO)
 * - Log each reassignment in Reassignment collection
 *
 * Returns list of reassignments made.
 */
exports.reassignTasks = async (req, res) => {
  try {
    const { teamId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(teamId))
      return res.status(400).json({ msg: "Invalid team id" });

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ msg: "Team not found" });
    if (team.owner.toString() !== req.user.id)
      return res.status(403).json({ msg: "Access denied" });

    // projects under this team owned by user
    const projects = await Project.find({
      team: teamId,
      owner: req.user.id,
    }).select("_id");
    const projectIds = projects.map((p) => p._id);
    if (projectIds.length === 0)
      return res.json({ msg: "No projects for this team", reassignments: [] });

    // count assigned per member
    const agg = await Task.aggregate([
      {
        $match: {
          project: { $in: projectIds },
          assignedMemberId: { $ne: null },
        },
      },
      { $group: { _id: "$assignedMemberId", count: { $sum: 1 } } },
    ]);
    const counts = {};
    agg.forEach((a) => {
      counts[a._id.toString()] = a.count;
    });

    // build member objects
    const members = team.members.map((m) => {
      const id = m._id ? m._id.toString() : null;
      const assignedCount = id && counts[id] ? counts[id] : 0;
      const free =
        (typeof m.capacity === "number" ? m.capacity : 0) - assignedCount;
      return {
        memberId: id,
        name: m.name,
        capacity: m.capacity,
        assignedCount,
        free, // may be negative if overloaded
      };
    });

    // overloaded list: members with free < 0
    const overloaded = members
      .filter((m) => m.free < 0)
      .sort((a, b) =>
        a.assignedCount - a.capacity < b.assignedCount - b.capacity ? 1 : -1
      );
    // available list: members with free > 0
    const available = members
      .filter((m) => m.free > 0)
      .sort((a, b) => b.free - a.free);

    if (overloaded.length === 0)
      return res.json({ msg: "No overloaded members", reassignments: [] });
    if (available.length === 0)
      return res.json({
        msg: "No available capacity to reassign",
        reassignments: [],
      });

    const reassignments = [];

    // For each overloaded member, compute excess number and fetch their oldest Pending tasks
    for (const over of overloaded) {
      const excess = Math.abs(Math.min(0, over.free)); // how many to move: assignedCount - capacity
      if (excess <= 0) continue;

      // find tasks assigned to this member across those projects, ordered by createdAt asc (oldest first)
      const tasksToMove = await Task.find({
        project: { $in: projectIds },
        assignedMemberId: mongoose.Types.ObjectId(over.memberId),
      })
        .sort({ createdAt: 1 })
        .limit(excess);

      let idxTask = 0;
      for (const task of tasksToMove) {
        if (available.length === 0) break; // no more receivers

        // find first available member with free > 0
        const receiver = available[0];

        // perform reassign
        const oldAssignedId = task.assignedMemberId;
        const oldAssignedName = task.assignedMemberName;

        // update task
        task.assignedMemberId = receiver.memberId
          ? mongoose.Types.ObjectId(receiver.memberId)
          : null;
        task.assignedMemberName = receiver.name || "Unassigned";
        await task.save();

        // log reassignment
        const log = await Reassignment.create({
          task: task._id,
          project: task.project,
          team: teamId,
          fromMemberId: oldAssignedId || null,
          fromMemberName: oldAssignedName || "Unassigned",
          toMemberId: receiver.memberId || null,
          toMemberName: receiver.name || "Unassigned",
          movedBy: req.user.id,
        });

        reassignments.push({
          taskId: task._id,
          from: { id: oldAssignedId, name: oldAssignedName },
          to: { id: receiver.memberId, name: receiver.name },
          movedAt: log.movedAt,
        });

        // decrease receiver.free, increase receiver.assignedCount
        receiver.free -= 1;
        receiver.assignedCount += 1;

        // If receiver.free becomes 0 or less, remove from available
        if (receiver.free <= 0) available.shift(); // remove first
      }
    }

    return res.json({ msg: "Reassignment complete", reassignments });
  } catch (err) {
    console.error("reassignTasks error:", err);
    return res.status(500).send("Server error");
  }
};

/**
 * GET /api/dashboard/reassignments?teamId=<teamId>&limit=5
 * returns recent reassignments (default 5) for a team (owner only)
 */
exports.getRecentReassignments = async (req, res) => {
  try {
    const { teamId } = req.query;
    let limit = parseInt(req.query.limit || "5", 10);
    if (isNaN(limit) || limit <= 0) limit = 5;

    if (!teamId || !mongoose.Types.ObjectId.isValid(teamId))
      return res.status(400).json({ msg: "teamId required and must be valid" });

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ msg: "Team not found" });
    if (team.owner.toString() !== req.user.id)
      return res.status(403).json({ msg: "Access denied" });

    const logs = await Reassignment.find({ team: teamId })
      .sort({ movedAt: -1 })
      .limit(limit)
      .populate("task", "title")
      .populate("project", "name")
      .populate("movedBy", "name");

    // shape response
    const items = logs.map((l) => ({
      taskId: l.task._id,
      taskTitle: l.task.title,
      projectId: l.project._id,
      projectName: l.project.name,
      from: { id: l.fromMemberId, name: l.fromMemberName },
      to: { id: l.toMemberId, name: l.toMemberName },
      movedBy: {
        id: l.movedBy ? l.movedBy._id : null,
        name: l.movedBy ? l.movedBy.name : null,
      },
      movedAt: l.movedAt,
    }));

    return res.json({ items });
  } catch (err) {
    console.error("getRecentReassignments error:", err);
    return res.status(500).send("Server error");
  }
};
