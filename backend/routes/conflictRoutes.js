const express = require("express");

const ConflictReport = require("../models/ConflictReport");
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");
const {
    submitConservationDecision
} = require("../blockchain/blockchain");

const router = express.Router();

// CREATE CONFLICT REPORT
router.post("/", protect, upload.single("evidence"), async (req, res) => {
    try {
        const {
            title,
            description,
            location,
            incidentDate,
            incidentType,
            evidenceUrl
        } = req.body;

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

        let uploadedEvidenceUrl = evidenceUrl || null;
        if (req.file) {
            if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
                return res.status(500).json({ message: "Image storage is not configured. Set the Cloudinary environment variables." });
            }
            uploadedEvidenceUrl = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "forestsphere/conflict-evidence", resource_type: "image" },
                    (error, result) => error ? reject(error) : resolve(result.secure_url)
                );
                Readable.from(req.file.buffer).pipe(stream);
            });
        }

        const report = await ConflictReport.create({
            reportedBy: req.user.userId,
            title,
            description,
            location,
            incidentDate,
            incidentType,
            evidenceUrl: uploadedEvidenceUrl
        });

        return res.status(201).json({
            message: "Conflict report submitted successfully",
            report
        });
    } catch (error) {
        console.error("Create conflict report error:", error);
        return res.status(500).json({
            message: "Server error while creating conflict report"
        });
    }
});

// GET MY CONFLICT REPORTS
router.get("/my-reports", protect, async (req, res) => {
    try {
        const reports = await ConflictReport.find({
            reportedBy: req.user.userId
        })
            .populate("reportedBy", "name email")
            .sort({ createdAt: -1 });

        return res.json({
            count: reports.length,
            reports
        });
    } catch (error) {
        console.error("Get reports error:", error);
        return res.status(500).json({
            message: "Server error while retrieving reports"
        });
    }
});

// GET ALL CONFLICT REPORTS
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

            return res.json({
                count: reports.length,
                reports
            });
        } catch (error) {
            console.error("Get all reports error:", error);
            return res.status(500).json({
                message: "Server error while retrieving reports"
            });
        }
    }
);

// GET SINGLE REPORT
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

        if (
            req.user.role === "community" &&
            report.reportedBy._id.toString() !== req.user.userId
        ) {
            return res.status(403).json({
                message: "You are not authorized to view this report"
            });
        }

        return res.json({ report });
    } catch (error) {
        console.error("Get single report error:", error);
        return res.status(500).json({
            message: "Server error while retrieving report"
        });
    }
});

// SHARED VERIFY / REJECT HANDLER
async function decideConflictReport(req, res, status) {
    try {
        const report = await ConflictReport.findById(req.params.id);

        if (!report) {
            return res.status(404).json({
                message: "Conflict report not found"
            });
        }

        if (report.status !== "PENDING") {
            return res.status(400).json({
                message: `This report has already been ${report.status.toLowerCase()}`
            });
        }

        const decidedAt = new Date();

        // Record the decision in Fabric first.
        const event = await submitConservationDecision({
            recordId: report._id.toString(),
            recordType: "CONFLICT_REPORT",
            location: report.location,
            decidedBy: req.user.userId,
            timestamp: decidedAt.toISOString(),
            status
        });

        // Update MongoDB only after Fabric confirms the transaction.
        report.status = status;
        report.verifiedBy = req.user.userId;
        report.verificationDate = decidedAt;
        report.rejectionReason =
            status === "REJECTED"
                ? (req.body.rejectionReason || "No reason provided")
                : null;

        // Store a reference to the blockchain event ID.
        report.blockchainHash = event.eventId;

        await report.save();

        return res.json({
            message: `Conflict report ${status.toLowerCase()} and recorded on blockchain successfully`,
            report,
            blockchain: {
                recorded: true,
                event
            }
        });
    } catch (error) {
        console.error(
            `Conflict report ${status.toLowerCase()} error:`,
            error
        );

        return res.status(500).json({
            message: `Could not ${status.toLowerCase()} conflict report and record it on blockchain`,
            error: error.message
        });
    }
}

// VERIFY REPORT
router.put(
    "/:id/verify",
    protect,
    authorize("officer", "admin"),
    (req, res) => decideConflictReport(req, res, "VERIFIED")
);

// REJECT REPORT
router.put(
    "/:id/reject",
    protect,
    authorize("officer", "admin"),
    (req, res) => decideConflictReport(req, res, "REJECTED")
);

module.exports = router;