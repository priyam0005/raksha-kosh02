// router/scanRouter.js

const express = require("express");
const router = express.Router();
const ScanController = require("../controller/userScan");
const protect = require("../middleware/protect");

router.get("/", protect, ScanController.getUserScans);

module.exports = router;
