const express = require("express");
const streamifier = require("streamifier");

const cloudinary = require("../config/cloudinary");
const upload = require("../middleware/uploadMiddleware");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// UPLOAD FILE TO CLOUD STORAGE
// ==========================================

router.post(
    "/",
    protect,
    upload.any(),
    async (req, res) => {

        try {

            if (!req.file || req.files.length === 0) {
                return res.status(400).json({
                    message: "Please select a file to upload"
                });
            }

            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: "forestsphere"
                },
                (error, result) => {

                    if (error) {
                        console.error(
                            "Cloudinary upload error:",
                            error
                        );

                        return res.status(500).json({
                            message: "Cloud storage upload failed"
                        });
                    }

                    res.status(201).json({
                        message: "File uploaded successfully",
                        file: {
                            url: result.secure_url,
                            publicId: result.public_id,
                            format: result.format
                        }
                    });
                }
            );

            streamifier
                .createReadStream(req.files[0].buffer)
                .pipe(uploadStream);

        } catch (error) {

            console.error(
                "File upload error:",
                error
            );

            res.status(500).json({
                message: "Server error during file upload"
            });
        }
    }
);


module.exports = router;