const express = require("express");
const ElephantDetection = require("../models/ElephantDetection");
const {
    submitVerifiedDetection
} = require("../blockchain/blockchain");

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

        console.log(
            "🐘 Elephant detection stored:",
            detection._id
        );

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
//
// VERIFIED:
// MongoDB -> Hyperledger Fabric
//
// REJECTED:
// MongoDB only
// ==========================================

router.patch("/:id/verify", async (req, res) => {
    try {
        const {
            verificationStatus,
            verifiedBy
        } = req.body;

        // ------------------------------------------
        // Validate verification status
        // ------------------------------------------

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

        // ------------------------------------------
        // Validate officer
        // ------------------------------------------

        if (!verifiedBy) {
            return res.status(400).json({
                success: false,
                message: "verifiedBy is required"
            });
        }

        // ------------------------------------------
        // Find detection first
        // ------------------------------------------

        const existingDetection =
            await ElephantDetection.findById(
                req.params.id
            );

        if (!existingDetection) {
            return res.status(404).json({
                success: false,
                message: "Elephant detection not found"
            });
        }

        // ------------------------------------------
        // Prevent duplicate verification
        // ------------------------------------------

        if (
            existingDetection.verificationStatus ===
            "VERIFIED"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "This elephant detection has already been verified"
            });
        }

        if (
            existingDetection.verificationStatus ===
            "REJECTED"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "This elephant detection has already been rejected"
            });
        }

        // ------------------------------------------
        // Update MongoDB verification
        // ------------------------------------------

        const verifiedAt = new Date();

        const detection =
            await ElephantDetection.findByIdAndUpdate(
                req.params.id,
                {
                    verificationStatus,
                    verifiedBy,
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

        // ------------------------------------------
        // REJECTED
        //
        // Rejected detections are not written
        // to the blockchain.
        // ------------------------------------------

        if (verificationStatus === "REJECTED") {
            return res.json({
                success: true,
                message:
                    "Elephant detection rejected successfully",
                detection,
                blockchain: {
                    recorded: false,
                    reason:
                        "Rejected detections are not recorded on the blockchain"
                }
            });
        }

        // ------------------------------------------
        // VERIFIED
        //
        // Create immutable audit event on
        // Hyperledger Fabric.
        // ------------------------------------------

        try {
            console.log(
                "⛓️ Recording verified detection on Hyperledger Fabric..."
            );

            const blockchainEvent =
                await submitVerifiedDetection({
                    detectionId: detection._id.toString(),
                    zone: detection.zone,
                    verifiedBy: detection.verifiedBy,
                    timestamp:
                        detection.verifiedAt.toISOString(),
                    status: "VERIFIED"
                });

            console.log(
                "✅ Blockchain audit record created:",
                blockchainEvent
            );

            return res.json({
                success: true,
                message:
                    "Elephant detection verified and recorded on blockchain successfully",
                detection,
                blockchain: {
                    recorded: true,
                    event: blockchainEvent
                }
            });

        } catch (blockchainError) {

            // ------------------------------------------
            // Fabric submission failed.
            //
            // Roll MongoDB status back to PENDING
            // so the system does not show VERIFIED
            // without the corresponding blockchain
            // audit record.
            // ------------------------------------------

            console.error(
                "❌ Blockchain recording failed:",
                blockchainError.message
            );

            try {
                await ElephantDetection.findByIdAndUpdate(
                    req.params.id,
                    {
                        verificationStatus: "PENDING",
                        verifiedBy: null,
                        verifiedAt: null
                    }
                );

                console.log(
                    "↩️ MongoDB verification rolled back to PENDING"
                );

            } catch (rollbackError) {
                console.error(
                    "❌ Failed to roll back MongoDB verification:",
                    rollbackError.message
                );
            }

            return res.status(500).json({
                success: false,
                message:
                    "Verification could not be completed because the blockchain audit record failed",
                error: blockchainError.message
            });
        }

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