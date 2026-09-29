"use strict";

const express = require("express");
const mongoose = require("mongoose");

const Business = require("../models/Business");
const Service = require("../models/Service");

const router = express.Router();

function isValidId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}


/*
=========================================================
PUBLIC BUSINESS WEBSITE
GET /api/public/businesses/:id
=========================================================
*/

router.get("/:id", async (req, res) => {

    try {

        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid business ID."
            });
        }


        /*
        -------------------------------------------------
        Only businesses that are:
        ACTIVE
        WEBSITE ENABLED
        WEBSITE NOT HIDDEN
        -------------------------------------------------
        */

        const business = await Business
            .findOne({
                _id: id,
                status: "active",
                "website.enabled": true,
                "website.hidden": false
            })
            .select(
                "_id name type status website"
            )
            .lean();


        if (!business) {

            return res.status(404).json({
                success: false,
                message:
                    "This business website is currently unavailable."
            });

        }


        /*
        -------------------------------------------------
        CUSTOMER SERVICES
        Only active services are public.
        -------------------------------------------------
        */

        const services = await Service
            .find({
                business: business._id,
                status: "active"
            })
            .select(
                "_id name description category price duration status"
            )
            .sort({
                createdAt: -1
            })
            .lean();


        return res.json({
            success: true,

            business: {
                _id: business._id,
                name: business.name,
                type: business.type
            },

            services: Array.isArray(services)
                ? services
                : []
        });


    } catch (error) {

        console.error(
            "GET /api/public/businesses/:id error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load business website."
        });

    }

});


module.exports = router;
