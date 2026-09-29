const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
    {
        business: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            required: true,
            index: true
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120
        },

        description: {
            type: String,
            trim: true,
            maxlength: 500,
            default: ""
        },

        category: {
            type: String,
            trim: true,
            maxlength: 80,
            default: ""
        },

        price: {
            type: Number,
            min: 0,
            default: 0
        },

        duration: {
            type: Number,
            min: 0,
            default: 0
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active"
        }
    },
    {
        timestamps: true
    }
);

serviceSchema.index({
    business: 1,
    name: 1
});

module.exports = mongoose.model("Service", serviceSchema);
