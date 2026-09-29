const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "..", "..", "server.env")
});

const Business = require("../models/Business");

const OWNER_ID = "6ab263995258af0181435c48";
const BUSINESS_ID = "6ab2478f926c96cdb64d1124";

async function run() {
    try {

        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is missing in server.env");
        }

        await mongoose.connect(
            process.env.MONGO_URI
        );

        console.log(
            "MongoDB connected for migration."
        );

        const business =
            await Business.findById(
                BUSINESS_ID
            );

        if (!business) {
            throw new Error(
                "Business not found."
            );
        }

        console.log(
            `Business found: ${business.name}`
        );

        business.owner = OWNER_ID;

        await business.save();

        console.log(
            "Business owner assigned successfully."
        );

        console.log(
            `Business: ${business.name}`
        );

        console.log(
            `Owner ID: ${business.owner}`
        );

        await mongoose.disconnect();

        console.log(
            "Migration completed."
        );

    } catch (error) {

        console.error(
            "Migration failed:",
            error.message
        );

        await mongoose.disconnect();

        process.exit(1);
    }
}

run();
