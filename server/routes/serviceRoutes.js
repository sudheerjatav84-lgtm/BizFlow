const express = require("express");
const mongoose = require("mongoose");

const Service = require("../models/Service");
const Business = require("../models/Business");
const { requireOwnerAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireOwnerAuth);


/* =========================================================
   HELPERS
========================================================= */

function clean(value) {
    return String(value || "").trim();
}


function isValidId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}


/* =========================================================
   GET ALL SERVICES
   GET /api/services
========================================================= */

router.get("/", async (req, res) => {
    try {
        const filter = {};

        if (req.query.business) {
            if (!isValidId(req.query.business)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid business ID."
                });
            }

            const business = await Business
                .findOne({
                    _id: req.query.business,
                    owner: req.owner._id
                })
                .select("_id")
                .lean();

            if (!business) {
                return res.status(404).json({
                    success: false,
                    message: "Business not found."
                });
            }

            filter.business = business._id;
        } else {
            const ownedBusinesses = await Business
                .find({
                    owner: req.owner._id
                })
                .select("_id")
                .lean();

            filter.business = {
                $in: ownedBusinesses.map(
                    business => business._id
                )
            };
        }


        if (req.query.status) {
            const status = clean(req.query.status);

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

            filter.status = status;
        }


        const services = await Service
            .find(filter)
            .sort({
                createdAt: -1
            })
            .lean();


        res.json({
            success: true,
            services
        });

    } catch (error) {
        console.error(
            "GET /api/services error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to load services."
        });
    }
});


/* =========================================================
   GET SINGLE SERVICE
   GET /api/services/:id
========================================================= */

router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID."
            });
        }


        const service = await Service
            .findOne({
                _id: id
            })
            .populate({
                path: "business",
                match: {
                    owner: req.owner._id
                },
                select: "_id name type"
            })
            .lean();


        if (
            !service ||
            !service.business
        ) {
            return res.status(404).json({
                success: false,
                message: "Service not found."
            });
        }


        res.json({
            success: true,
            service
        });

    } catch (error) {
        console.error(
            "GET /api/services/:id error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to load service."
        });
    }
});


/* =========================================================
   CREATE SERVICE
   POST /api/services
========================================================= */

router.post("/", async (req, res) => {
    try {

        /*
         * -----------------------------------------------------
         * STRICT SERVICE CREATE FIELD WHITELIST
         *
         * Only these fields are accepted:
         * business
         * name
         * description
         * category
         * price
         * duration
         * status
         *
         * Any unknown / privilege / owner-controlled field
         * is rejected before processing.
         * -----------------------------------------------------
         */

        if (
            req.body === null ||
            typeof req.body !== "object" ||
            Array.isArray(req.body)
        ) {
            return res.status(400).json({
                success: false,
                message: "Request body must be an object."
            });
        }


        const allowedFields = new Set([
            "business",
            "name",
            "description",
            "category",
            "price",
            "duration",
            "status"
        ]);


        const receivedFields =
            Object.keys(req.body);


        const unexpectedFields =
            receivedFields.filter(
                field => !allowedFields.has(field)
            );


        if (unexpectedFields.length > 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Request contains unsupported fields.",
                fields: unexpectedFields
            });
        }


        /*
         * -----------------------------------------------------
         * STRICT INPUT TYPE VALIDATION
         * -----------------------------------------------------
         */

        if (
            typeof req.body.business !== "string" ||
            !req.body.business.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Business ID must be a valid string."
            });
        }

        if (
            typeof req.body.name !== "string" ||
            !req.body.name.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Service name must be a valid string."
            });
        }

        if (
            req.body.description !== undefined &&
            typeof req.body.description !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Description must be a string."
            });
        }

        if (
            req.body.category !== undefined &&
            typeof req.body.category !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Category must be a string."
            });
        }

        if (
            req.body.status !== undefined &&
            typeof req.body.status !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Status must be a string."
            });
        }


        const businessId =
            req.body.business.trim();

        const name =
            req.body.name.trim();

        const description =
            req.body.description === undefined
                ? ""
                : req.body.description.trim();

        const category =
            req.body.category === undefined
                ? ""
                : req.body.category.trim();


        /*
         * -----------------------------------------------------
         * BUSINESS ID VALIDATION
         * -----------------------------------------------------
         */

        if (!isValidId(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid business ID."
            });
        }


        /*
         * -----------------------------------------------------
         * SERVICE NAME VALIDATION
         * -----------------------------------------------------
         */

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Service name is required."
            });
        }


        /*
         * -----------------------------------------------------
         * OPTIONAL STATUS VALIDATION
         * -----------------------------------------------------
         */

        let status;

        if (req.body.status !== undefined) {

            status = req.body.status.trim();

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
        }


        /*
         * -----------------------------------------------------
         * OWNERSHIP CHECK
         * -----------------------------------------------------
         */

        const business = await Business
            .findOne({
                _id: businessId,
                owner: req.owner._id
            })
            .select("_id")
            .lean();

        if (!business) {
            return res.status(404).json({
                success: false,
                message: "Business not found."
            });
        }


        /*
         * -----------------------------------------------------
         * PRICE TYPE + RANGE VALIDATION
         * -----------------------------------------------------
         */

        let price = 0;

        if (
            req.body.price !== undefined &&
            req.body.price !== ""
        ) {

            if (
                typeof req.body.price !== "number" &&
                typeof req.body.price !== "string"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Price must be a valid number."
                });
            }

            price = Number(req.body.price);

            if (
                !Number.isFinite(price) ||
                price < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Price must be a valid number greater than or equal to 0."
                });
            }
        }


        /*
         * -----------------------------------------------------
         * DURATION TYPE + RANGE VALIDATION
         * -----------------------------------------------------
         */

        let duration = 0;

        if (
            req.body.duration !== undefined &&
            req.body.duration !== ""
        ) {

            if (
                typeof req.body.duration !== "number" &&
                typeof req.body.duration !== "string"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Duration must be a valid number."
                });
            }

            duration = Number(req.body.duration);

            if (
                !Number.isFinite(duration) ||
                duration < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Duration must be a valid number greater than or equal to 0."
                });
            }
        }


        /*
         * -----------------------------------------------------
         * CREATE SERVICE
         * -----------------------------------------------------
         */

        const serviceData = {
            business: business._id,
            name,
            description,
            category,
            price,
            duration
        };

        if (status !== undefined) {
            serviceData.status = status;
        }


        const service =
            await Service.create(serviceData);


        res.status(201).json({
            success: true,
            message: "Service created successfully.",
            service
        });

    } catch (error) {

        console.error(
            "POST /api/services error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to create service."
        });
    }
});

