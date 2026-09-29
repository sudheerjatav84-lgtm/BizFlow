const express = require("express");
const mongoose = require("mongoose");
const Business = require("../models/Business");
const { requireOwnerAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireOwnerAuth);


/* =========================================================
   HELPERS
========================================================= */

function isValidId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}


function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}


/*
 * Strict string validation.
 *
 * IMPORTANT:
 * Do NOT use String(value) here.
 * Numbers, objects, arrays and booleans must remain invalid.
 */
function getRequiredString(value) {

    if (typeof value !== "string") {
        return null;
    }

    const cleaned = value.trim();

    return cleaned || null;
}


/*
 * Only these top-level fields are accepted when creating
 * a business.
 */
const CREATE_FIELDS = new Set([
    "name",
    "type",
    "businessTypeId"
]);


/*
 * Only these top-level fields are accepted when updating
 * a business.
 */
const UPDATE_FIELDS = new Set([
    "name",
    "type",
    "status",
    "website"
]);


/*
 * Only these website fields are accepted.
 */
const WEBSITE_FIELDS = new Set([
    "enabled",
    "hidden"
]);


/*
 * Reject unknown top-level fields.
 *
 * This prevents:
 * owner
 * role
 * isAdmin
 * password
 * token
 * $where
 * arbitrary Mongo/Mongoose fields
 * etc.
 */
function findUnknownFields(body, allowedFields) {

    return Object.keys(body).filter(
        key => !allowedFields.has(key)
    );
}


/*
 * Public/API response sanitizer.
 *
 * The database may contain owner because ownership is required
 * internally, but owner must never be returned to the client
 * through the Business API.
 */
function sanitizeBusiness(business) {

    if (!business) {
        return business;
    }

    const source =
        typeof business.toObject === "function"
            ? business.toObject()
            : business;

    const {
        owner,
        __v,
        ...safeBusiness
    } = source;

    return safeBusiness;
}


/*
 * Sanitize arrays of businesses.
 */
function sanitizeBusinesses(businesses) {

    return businesses.map(
        sanitizeBusiness
    );
}


/* =========================================================
   GET ALL BUSINESSES
   GET /api/businesses
========================================================= */

router.get("/", async (req, res) => {

    try {

        const businesses =
            await Business
                .find({
                    owner: req.owner._id
                })
                .sort({
                    createdAt: -1
                })
                .lean();

        res.json({
            success: true,
            businesses:
                sanitizeBusinesses(
                    businesses
                )
        });

    } catch (error) {

        console.error(
            "GET /api/businesses error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to load businesses."
        });
    }
});


/* =========================================================
   GET SINGLE BUSINESS
   GET /api/businesses/:id
========================================================= */

router.get("/:id", async (req, res) => {

    try {

        const { id } = req.params;

        if (!isValidId(id)) {

            return res.status(400).json({
                success: false,
                message: "Invalid business ID."
            });
        }


        const business =
            await Business
                .findOne({
                    _id: id,
                    owner: req.owner._id
                })
                .lean();


        if (!business) {

            return res.status(404).json({
                success: false,
                message: "Business not found."
            });
        }


        res.json({
            success: true,
            business:
                sanitizeBusiness(
                    business
                )
        });

    } catch (error) {

        console.error(
            "GET /api/businesses/:id error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to load business."
        });
    }
});


/* =========================================================
   CREATE BUSINESS
   POST /api/businesses

   FLOW:
   Owner Auth
      â†“
   Business Type validation
      â†“
   Create Business
      â†“
   Dashboard / Website keys saved

   Subscription is NOT activated here.
   Subscription activation will be handled separately.
========================================================= */

router.post("/", async (req, res) => {

    try {

        /*
         * Request body itself must be a normal object.
         */
        if (
            !isPlainObject(req.body)
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid request body."
            });
        }


        /*
         * Reject every unknown field.
         */
        const unknownFields =
            findUnknownFields(
                req.body,
                CREATE_FIELDS
            );


        if (unknownFields.length) {

            return res.status(400).json({
                success: false,
                message:
                    "Unknown field(s) are not allowed."
            });
        }


        /*
         * Business name.
         */
        const name =
            getRequiredString(
                req.body.name
            );


        /*
         * Legacy type field.
         *
         * This remains supported so the existing
         * frontend does not break.
         */
        const type =
            getRequiredString(
                req.body.type
            );


        /*
         * New Business Type ID.
         */
        const businessTypeId =
            getRequiredString(
                req.body.businessTypeId
            );


        if (
            !name ||
            !type ||
            !businessTypeId
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Business name, type and businessTypeId are required."
            });
        }


        /*
         * Validate MongoDB ObjectId.
         */
        if (
            !mongoose.Types.ObjectId.isValid(
                businessTypeId
            )
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid business type."
            });
        }


        /*
         * Load selected Business Type.
         */
        const BusinessType =
            require("../models/BusinessType");


        const businessType =
            await BusinessType.findOne({
                _id: businessTypeId,
                enabled: true
            }).lean();


        if (!businessType) {

            return res.status(400).json({
                success: false,
                message:
                    "Selected business type is unavailable."
            });
        }


        /*
         * Create business.
         *
         * IMPORTANT:
         * owner always comes from authenticated JWT.
         *
         * Client cannot provide owner ID.
         */
        const business =
            await Business.create({

                owner:
                    req.owner._id,

                name,

                type,

                businessType:
                    businessType._id,

                dashboardKey:
                    businessType.dashboardKey,

                websiteKey:
                    businessType.websiteKey,

                subscription: {
                    enabled: false,
                    status: "inactive",
                    plan: null,
                    startDate: null,
                    endDate: null
                }

            });


        res.status(201).json({

            success: true,

            message:
                "Business created successfully.",

            business:
                sanitizeBusiness(
                    business
                )

        });

    } catch (error) {

        console.error(
            "POST /api/businesses error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to create business."

        });

    }

});


