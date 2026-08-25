const mongoose = require("mongoose");

const restorationActivitySchema = new mongoose.Schema(
    {
        activityName: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        progress: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },

        status: {
            type: String,
            enum: ["PLANNED", "IN_PROGRESS", "COMPLETED"],
            default: "PLANNED"
        },

        evidenceUrl: {
            type: String,
            default: null
        },

        completedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);


const restorationProjectSchema = new mongoose.Schema(
    {
        projectName: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        location: {
            type: String,
            required: true,
            trim: true
        },

        startDate: {
            type: Date,
            required: true
        },

        targetDate: {
            type: Date,
            required: true
        },

        progress: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },

        status: {
            type: String,
            enum: [
                "PLANNED",
                "IN_PROGRESS",
                "COMPLETED"
            ],
            default: "PLANNED"
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        activities: [restorationActivitySchema]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "RestorationProject",
    restorationProjectSchema
);