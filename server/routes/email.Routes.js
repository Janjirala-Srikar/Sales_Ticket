const express = require("express");
const router = express.Router();

const emailController = require("../controllers/emailController");

// Email route
router.post("/send-mail", emailController.sendMailHandler);

module.exports = router;