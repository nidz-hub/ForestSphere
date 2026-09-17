const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");

dotenv.config();

const createOfficer = async () => {
    try {
        await connectDB();

        const email = "officer@forestsphere.com";
        const password = "Officer@123";

        const hashedPassword = await bcrypt.hash(password, 10);

        const existingOfficer = await User.findOne({ email });

        if (existingOfficer) {
            existingOfficer.password = hashedPassword;
            existingOfficer.role = "officer";
            existingOfficer.name = "Forest Officer";

            await existingOfficer.save();

            console.log("Officer account password updated successfully.");
            console.log("Email:", email);
            console.log("Password:", password);
            console.log("Role:", existingOfficer.role);

            process.exit(0);
        }

        const officer = await User.create({
            name: "Forest Officer",
            email,
            password: hashedPassword,
            role: "officer"
        });

        console.log("Forest Officer created successfully.");
        console.log("Email:", officer.email);
        console.log("Password:", password);
        console.log("Role:", officer.role);

        process.exit(0);

    } catch (error) {
        console.error("Error creating/updating officer:", error.message);
        process.exit(1);
    }
};

createOfficer();