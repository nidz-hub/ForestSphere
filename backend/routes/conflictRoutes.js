const express = require("express");

const ConflictReport = require("../models/ConflictReport");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// CREATE CONFLICT REPORT
// ==========================================

router.post("/", protect, async (req, res) => {
    try {
        const {
            title,
            description,
            location,
            incidentDate,
            incidentType,
            evidenceUrl
        } = req.body;

        // Validate required fields
        if (
            !title ||
            !description ||
            !location ||
            !incidentDate ||
            !incidentType
        ) {
            return res.status(400).json({
                message: "Please provide all required conflict report details"
            });
        }

        // Create report
        const report = await ConflictReport.create({
            reportedBy: req.user.userId,
            title,
            description,
            location,
            incidentDate,
            incidentType,
            evidenceUrl: evidenceUrl || null
        });

        res.status(201).json({
            message: "Conflict report submitted successfully",
            report
        });

    } catch (error) {
        console.error("Create conflict report error:", error);

        res.status(500).json({
            message: "Server error while creating conflict report"
        });
    }
});


// ==========================================
// GET MY CONFLICT REPORTS
// ==========================================

router.get("/my-reports", protect, async (req, res) => {
    try {
        const reports = await ConflictReport.find({
            reportedBy: req.user.userId
        })
        .populate("reportedBy", "name email")
        .sort({ createdAt: -1 });

        res.json({
            count: reports.length,
            reports
        });

    } catch (error) {
        console.error("Get reports error:", error);

        res.status(500).json({
            message: "Server error while retrieving reports"
        });
    }
});


// ==========================================
// GET ALL CONFLICT REPORTS
// OFFICER / ADMIN ONLY
// ==========================================

router.get(
    "/",
    protect,
    authorize("officer", "admin"),
    async (req, res) => {
        try {
            const reports = await ConflictReport.find()
                .populate("reportedBy", "name email phone")
                .populate("verifiedBy", "name email")
                .sort({ createdAt: -1 });

            res.json({
                count: reports.length,
                reports
            });

        } catch (error) {
            console.error("Get all reports error:", error);

            res.status(500).json({
                message: "Server error while retrieving reports"
            });
        }
    }
);


// ==========================================
// GET SINGLE REPORT
// ==========================================

router.get("/:id", protect, async (req, res) => {
    try {
        const report = await ConflictReport.findById(req.params.id)
            .populate("reportedBy", "name email phone")
            .populate("verifiedBy", "name email");

        if (!report) {
            return res.status(404).json({
                message: "Conflict report not found"
            });
        }

        // Community users can only see their own reports
        if (
            req.user.role === "community" &&
            report.reportedBy._id.toString() !== req.user.userId
        ) {
            return res.status(403).json({
                message: "You are not authorized to view this report"
            });
        }

        res.json({
            report
        });

    } catch (error) {
        console.error("Get single report error:", error);

        res.status(500).json({
            message: "Server error while retrieving report"
        });
    }
});


// ==========================================
// VERIFY REPORT
// OFFICER / ADMIN ONLY
// ==========================================

router.put(
    "/:id/verify",
    protect,
    authorize("officer", "admin"),
    async (req, res) => {
        try {
            const report = await ConflictReport.findById(req.params.id);

            if (!report) {
                return res.status(404).json({
                    message: "Conflict report not found"
                });
            }

            report.status = "VERIFIED";
            report.verifiedBy = req.user.userId;
            report.verificationDate = new Date();
            report.rejectionReason = null;

            await report.save();

            res.json({
                message: "Conflict report verified successfully",
                report
            });

        } catch (error) {
            console.error("Verify report error:", error);

            res.status(500).json({
                message: "Server error while verifying report"
            });
        }
    }
);


// ==========================================
// REJECT REPORT
// OFFICER / ADMIN ONLY
// ==========================================

router.put(
    "/:id/reject",
    protect,
    authorize("officer", "admin"),
    async (req, res) => {
        try {
            const { rejectionReason } = req.body;

            const report = await ConflictReport.findById(req.params.id);

            if (!report) {
                return res.status(404).json({
                    message: "Conflict report not found"
                });
            }

            report.status = "REJECTED";
            report.verifiedBy = req.user.userId;
            report.verificationDate = new Date();
            report.rejectionReason =
                rejectionReason || "No reason provided";

            await report.save();

            res.json({
                message: "Conflict report rejected",
                report
            });

        } catch (error) {
            console.error("Reject report error:", error);

            res.status(500).json({
                message: "Server error while rejecting report"
            });
        }
    }
);


module.exports = router;