const User = require("../models/user");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const signIn = async (req, res) => {
    const { userName, password } = req.body;

    try {
        const user = await User.findOne({ userName });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password" });
        }

        const token = jwt.sign(
            { id: user._id, userName: user.userName, role: user.role },
            process.env.JWT_SECRET || "yoursecretkeyforjwt12345",
            { expiresIn: "10h" }
        );

        res.json({
            success: true,
            message: "Signed in successfully",
            token,
            userName: user.userName,
            role: user.role
        });
    } catch (error) {
        console.error("SignIn Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const signUp = async (req, res) => {
    try {
        const { firstName, lastName, email, password, role } = req.body;

        if (!firstName || !lastName || !email || !password || !role) {
            return res.status(400).json({ message: "All fields including role are required" });
        }


        if (!['admin', 'employee'].includes(role)) {
            return res.status(400).json({ message: "Invalid role. Must be 'admin' or 'employee'" });
        }


        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }


        const userName = `${firstName}.${lastName}`.toLowerCase();


        const userNameExists = await User.findOne({ userName });
        if (userNameExists) {
            return res.status(400).json({ message: "Username already taken, please contact support or try a different name." });
        }


        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);


        const user = await User.create({
            firstName,
            lastName,
            email,
            userName,
            password: hashedPassword,
            role,
        });

        if (user) {
            res.status(201).json({
                message: "User registered successfully",
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    userName: user.userName,
                    role: user.role,
                },
            });
        } else {
            res.status(400).json({ message: "Invalid user data" });
        }
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const getUserByUsername = async (req, res) => {
    try {
        const { userName } = req.params;
        const user = await User.findOne({ userName }).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        console.error("Get User Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, role } = req.body;


        const updates = {};
        if (firstName) updates.firstName = firstName;
        if (lastName) updates.lastName = lastName;
        if (email) updates.email = email.toLowerCase();
        if (role) {
            if (!['admin', 'employee'].includes(role)) {
                return res.status(400).json({ message: "Invalid role. Must be 'admin' or 'employee'" });
            }
            updates.role = role;
        }

        const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ message: "User updated successfully", user });
    } catch (error) {
        console.error("Update User Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select("-password");
        res.json(users);
    } catch (error) {
        console.error("Get All Users Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        console.error("Get Me Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

module.exports = { signUp, signIn, getUserByUsername, updateUser, getAllUsers, getMe };