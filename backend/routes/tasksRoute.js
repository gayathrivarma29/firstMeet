const express = require("express");
const router = express.Router();
const tasksController = require("../controllers/tasksController");

router.post("/", tasksController.createTask);
router.get("/unassigned", tasksController.getUnassignedTasks);
router.get("/my-assigned", tasksController.getTasksByUser);
router.get("/my-created", tasksController.getTasksByCreator);
router.get("/my-completed", tasksController.getCompletedTasks);
router.patch("/assign/:taskId", tasksController.assignTask);
router.patch("/complete/:taskId", tasksController.completeTask);
router.delete("/:taskId", tasksController.deleteTask);

module.exports = router;