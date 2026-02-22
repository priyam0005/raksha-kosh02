// routes/uploadRoutes.js
const express = require("express");
const { upload } = require("../controller/uploadController");
const {
  runLayer1,
  runLayer4,
  runLayer3,
  runLayer2,
  runFullScan,
} = require("../controller/layers");
const optionalAuth = require("../middleware/authMiddleware");

const AuthController = require("../controller/auth");

const router = express.Router();

// POST /upload          — runs Layer 1 + Layer 4 in sequence (full scan)
router.post("/", upload.single("file"), optionalAuth, runFullScan);

// POST /upload/layer1   — tests magic number / MIME type only
router.post("/layer1", upload.single("file"), runLayer1);

router.post("/layer2", upload.single("file"), runLayer2);
router.post("/layer3", upload.single("file"), runLayer3);
// POST /upload/layer4   — tests metadata forensics only
router.post("/layer4", upload.single("file"), runLayer4);

router.post("/register", AuthController.Register);
router.post("/login", AuthController.Login);

module.exports = router;
