const mongoose = require("mongoose");

const conflictReportSchema = new mongoose.Schema(
    {
        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        title: {
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

        incidentDate: {
            type: Date,
            required: true
        },

        incidentType: {
            type: String,
            enum: [
                "Crop Damage",
                "Property Damage",
                "Human Safety",
                "Elephant Sighting",
                "Other"
            ],
            required: true
        },

        evidenceUrl: {
            type: String,
            default: null
        },

        status: {
            type: String,
            enum: ["PENDING", "VERIFIED", "REJECTED"],
            default: "PENDING"
        },

        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        verificationDate: {
            type: Date,
            default: null
        },

        rejectionReason: {
            type: String,
            default: null
        },

        blockchainHash: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "ConflictReport",
    conflictReportSchema
);