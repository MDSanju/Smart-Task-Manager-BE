const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/teams", require("./routes/team"));
app.use("/api/projects", require("./routes/project"));
app.use("/api/tasks", require("./routes/task"));

// Health
app.get("/", (req, res) => res.send("API running"));

// Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
