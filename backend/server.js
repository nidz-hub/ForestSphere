const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const { protect } = require("./middleware/authMiddleware");
const conflictRoutes = require("./routes/conflictRoutes");
const wildlifeRoutes = require("./routes/wildlifeRoutes");
const restorationRoutes = require("./routes/restorationRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

dotenv.config();

connectDB();
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/auth", authRoutes);
app.use("/api/conflicts", conflictRoutes);
app.use("/api/wildlife", wildlifeRoutes);
app.use("/api/restoration", restorationRoutes);
app.use("/api/upload", uploadRoutes);

// Static folder for uploaded files
app.use("/uploads", express.static("uploads"));

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "ForestSphere API is running"
    });
});
app.get("/api/test-protected", protect, (req, res) => {
    res.json({
        message: "You accessed a protected ForestSphere route!",
        user: req.user
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`ForestSphere server running on port ${PORT}`);
});