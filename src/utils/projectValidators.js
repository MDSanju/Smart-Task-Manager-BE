const { check } = require("express-validator");

exports.createProjectValidation = [
  check("name", "Project name is required").notEmpty().trim(),
  check("team", "Team id is required").notEmpty().isMongoId(),
];

exports.updateProjectValidation = [
  check("name").optional().notEmpty().trim(),
  check("description").optional().isString(),
];