/* =========================================================
   UPDATE BUSINESS
   PATCH /api/businesses/:id
========================================================= */

router.patch("/:id", async (req, res) => {

    try {

        const { id } = req.params;


        if (!isValidId(id)) {

            return res.status(400).json({
                success: false,
                message: "Invalid business ID."
            });
        }


        /*
         * Request body must be an object.
         */
        if (
            !isPlainObject(req.body)
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid request body."
            });
        }


        /*
         * Strict whitelist.
         */
        const unknownFields =
            findUnknownFields(
                req.body,
                UPDATE_FIELDS
            );


        if (unknownFields.length) {

            return res.status(400).json({
                success: false,
                message:
                    "Unknown field(s) are not allowed."
            });
        }


        const updates = {};


        /* =====================================================
           NAME
        ===================================================== */

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "name"
            )
        ) {

            const name =
                getRequiredString(
                    req.body.name
                );


            if (!name) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Business name must be a non-empty string."
                });
            }


            updates.name = name;
        }


        /* =====================================================
           TYPE
        ===================================================== */

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "type"
            )
        ) {

            const type =
                getRequiredString(
                    req.body.type
                );


            if (!type) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Business type must be a non-empty string."
                });
            }


            updates.type = type;
        }


        /* =====================================================
           STATUS
        ===================================================== */

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "status"
            )
        ) {

            if (
                typeof req.body.status !==
                "string"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Status must be a string."
                });
            }


            const status =
                req.body.status.trim();


            if (
                status !== "active" &&
                status !== "inactive"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Status must be active or inactive."
                });
            }


            updates.status = status;
        }


        /* =====================================================
           WEBSITE
        ===================================================== */

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "website"
            )
        ) {

            if (
                !isPlainObject(
                    req.body.website
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid website settings."
                });
            }


            const unknownWebsiteFields =
                findUnknownFields(
                    req.body.website,
                    WEBSITE_FIELDS
                );


            if (
                unknownWebsiteFields.length
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Unknown website field(s) are not allowed."
                });
            }


            const website = {};


            if (
                Object.prototype.hasOwnProperty.call(
                    req.body.website,
                    "enabled"
                )
            ) {

                if (
                    typeof req.body.website.enabled !==
                    "boolean"
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Website enabled must be boolean."
                    });
                }


                website.enabled =
                    req.body.website.enabled;
            }


            if (
                Object.prototype.hasOwnProperty.call(
                    req.body.website,
                    "hidden"
                )
            ) {

                if (
                    typeof req.body.website.hidden !==
                    "boolean"
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Website hidden must be boolean."
                    });
                }


                website.hidden =
                    req.body.website.hidden;
            }


            if (
                !Object.keys(website).length
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "No valid website settings provided."
                });
            }


            updates.website = website;
        }


        /* =====================================================
           EMPTY UPDATE
        ===================================================== */

        if (
            !Object.keys(updates).length
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "No valid changes provided."
            });
        }


        /* =====================================================
           OWNER-SCOPED UPDATE
        ===================================================== */

        const business =
            await Business
                .findOneAndUpdate(
                    {
                        _id: id,
                        owner: req.owner._id
                    },
                    {
                        $set: updates
                    },
                    {
                        new: true,
                        runValidators: true
                    }
                )
                .lean();


        if (!business) {

            return res.status(404).json({
                success: false,
                message:
                    "Business not found."
            });
        }


        res.json({
            success: true,
            message:
                "Business updated successfully.",
            business:
                sanitizeBusiness(
                    business
                )
        });

    } catch (error) {

        console.error(
            "PATCH /api/businesses/:id error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to update business."
        });
    }
});


/* =========================================================
   DELETE BUSINESS
   DELETE /api/businesses/:id
========================================================= */

router.delete("/:id", async (req, res) => {

    try {

        const { id } = req.params;


        if (!isValidId(id)) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid business ID."
            });
        }


        const business =
            await Business.findOneAndDelete({
                _id: id,
                owner: req.owner._id
            });


        if (!business) {

            return res.status(404).json({
                success: false,
                message:
                    "Business not found."
            });
        }


        res.json({
            success: true,
            message:
                "Business deleted successfully.",
            business:
                sanitizeBusiness(
                    business
                )
        });

    } catch (error) {

        console.error(
            "DELETE /api/businesses/:id error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to delete business."
        });
    }
});


module.exports = router;