/* =========================================================
   UPDATE SERVICE
   PATCH /api/services/:id
========================================================= */

router.patch("/:id", async (req, res) => {
    try {

        const { id } = req.params;


        /*
         * -----------------------------------------------------
         * SERVICE ID VALIDATION
         * -----------------------------------------------------
         */

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID."
            });
        }


        /*
         * -----------------------------------------------------
         * BODY VALIDATION
         * -----------------------------------------------------
         */

        if (
            !req.body ||
            typeof req.body !== "object" ||
            Array.isArray(req.body)
        ) {
            return res.status(400).json({
                success: false,
                message: "Request body must be a valid object."
            });
        }


        /*
         * -----------------------------------------------------
         * STRICT FIELD WHITELIST
         * -----------------------------------------------------
         */

        const allowedFields = new Set([
            "business",
            "name",
            "description",
            "category",
            "price",
            "duration",
            "status"
        ]);

        const receivedFields =
            Object.keys(req.body);

        for (const field of receivedFields) {

            if (!allowedFields.has(field)) {
                return res.status(400).json({
                    success: false,
                    message:
                        `Unknown or unauthorized field: ${field}.`
                });
            }
        }


        /*
         * -----------------------------------------------------
         * EXISTING SERVICE
         * -----------------------------------------------------
         */

        const existingService =
            await Service
                .findById(id)
                .select("business")
                .lean();

        if (!existingService) {
            return res.status(404).json({
                success: false,
                message: "Service not found."
            });
        }


        /*
         * -----------------------------------------------------
         * CURRENT BUSINESS OWNERSHIP
         * -----------------------------------------------------
         */

        const existingBusiness =
            await Business
                .findOne({
                    _id: existingService.business,
                    owner: req.owner._id
                })
                .select("_id")
                .lean();

        if (!existingBusiness) {
            return res.status(404).json({
                success: false,
                message: "Service not found."
            });
        }


        const updates = {};


        /*
         * -----------------------------------------------------
         * BUSINESS
         * -----------------------------------------------------
         */

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "business"
            )
        ) {

            if (
                typeof req.body.business !== "string" ||
                !req.body.business.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Business ID must be a valid string."
                });
            }

            const businessId =
                req.body.business.trim();

            if (!isValidId(businessId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid business ID."
                });
            }


            /*
             * New business must belong to same owner.
             */

            const business =
                await Business
                    .findOne({
                        _id: businessId,
                        owner: req.owner._id
                    })
                    .select("_id")
                    .lean();

            if (!business) {
                return res.status(404).json({
                    success: false,
                    message: "Business not found."
                });
            }

            updates.business = business._id;
        }


        /*
         * -----------------------------------------------------
         * NAME
         * -----------------------------------------------------
         */

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "name"
            )
        ) {

            if (
                typeof req.body.name !== "string"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Service name must be a string."
                });
            }

            const name =
                req.body.name.trim();

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Service name cannot be empty."
                });
            }

            updates.name = name;
        }


        /*
         * -----------------------------------------------------
         * DESCRIPTION
         * -----------------------------------------------------
         */

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "description"
            )
        ) {

            if (
                typeof req.body.description !== "string"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Description must be a string."
                });
            }

            updates.description =
                req.body.description.trim();
        }


        /*
         * -----------------------------------------------------
         * CATEGORY
         * -----------------------------------------------------
         */

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "category"
            )
        ) {

            if (
                typeof req.body.category !== "string"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Category must be a string."
                });
            }

            updates.category =
                req.body.category.trim();
        }


        /*
         * -----------------------------------------------------
         * PRICE
         * -----------------------------------------------------
         */

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "price"
            )
        ) {

            if (
                typeof req.body.price !== "number" ||
                !Number.isFinite(req.body.price) ||
                req.body.price < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Price must be a finite number greater than or equal to 0."
                });
            }

            updates.price =
                req.body.price;
        }


        /*
         * -----------------------------------------------------
         * DURATION
         * -----------------------------------------------------
         */

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "duration"
            )
        ) {

            if (
                typeof req.body.duration !== "number" ||
                !Number.isFinite(req.body.duration) ||
                req.body.duration < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Duration must be a finite number greater than or equal to 0."
                });
            }

            updates.duration =
                req.body.duration;
        }


        /*
         * -----------------------------------------------------
         * STATUS
         * -----------------------------------------------------
         */

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "status"
            )
        ) {

            if (
                typeof req.body.status !== "string"
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


        /*
         * -----------------------------------------------------
         * NO VALID CHANGES
         * -----------------------------------------------------
         */

        if (!Object.keys(updates).length) {
            return res.status(400).json({
                success: false,
                message:
                    "No valid changes provided."
            });
        }


        /*
         * -----------------------------------------------------
         * OWNER-SCOPED UPDATE
         * -----------------------------------------------------
         */

        const ownerBusinessIds =
            await Business
                .find({
                    owner: req.owner._id
                })
                .distinct("_id");


        const service =
            await Service.findOneAndUpdate(
                {
                    _id: id,
                    business: {
                        $in: ownerBusinessIds
                    }
                },
                {
                    $set: updates
                },
                {
                    new: true,
                    runValidators: true
                }
            ).lean();


        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found."
            });
        }


        /*
         * -----------------------------------------------------
         * SUCCESS
         * -----------------------------------------------------
         */

        res.json({
            success: true,
            message:
                "Service updated successfully.",
            service
        });

    } catch (error) {

        console.error(
            "PATCH /api/services/:id error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to update service."
        });
    }
});


