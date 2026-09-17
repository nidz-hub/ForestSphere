const express = require("express");
const ElephantDetection = require("../models/ElephantDetection");

const router = express.Router();


// ==========================================
// POST /api/elephant-detections
// Receive detection event from ML/IoT system
// ==========================================

router.post("/", async (req, res) => {
    try {
        const {
            deviceId,
            sensorId,
            zone,
            detectedObject,
            elephantCount,
            confidence,
            timestamp,
            image,
            riskLevel
        } = req.body;

        // Validate required fields
        if (
            !deviceId ||
            !sensorId ||
            !zone ||
            !detectedObject ||
            elephantCount === undefined ||
            confidence === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Missing required detection fields"
            });
        }

        // Only accept elephant detections
        if (detectedObject.toLowerCase() !== "elephant") {
            return res.status(400).json({
                success: false,
                message: "Only elephant detections are accepted"
            });
        }

        // Create detection record
        const detection = await ElephantDetection.create({
            deviceId,
            sensorId,
            zone,
            detectedObject: detectedObject.toLowerCase(),
            elephantCount,
            confidence,
            timestamp: timestamp || Date.now(),
            image: image || null,
            riskLevel: riskLevel || "MEDIUM"
        });

        console.log("🐘 Elephant detection stored:", detection._id);

        res.status(201).json({
            success: true,
            message: "Elephant detection stored successfully",
            detection
        });

    } catch (error) {
        console.error(
            "Elephant detection error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to store elephant detection",
            error: error.message
        });
    }
});


// ==========================================
// GET /api/elephant-detections
// Get all elephant detections
// ==========================================

router.get("/", async (req, res) => {
    try {
        const detections = await ElephantDetection
            .find()
            .sort({ timestamp: -1 });

        res.json({
            success: true,
            count: detections.length,
            detections
        });

    } catch (error) {
        console.error(
            "Get detections error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to retrieve elephant detections",
            error: error.message
        });
    }
});


// ==========================================
// GET /api/elephant-detections/:id
// Get one detection
// ==========================================

router.get("/:id", async (req, res) => {
    try {
        const detection = await ElephantDetection.findById(
            req.params.id
        );

        if (!detection) {
            return res.status(404).json({
                success: false,
                message: "Elephant detection not found"
            });
        }

        res.json({
            success: true,
            detection
        });

    } catch (error) {
        console.error(
            "Get detection error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to retrieve detection",
            error: error.message
        });
    }
});


// ==========================================
// PATCH /api/elephant-detections/:id/verify
// Forest Officer verifies/rejects detection
// ==========================================

router.patch("/:id/verify", async (req, res) => {
    try {
        const {
            verificationStatus,
            verifiedBy
        } = req.body;

        if (
            !["VERIFIED", "REJECTED"].includes(
                verificationStatus
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "verificationStatus must be VERIFIED or REJECTED"
            });
        }

        if (!verifiedBy) {
            return res.status(400).json({
                success: false,
                message: "verifiedBy is required"
            });
        }

        const detection =
            await ElephantDetection.findByIdAndUpdate(
                req.params.id,
                {
                    verificationStatus,
                    verifiedBy,
                    verifiedAt: new Date()
                },
                {
                    new: true,
                    runValidators: true
                }
            );

        if (!detection) {
            return res.status(404).json({
                success: false,
                message: "Elephant detection not found"
            });
        }

        console.log(
            `🔎 Detection ${detection._id} ${verificationStatus}`
        );

        res.json({
            success: true,
            message:
                `Elephant detection ${verificationStatus.toLowerCase()} successfully`,
            detection
        });

    } catch (error) {
        console.error(
            "Verification error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to verify detection",
            error: error.message
        });
    }
});


module.exports = router;