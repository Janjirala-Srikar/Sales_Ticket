const express = require("express");
const router = express.Router();
const graphController = require("../controllers/graphController");

router.get("/overview",     graphController.getOverview);
router.get("/metrics",      graphController.getMetrics);
router.get("/hot-accounts", graphController.getHotAccounts);
router.get("/signal-dist",  graphController.getSignalDistribution);
router.get("/account/:id",  graphController.getAccountDetail);

module.exports = router;