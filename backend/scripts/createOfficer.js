const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");

dotenv.config();

const createOfficer = async () => {
    try {
        await connectDB();

        const email = process.env.OFFICER_EMAIL;
        const password = process.env.OFFICER_PASSWORD;

        // Check whether officer already exists
        const existingOfficer = await User.findOne({ email });

        if (existingOfficer) {
            console.log("Officer account already exists.");
            process.exit(0);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create officer
        const officer = await User.create({
            name: "Forest Officer",
            email,
            password: hashedPassword,
            role: "officer"
        });

        console.log("Forest Officer created successfully.");
        console.log("Email:", officer.email);
        console.log("Role:", officer.role);

        process.exit(0);

    } catch (error) {
        console.error("Error creating officer:", error.message);
        process.exit(1);
    }
};

createOfficer();