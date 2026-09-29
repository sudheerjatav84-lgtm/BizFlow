const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Owner",
            required: true,
            index: true
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120
        },

        type: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80
        },

        businessType: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BusinessType",
            default: null,
            index: true
        },

        dashboardKey: {
            type: String,
            trim: true,
            maxlength: 80,
            default: ""
        },

        websiteKey: {
            type: String,
            trim: true,
            maxlength: 80,
            default: ""
        },

        subscription: {
            plan: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "SubscriptionPlan",
                default: null
            },

            enabled: {
                type: Boolean,
                default: false
            },

            status: {
                type: String,
                enum: [
                    "inactive",
                    "active",
                    "expired",
                    "cancelled"
                ],
                default: "inactive"
            },

            startDate: {
                type: Date,
                default: null
            },

            endDate: {
                type: Date,
                default: null
            }
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active"
        },

        website: {
            enabled: {
                type: Boolean,
                default: false
            },

            hidden: {
                type: Boolean,
                default: false
            }
        }
    },
    {
        timestamps: true
    }
);

businessSchema.index({
    name: 1
});

businessSchema.index({
    owner: 1,
    businessType: 1
});

businessSchema.index({
    "subscription.status": 1,
    "subscription.endDate": 1
});

module.exports = mongoose.model(
    "Business",
    businessSchema
);
