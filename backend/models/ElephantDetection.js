const mongoose = require("mongoose");

const elephantDetectionSchema = new mongoose.Schema(
    {
        deviceId: {
            type: String,
            required: true,
            default: "CAM-001"
        },

        sensorId: {
            type: String,
            required: true,
            default: "PIR-001"
        },

        zone: {
            type: String,
            required: true,
            default: "Zone-A"
        },

        detectedObject: {
            type: String,
            required: true,
            default: "elephant"
        },

        elephantCount: {
            type: Number,
            required: true,
            min: 1
        },

        confidence: {
            type: Number,
            required: true,
            min: 0,
            max: 1
        },

        timestamp: {
            type: Date,
            default: Date.now
        },

        image: {
            type: String,
            default: null
        },

        riskLevel: {
            type: String,
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            default: "MEDIUM"
        },

        alertStatus: {
            type: String,
            enum: ["PENDING", "SENT", "ACKNOWLEDGED"],
            default: "PENDING"
        },

        verificationStatus: {
            type: String,
            enum: ["PENDING", "VERIFIED", "REJECTED"],
            default: "PENDING"
        },

        verifiedBy: {
            type: String,
            default: null
        },

        verifiedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "ElephantDetection",
    elephantDetectionSchema
);