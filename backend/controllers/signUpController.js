const User = require("../models/user");
const bcrypt = require("bcryptjs");

const signUp = async (req, res) => {
    try {
        const { firstName, lastName, email, password, role } = req.body;

        if (!firstName || !lastName || !email || !password || !role) {
            return res.status(400).json({ message: "All fields including role are required" });
        }

        // Validate role
        if (!['admin', 'employee'].includes(role)) {
            return res.status(400).json({ message: "Invalid role. Must be 'admin' or 'employee'" });
        }

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Generate username: firstName.lastName
        const userName = `${firstName}.${lastName}`.toLowerCase();

        // Check if username already exists (optional but recommended)
        const userNameExists = await User.findOne({ userName });
        if (userNameExists) {
            return res.status(400).json({ message: "Username already taken, please contact support or try a different name." });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
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

        // Only allow certain fields to be updated
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

module.exports = { signUp, getUserByUsername, updateUser };