const express = require("express");
const {
    getAllEvents,
    readEvent
} = require("../blockchain/blockchain");

const router = express.Router();

router.get("/events", async (req, res) => {
    try {
        const events = await getAllEvents();

        res.json({
            success: true,
            count: events.length,
            events
        });
    } catch (error) {
        console.error(
            "Blockchain events error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to retrieve blockchain audit events",
            error: error.message
        });
    }
});

router.get("/events/:id", async (req, res) => {
    try {
        const event = await readEvent(req.params.id);

        res.json({
            success: true,
            event
        });
    } catch (error) {
        console.error(
            "Blockchain event error:",
            error.message
        );

        res.status(404).json({
            success: false,
            message: "Blockchain audit event not found",
            error: error.message
        });
    }
});

module.exports = router;
