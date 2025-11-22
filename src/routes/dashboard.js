const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const auth = require("../middleware/authMiddleware");

// GET totals across user's projects
// GET /api/dashboard/summary
router.get("/summary", auth, dashboardController.getSummary);

// GET team summary (members assigned vs capacity)
// GET /api/dashboard/team-summary/:teamId
router.get("/team-summary/:teamId", auth, dashboardController.getTeamSummary);

// POST reassign (auto-balance) — body: { teamId: "..." }
// POST /api/dashboard/reassign
router.post("/reassign", auth, dashboardController.reassignTasks);

// GET recent reassignments
// GET /api/dashboard/reassignments?teamId=<teamId>&limit=5
router.get("/reassignments", auth, dashboardController.getRecentReassignments);

module.exports = router;
