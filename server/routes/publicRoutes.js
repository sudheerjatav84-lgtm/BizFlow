const express = require("express");
const mongoose = require("mongoose");
const Business = require("../models/Business");

const router = express.Router();

/*
 * PUBLIC BUSINESS
 * GET /api/public/businesses/:id
 *
 * Only businesses whose website is:
 * enabled = true
 * hidden = false
 *
 * Owner information is never returned.
 */

router.get("/businesses/:id", async (req, res) => {

    try {

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {

            return res.status(400).json({
                success: false,
                message: "Invalid business ID."
            });
        }

        const business = await Business
            .findOne({
                _id: id,
                status: "active",
                "website.enabled": true,
                "website.hidden": false
            })
            .select(
                "_id name type status website createdAt updatedAt"
            )
            .lean();

        if (!business) {

            return res.status(404).json({
                success: false,
                message: "Business website is not available."
            });
        }

        res.json({
            success: true,
            business
        });

    } catch (error) {

        console.error(
            "GET /api/public/businesses/:id error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to load business website."
        });
    }
});

module.exports = router;
