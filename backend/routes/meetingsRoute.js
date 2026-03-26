const express = require("express");
const router = express.Router();
const meetingsController = require("../controllers/meetingsController");

router.post("/", meetingsController.createMeeting);
router.get("/:id/notes", meetingsController.getNotes);
router.put("/:id/notes", meetingsController.updateNotes);
router.get("/my", meetingsController.getMeetingsByUser);

module.exports = router;