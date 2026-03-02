const Task = require("../models/tasks");
const User = require("../models/user");

// Create a new task (auto-saved as unassigned on generation)
exports.createTask = async (req, res) => {
    try {
        const { title, userName, assignedTo, assignedBy, deadline, isAssigned, priority } = req.body;
        const newTask = new Task({
            title,
            userName,
            assignedTo,
            assignedBy,
            deadline,
            isAssigned: isAssigned !== undefined ? isAssigned : false,
            priority: priority || "MEDIUM"
        });
        await newTask.save();
        res.status(201).json(newTask);
    } catch (error) {
        console.error("Create Task Error:", error);
        res.status(400).json({ message: error.message });
    }
};

// Get unassigned tasks only for the user who created them
exports.getUnassignedTasks = async (req, res) => {
    try {
        const { userName } = req.query;
        const filter = { isAssigned: false };
        if (userName) filter.userName = userName;
        const tasks = await Task.find(filter);
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get tasks assigned to a specific user (by their userName)
exports.getTasksByUser = async (req, res) => {
    try {
        const { username } = req.params;
        const tasks = await Task.find({ assignedTo: username, isAssigned: true, isCompleted: { $ne: true } });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get tasks created/saved by a specific user
exports.getTasksByCreator = async (req, res) => {
    try {
        const { userName } = req.params;
        const tasks = await Task.find({ userName }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Assign a task: resolve assignedToText to a real userName
exports.assignTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { assignedToText, assignedTo } = req.body;

        let resolvedUserName = assignedTo; // fallback if directly passed

        if (assignedToText) {
            // Try to resolve "First Last" or "First.Last" to a DB userName
            const normalized = assignedToText.trim().replace(/\./g, ' ');
            const parts = normalized.split(/\s+/);
            const firstName = parts[0] || '';
            const lastName = parts.slice(1).join(' ') || '';

            const user = await User.findOne({
                firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
                lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
            });

            if (!user) {
                return res.status(404).json({ message: `User "${assignedToText}" not found. Check the name in the transcript.` });
            }
            resolvedUserName = user.userName;
        }

        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            { assignedTo: resolvedUserName, isAssigned: true },
            { new: true }
        );

        res.json({ task: updatedTask, resolvedUserName });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Mark a task as completed
exports.completeTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            { isCompleted: true },
            { new: true }
        );
        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get completed tasks for a specific user
exports.getCompletedTasks = async (req, res) => {
    try {
        const { username } = req.params;
        const tasks = await Task.find({ assignedTo: username, isCompleted: true }).sort({ updatedAt: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete a task by ID
exports.deleteTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        await Task.findByIdAndDelete(taskId);
        res.json({ message: "Task deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
