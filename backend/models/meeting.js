const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema({
    title: {
        type: String,
        default: "Untitled Meeting",
    },
    userName: {
        type: String,
        required: true,
    },
    summary: {
        type: String,
        default: "",
    },
    actionItems: {
        type: Array,
        default: [],
    },
    notes: {
        type: [
            {
                userName:  { type: String, required: true },
                content:   { type: String, default: "" },
                updatedAt: { type: Date,   default: Date.now },
            },
        ],
        default: [],
    },
}, { timestamps: true });

module.exports = mongoose.model("Meeting", meetingSchema);
