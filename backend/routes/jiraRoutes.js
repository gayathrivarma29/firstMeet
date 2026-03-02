const express = require("express");
const router = express.Router();
const jiraController = require("../controllers/jiraController");

router.post("/send", jiraController.createJiraIssue);

module.exports = router;
