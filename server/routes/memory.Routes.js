const express = require("express");
const router = express.Router();
const memoryController = require("../controllers/memoryController");

router.get("/timeline/:accountId",     memoryController.getTimeline);
router.get("/summary/:accountId",      memoryController.getAccountSummary);
router.get("/action-items/:accountId", memoryController.getActionItems);
router.get("/search",                  memoryController.searchTimeline);
router.get("/accounts",                memoryController.getAccounts);

module.exports = router;