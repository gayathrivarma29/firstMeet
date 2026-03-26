const express = require("express");
const router = express.Router();
const authMiddleware = require("../utils/authMiddleware");
const { signUp, signIn, getUserByUsername, updateUser, getAllUsers, getMe } = require("../controllers/userController");

router.post("/signUp", signUp);
router.post("/signIn", signIn);

// Protected routes
router.get("/me", authMiddleware, getMe);
router.get("/", authMiddleware, getAllUsers);
router.get("/:userName", authMiddleware, getUserByUsername);
router.put("/:id", authMiddleware, updateUser);

module.exports = router;
