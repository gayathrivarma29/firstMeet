const express = require("express");
const router = express.Router();
const { signUp, getUserByUsername, updateUser } = require("../controllers/signUpController");

router.post("/signUp", signUp);
router.get("/:userName", getUserByUsername);
// allow updating a user (e.g. change role) by id
router.put("/:id", updateUser);

module.exports = router;
