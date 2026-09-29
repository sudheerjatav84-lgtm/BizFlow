const mongoose = require("mongoose");
const Business = require("../models/Business");

async function requireBusinessOwner(
    req,
    res,
    next
) {
    try {

        const businessId =
            req.params.businessId ||
            req.params.id ||
            req.body.businessId ||
            req.query.businessId ||
            req.query.business;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: "Business ID is required."
            });
        }

        if (!mongoose.Types.ObjectId.isValid(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid business ID."
            });
        }

        const business =
            await Business.findOne({
                _id: businessId,
                owner: req.owner._id
            });

        if (!business) {
            return res.status(404).json({
                success: false,
                message:
                    "Business not found or access denied."
            });
        }

        req.business = business;

        next();

    } catch (error) {

        console.error(
            "Business owner authorization error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to verify business access."
        });
    }
}


async function requireActiveSubscription(
    req,
    res,
    next
) {
    try {

        if (!req.business) {
            return res.status(500).json({
                success: false,
                message:
                    "Business authorization is required first."
            });
        }

        const subscription =
            req.business.subscription;

        if (
            !subscription ||
            subscription.enabled !== true ||
            subscription.status !== "active"
        ) {
            return res.status(402).json({
                success: false,
                code: "SUBSCRIPTION_REQUIRED",
                message:
                    "An active subscription is required."
            });
        }

        if (
            !subscription.endDate ||
            new Date(subscription.endDate) <= new Date()
        ) {

            await Business.updateOne(
                {
                    _id: req.business._id
                },
                {
                    $set: {
                        "subscription.enabled": false,
                        "subscription.status": "expired"
                    }
                }
            );

            return res.status(402).json({
                success: false,
                code: "SUBSCRIPTION_EXPIRED",
                message:
                    "Business subscription has expired."
            });
        }

        next();

    } catch (error) {

        console.error(
            "Subscription authorization error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to verify subscription."
        });
    }
}


module.exports = {
    requireBusinessOwner,
    requireActiveSubscription
};
