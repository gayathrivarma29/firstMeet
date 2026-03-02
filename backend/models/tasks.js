const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    userName: {
        type: String,
        required: true,
    },
    assignedTo: {
        type: String,
    },
    assignedBy: {
        type: String,
    },
    deadline: {
        type: String,
    },
    isAssigned: {
        type: Boolean,
        default: false,
    },
    priority: {
        type: String,
        enum: ["HIGH", "MEDIUM", "LOW"],
        default: "MEDIUM",
    },
    jiraId: {
        type: String,
    },
    isCompleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model("Task", taskSchema);