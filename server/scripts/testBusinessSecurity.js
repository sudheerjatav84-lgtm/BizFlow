const mongoose = require("mongoose");
const Business = require("../models/Business");

const MONGO_URI =
    process.env.MONGO_URI ||
    "mongodb://127.0.0.1:27017/bizflow";

async function run() {
    try {
        await mongoose.connect(MONGO_URI);

        console.log("");
        console.log("========== BUSINESS SECURITY DATABASE TEST ==========");

        const businesses = await Business
            .find({})
            .select("_id owner name type status website")
            .lean();

        console.log("");
        console.log(`Businesses found: ${businesses.length}`);

        if (!businesses.length) {
            console.log("");
            console.log("INFO: No businesses exist yet.");
            console.log("Create one from the BizFlow dashboard first.");
            console.log("");
            return;
        }

        let failures = 0;

        for (const business of businesses) {
            console.log("");
            console.log("--------------------------------------------------");
            console.log(`Business: ${business.name}`);
            console.log(`ID:       ${business._id}`);
            console.log(`Owner:    ${business.owner}`);
            console.log(`Type:     ${business.type}`);
            console.log(`Status:   ${business.status}`);

            if (business.owner) {
                console.log(
                    "PASS: Business has an owner."
                );
            } else {
                console.log(
                    "FAIL: Business has no owner."
                );
                failures++;
            }
        }

        console.log("");
        console.log("========== RESULT ==========");

        if (failures === 0) {
            console.log(
                "PASS: All existing businesses have ownership assigned."
            );
        } else {
            console.log(
                `FAIL: ${failures} ownership issue(s) found.`
            );
        }

    } catch (error) {
        console.error("");
        console.error("SECURITY TEST ERROR:");
        console.error(error.message);
        process.exitCode = 1;

    } finally {
        await mongoose.disconnect();
    }
}

run();
