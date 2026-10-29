
const express = require("express");
const ElephantDetection = require("../models/ElephantDetection");
const {
    submitDetectionDecision
} = require("../blockchain/blockchain");

const router = express.Router();

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

        if (
            typeof detectedObject !== "string" ||
            detectedObject.toLowerCase() !== "elephant"
        ) {
            return res.status(400).json({
                success: false,
                message: "Only elephant detections are accepted"
            });
        }

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

        return res.status(201).json({
            success: true,
            message: "Elephant detection stored successfully",
            detection
        });
    } catch (error) {
        console.error("Elephant detection error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to store elephant detection",
            error: error.message
        });
    }
});

router.get("/", async (req, res) => {
    try {
        const detections = await ElephantDetection
            .find()
            .sort({ timestamp: -1 });

        return res.json({
            success: true,
            count: detections.length,
            detections
        });
    } catch (error) {
        console.error("Get detections error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve elephant detections",
            error: error.message
        });
    }
});

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

        return res.json({
            success: true,
            detection
        });
    } catch (error) {
        console.error("Get detection error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve elephant detection",
            error: error.message
        });
    }
});

router.patch("/:id/verify", async (req, res) => {
    let previousDetection;

    try {
        const {
            verificationStatus,
            verifiedBy
        } = req.body;

        if (
            !["VERIFIED", "REJECTED"].includes(verificationStatus)
        ) {
            return res.status(400).json({
                success: false,
                message: "verificationStatus must be VERIFIED or REJECTED"
            });
        }

        if (
            typeof verifiedBy !== "string" ||
            !verifiedBy.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "verifiedBy is required"
            });
        }

        previousDetection = await ElephantDetection.findById(
            req.params.id
        );

        if (!previousDetection) {
            return res.status(404).json({
                success: false,
                message: "Elephant detection not found"
            });
        }

        if (
            previousDetection.verificationStatus === "VERIFIED" ||
            previousDetection.verificationStatus === "REJECTED"
        ) {
            return res.status(400).json({
                success: false,
                message: `This elephant detection has already been ${previousDetection.verificationStatus.toLowerCase()}`
            });
        }

        const verifiedAt = new Date();

        const detection = await ElephantDetection.findByIdAndUpdate(
            req.params.id,
            {
                verificationStatus,
                verifiedBy: verifiedBy.trim(),
                verifiedAt
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

        try {
            console.log(
                `⛓️ Recording ${verificationStatus.toLowerCase()} detection on Hyperledger Fabric...`
            );

            const blockchainEvent = await submitDetectionDecision({
                detectionId: detection._id.toString(),
                zone: detection.zone,
                verifiedBy: detection.verifiedBy,
                timestamp: detection.verifiedAt.toISOString(),
                status: verificationStatus
            });

            console.log(
                "✅ Blockchain audit record created:",
                blockchainEvent
            );

            const message =
                verificationStatus === "VERIFIED"
                    ? "Elephant detection verified and recorded on blockchain successfully"
                    : "Elephant detection rejected and recorded on blockchain successfully";

            return res.json({
                success: true,
                message,
                detection,
                blockchain: {
                    recorded: true,
                    event: blockchainEvent
                }
            });
        } catch (blockchainError) {
            console.error(
                "❌ Blockchain recording failed:",
                blockchainError.message
            );

            try {
                await ElephantDetection.findByIdAndUpdate(
                    req.params.id,
                    {
                        verificationStatus:
                            previousDetection.verificationStatus || "PENDING",
                        verifiedBy: previousDetection.verifiedBy || null,
                        verifiedAt: previousDetection.verifiedAt || null
                    },
                    { runValidators: true }
                );

                console.log(
                    "↩️ MongoDB decision rolled back because blockchain recording failed"
                );
            } catch (rollbackError) {
                console.error(
                    "❌ MongoDB rollback failed:",
                    rollbackError.message
                );
            }

            return res.status(500).json({
                success: false,
                message:
                    "The decision could not be completed because blockchain recording failed",
                error: blockchainError.message
            });
        }
    } catch (error) {
        console.error("Verification error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to process detection decision",
            error: error.message
        });
    }
});

module.exports = router;