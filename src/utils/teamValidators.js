const { check } = require("express-validator");

exports.createTeamValidation = [
  check("name", "Team name is required").notEmpty().trim(),
];

exports.addMemberValidation = [
  check("name", "Member name is required").notEmpty().trim(),
  check("role").optional().isString().trim(),
  check("capacity", "Capacity must be a number between 0 and 5")
    .optional()
    .isInt({ min: 0, max: 5 }),
];

exports.updateMemberValidation = [
  check("name").optional().notEmpty().trim(),
  check("role").optional().isString().trim(),
  check("capacity").optional().isInt({ min: 0, max: 5 }),
];
