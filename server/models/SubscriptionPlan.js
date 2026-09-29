const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema(
    {
        businessType: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BusinessType",
            required: true,
            index: true
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80
        },

        durationMonths: {
            type: Number,
            required: true,
            enum: [3, 6, 12]
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        enabled: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

subscriptionPlanSchema.index({
    businessType: 1,
    durationMonths: 1
});

module.exports =
    mongoose.model(
        "SubscriptionPlan",
        subscriptionPlanSchema
    );
