const express = require("express");
const router = express.Router();
const teamController = require("../controllers/teamController");
const auth = require("../middleware/authMiddleware");
const {
  createTeamValidation,
  addMemberValidation,
  updateMemberValidation,
} = require("../utils/teamValidators");

// Create team
// POST /api/teams
router.post("/", auth, createTeamValidation, teamController.createTeam);

// Get all teams owned by current user
// GET /api/teams
router.get("/", auth, teamController.getMyTeams);

// Get specific team
// GET /api/teams/:teamId
router.get("/:teamId", auth, teamController.getTeamById);

// Add member
// POST /api/teams/:teamId/members
router.post(
  "/:teamId/members",
  auth,
  addMemberValidation,
  teamController.addMember
);

// Update member
// PUT /api/teams/:teamId/members/:memberId
router.put(
  "/:teamId/members/:memberId",
  auth,
  updateMemberValidation,
  teamController.updateMember
);

// Delete member
// DELETE /api/teams/:teamId/members/:memberId
router.delete("/:teamId/members/:memberId", auth, teamController.removeMember);

module.exports = router;
