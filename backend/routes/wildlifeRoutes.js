const express = require("express");

const WildlifeSighting = require("../models/WildlifeSighting");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// CREATE WILDLIFE SIGHTING
// ==========================================

router.post("/", protect, async (req, res) => {
    try {
        const {
            species,
            location,
            sightingDate,
            description,
            imageUrl
        } = req.body;

        if (!species || !location || !sightingDate || !description) {
            return res.status(400).json({
                message: "Please provide all required sighting details"
            });
        }

        const sighting = await WildlifeSighting.create({
            reportedBy: req.user.userId,
            species,
            location,
            sightingDate,
            description,
            imageUrl: imageUrl || null
        });

        res.status(201).json({
            message: "Wildlife sighting submitted successfully",
            sighting
        });

    } catch (error) {
        console.error("Create wildlife sighting error:", error);

        res.status(500).json({
            message: "Server error while creating wildlife sighting"
        });
    }
});


// ==========================================
// GET MY SIGHTINGS
// ==========================================

router.get("/my-sightings", protect, async (req, res) => {
    try {
        const sightings = await WildlifeSighting.find({
            reportedBy: req.user.userId
        })
        .populate("reportedBy", "name email")
        .sort({ createdAt: -1 });

        res.json({
            count: sightings.length,
            sightings
        });

    } catch (error) {
        console.error("Get my sightings error:", error);

        res.status(500).json({
            message: "Server error while retrieving sightings"
        });
    }
});


// ==========================================
// GET ALL SIGHTINGS
// OFFICER / ADMIN ONLY
// ==========================================

router.get(
    "/",
    protect,
    authorize("officer", "admin"),
    async (req, res) => {
        try {
            const sightings = await WildlifeSighting.find()
                .populate("reportedBy", "name email phone")
                .populate("verifiedBy", "name email")
                .sort({ createdAt: -1 });

            res.json({
                count: sightings.length,
                sightings
            });

        } catch (error) {
            console.error("Get all sightings error:", error);

            res.status(500).json({
                message: "Server error while retrieving sightings"
            });
        }
    }
);


// ==========================================
// VERIFY WILDLIFE SIGHTING
// OFFICER / ADMIN ONLY
// ==========================================

router.put(
    "/:id/verify",
    protect,
    authorize("officer", "admin"),
    async (req, res) => {
        try {
            const sighting = await WildlifeSighting.findById(
                req.params.id
            );

            if (!sighting) {
                return res.status(404).json({
                    message: "Wildlife sighting not found"
                });
            }

            sighting.status = "VERIFIED";
            sighting.verifiedBy = req.user.userId;

            await sighting.save();

            res.json({
                message: "Wildlife sighting verified successfully",
                sighting
            });

        } catch (error) {
            console.error("Verify sighting error:", error);

            res.status(500).json({
                message: "Server error while verifying sighting"
            });
        }
    }
);


// ==========================================
// REJECT WILDLIFE SIGHTING
// OFFICER / ADMIN ONLY
// ==========================================

router.put(
    "/:id/reject",
    protect,
    authorize("officer", "admin"),
    async (req, res) => {
        try {
            const sighting = await WildlifeSighting.findById(
                req.params.id
            );

            if (!sighting) {
                return res.status(404).json({
                    message: "Wildlife sighting not found"
                });
            }

            sighting.status = "REJECTED";
            sighting.verifiedBy = req.user.userId;

            await sighting.save();

            res.json({
                message: "Wildlife sighting rejected",
                sighting
            });

        } catch (error) {
            console.error("Reject sighting error:", error);

            res.status(500).json({
                message: "Server error while rejecting sighting"
            });
        }
    }
);


module.exports = router;