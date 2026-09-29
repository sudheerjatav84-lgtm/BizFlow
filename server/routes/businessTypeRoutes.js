const express = require("express");
const { requireOwnerAuth } = require("../middleware/authMiddleware");

const BusinessType = require("../models/BusinessType");
const SubscriptionPlan = require("../models/SubscriptionPlan");

const router = express.Router();

router.use(requireOwnerAuth);

/*
=========================================================
GET ACTIVE BUSINESS TYPES
=========================================================
*/

router.get("/", async (req, res) => {
    try {
        const businessTypes =
            await BusinessType.find({
                enabled: true
            })
            .sort({
                name: 1
            })
            .lean();

        res.json({
            success: true,
            businessTypes
        });

    } catch (error) {

        console.error(
            "Get business types error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to load business types."
        });
    }
});


/*
=========================================================
GET SUBSCRIPTION PLANS FOR BUSINESS TYPE
=========================================================
*/

router.get(
    "/:businessTypeId/plans",
    async (req, res) => {

        try {

            const plans =
                await SubscriptionPlan.find({
                    businessType:
                        req.params.businessTypeId,
                    enabled: true
                })
                .sort({
                    durationMonths: 1
                })
                .lean();

            res.json({
                success: true,
                plans
            });

        } catch (error) {

            console.error(
                "Get subscription plans error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to load subscription plans."
            });
        }
    }
);


module.exports = router;
