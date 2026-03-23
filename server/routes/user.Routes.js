const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const {verifyToken} = require("../middlewares/authMiddleware");

// Auth routes
router.post("/register", userController.register);
router.post("/login", userController.login);

// IAM-style routes
router.post("/create-role", verifyToken, userController.createRole);
router.post("/role-login", userController.roleLogin);

module.exports = router;