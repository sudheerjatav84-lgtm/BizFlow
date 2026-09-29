const mongoose = require("mongoose");

const businessTypeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80
        },

        slug: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            maxlength: 80,
            unique: true
        },

        description: {
            type: String,
            trim: true,
            maxlength: 300,
            default: ""
        },

        dashboardKey: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80
        },

        websiteKey: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80
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

businessTypeSchema.index({
    enabled: 1,
    name: 1
});

module.exports =
    mongoose.model(
        "BusinessType",
        businessTypeSchema
    );
