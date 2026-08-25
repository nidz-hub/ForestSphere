const express = require("express");

const RestorationProject = require("../models/RestorationProject");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// CREATE RESTORATION PROJECT
// OFFICER / ADMIN ONLY
// ==========================================

router.post(
    "/",
    protect,
    authorize("officer", "admin"),
    async (req, res) => {
        try {
            const {
                projectName,
                description,
                location,
                startDate,
                targetDate
            } = req.body;

            if (
                !projectName ||
                !description ||
                !location ||
                !startDate ||
                !targetDate
            ) {
                return res.status(400).json({
                    message: "Please provide all required project details"
                });
            }

            const project = await RestorationProject.create({
                projectName,
                description,
                location,
                startDate,
                targetDate,
                createdBy: req.user.userId
            });

            res.status(201).json({
                message: "Restoration project created successfully",
                project
            });

        } catch (error) {
            console.error("Create project error:", error);

            res.status(500).json({
                message: "Server error while creating restoration project"
            });
        }
    }
);


// ==========================================
// GET ALL RESTORATION PROJECTS
// AUTHENTICATED USERS
// ==========================================

router.get("/", protect, async (req, res) => {
    try {
        const projects = await RestorationProject.find()
            .populate("createdBy", "name email role")
            .sort({ createdAt: -1 });

        res.json({
            count: projects.length,
            projects
        });

    } catch (error) {
        console.error("Get projects error:", error);

        res.status(500).json({
            message: "Server error while retrieving projects"
        });
    }
});


// ==========================================
// GET SINGLE PROJECT
// ==========================================

router.get("/:id", protect, async (req, res) => {
    try {
        const project = await RestorationProject.findById(req.params.id)
            .populate("createdBy", "name email role");

        if (!project) {
            return res.status(404).json({
                message: "Restoration project not found"
            });
        }

        res.json({
            project
        });

    } catch (error) {
        console.error("Get project error:", error);

        res.status(500).json({
            message: "Server error while retrieving project"
        });
    }
});


// ==========================================
// UPDATE PROJECT PROGRESS
// OFFICER / ADMIN ONLY
// ==========================================

router.put(
    "/:id/progress",
    protect,
    authorize("officer", "admin"),
    async (req, res) => {
        try {
            const { progress } = req.body;

            if (
                progress === undefined ||
                progress < 0 ||
                progress > 100
            ) {
                return res.status(400).json({
                    message: "Progress must be between 0 and 100"
                });
            }

            const project = await RestorationProject.findById(
                req.params.id
            );

            if (!project) {
                return res.status(404).json({
                    message: "Restoration project not found"
                });
            }

            project.progress = progress;

            if (progress === 0) {
                project.status = "PLANNED";
            } else if (progress < 100) {
                project.status = "IN_PROGRESS";
            } else {
                project.status = "COMPLETED";
            }

            await project.save();

            res.json({
                message: "Project progress updated successfully",
                project
            });

        } catch (error) {
            console.error("Update progress error:", error);

            res.status(500).json({
                message: "Server error while updating progress"
            });
        }
    }
);


// ==========================================
// ADD ACTIVITY TO PROJECT
// OFFICER / ADMIN ONLY
// ==========================================

router.post(
    "/:id/activities",
    protect,
    authorize("officer", "admin"),
    async (req, res) => {
        try {
            const {
                activityName,
                description,
                progress,
                evidenceUrl
            } = req.body;

            if (!activityName || !description) {
                return res.status(400).json({
                    message: "Activity name and description are required"
                });
            }

            const project = await RestorationProject.findById(
                req.params.id
            );

            if (!project) {
                return res.status(404).json({
                    message: "Restoration project not found"
                });
            }

            project.activities.push({
                activityName,
                description,
                progress: progress || 0,
                evidenceUrl: evidenceUrl || null
            });

            await project.save();

            res.status(201).json({
                message: "Restoration activity added successfully",
                project
            });

        } catch (error) {
            console.error("Add activity error:", error);

            res.status(500).json({
                message: "Server error while adding activity"
            });
        }
    }
);


// ==========================================
// COMPLETE ACTIVITY
// OFFICER / ADMIN ONLY
// ==========================================

router.put(
    "/:projectId/activities/:activityId/complete",
    protect,
    authorize("officer", "admin"),
    async (req, res) => {
        try {
            const project = await RestorationProject.findById(
                req.params.projectId
            );

            if (!project) {
                return res.status(404).json({
                    message: "Restoration project not found"
                });
            }

            const activity = project.activities.id(
                req.params.activityId
            );

            if (!activity) {
                return res.status(404).json({
                    message: "Restoration activity not found"
                });
            }

            activity.progress = 100;
            activity.status = "COMPLETED";
            activity.completedAt = new Date();

            await project.save();

            res.json({
                message: "Restoration activity completed successfully",
                project
            });

        } catch (error) {
            console.error("Complete activity error:", error);

            res.status(500).json({
                message: "Server error while completing activity"
            });
        }
    }
);


module.exports = router;