const express = require("express");
const scannerController = require("../controllers/scannerController");
const router = express.Router();

router.get("/scan/stream", scannerController.handleSSEStream);
router.post("/scan", scannerController.scanRepo);
router.get("/user/repos", scannerController.getUserRepos);

module.exports = router;