/* =========================================================
   DELETE SERVICE
   DELETE /api/services/:id
========================================================= */

router.delete("/:id", async (req, res) => {
    try {

        const { id } = req.params;


        /*
         * -----------------------------------------------------
         * SERVICE ID VALIDATION
         * -----------------------------------------------------
         */

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID."
            });
        }


        /*
         * -----------------------------------------------------
         * STRICT DELETE BODY VALIDATION
         *
         * DELETE does not accept arbitrary update fields.
         * Empty body is allowed.
         * Any supplied field is rejected.
         * -----------------------------------------------------
         */

        if (
            req.body !== undefined &&
            req.body !== null
        ) {

            if (
                typeof req.body !== "object" ||
                Array.isArray(req.body)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Delete request body must be an object."
                });
            }


            const receivedFields =
                Object.keys(req.body);

            if (receivedFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Delete request must not contain fields."
                });
            }
        }


        /*
         * -----------------------------------------------------
         * OWNER-SCOPED BUSINESS IDS
         * -----------------------------------------------------
         */

        const ownedBusinessIds =
            await Business
                .find({
                    owner: req.owner._id
                })
                .distinct("_id");


        /*
         * -----------------------------------------------------
         * OWNER-SCOPED DELETE
         * -----------------------------------------------------
         */

        const service =
            await Service.findOneAndDelete({
                _id: id,
                business: {
                    $in: ownedBusinessIds
                }
            });


        /*
         * -----------------------------------------------------
         * NOT FOUND / NOT OWNED
         * -----------------------------------------------------
         */

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found."
            });
        }


        /*
         * -----------------------------------------------------
         * SUCCESS
         * -----------------------------------------------------
         */

        res.json({
            success: true,
            message:
                "Service deleted successfully.",
            service
        });

    } catch (error) {

        console.error(
            "DELETE /api/services/:id error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to delete service."
        });
    }
});


module.exports = router;




