const { check } = require("express-validator");

exports.createTaskValidation = [
  check("title", "Title is required").notEmpty().trim(),
  check("project", "Project id is required").notEmpty().isMongoId(),
  check("assignedMemberId").optional().isMongoId(),
  check("priority").optional().isIn(["Low", "Medium", "High"]),
  check("status").optional().isIn(["Pending", "In Progress", "Done"]),
];

exports.updateTaskValidation = [
  check("title").optional().notEmpty().trim(),
  check("description").optional().isString(),
  check("assignedMemberId")
    .optional()
    .custom((v) => v === null || /^[a-fA-F0-9]{24}$/.test(v)),
  check("priority").optional().isIn(["Low", "Medium", "High"]),
  check("status").optional().isIn(["Pending", "In Progress", "Done"]),
];
