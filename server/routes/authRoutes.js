const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Owner = require("../models/Owner");
const { rateLimit } = require("express-rate-limit");
const { requireOwnerAuth } = require("../middleware/authMiddleware");

const router = express.Router();


/* =========================================================
   OWNER LOGIN RATE LIMIT
========================================================= */

const ownerLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
        success: false,
        message: "Too many failed login attempts. Please try again later."
    }
});



/* =========================================================
   HELPERS
========================================================= */

function clean(value) {
    return String(value || "").trim();
}


/* =========================================================
   OWNER LOGIN
   POST /api/auth/login
========================================================= */

router.post("/login", ownerLoginLimiter, async (req, res) => {
    try {

        const email =
            clean(req.body.email).toLowerCase();

        const password =
            String(req.body.password || "");

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }


        const owner =
            await Owner.findOne({
                email
            });


        if (!owner) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }


        if (owner.status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Owner account is inactive."
            });
        }


        const passwordMatches =
            await bcrypt.compare(
                password,
                owner.passwordHash
            );


        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }


        const secret =
            process.env.JWT_SECRET;


        if (!secret) {
            console.error(
                "JWT_SECRET is missing in server.env"
            );

            return res.status(500).json({
                success: false,
                message:
                    "Authentication configuration is missing."
            });
        }


        const token =
            jwt.sign(
                {
                    ownerId: String(owner._id)
                },
                secret,
                {
                    expiresIn:
                        process.env.JWT_EXPIRES_IN ||
                        "1d"
                }
            );


        res.json({
            success: true,
            message: "Login successful.",
            token,
            owner: {
                _id: owner._id,
                name: owner.name,
                email: owner.email,
                status: owner.status
            }
        });

    } catch (error) {

        console.error(
            "POST /api/auth/login error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to login."
        });
    }
});



/* =========================================================
   OWNER SESSION CHECK
   GET /api/auth/me
========================================================= */

router.get(
    "/me",
    requireOwnerAuth,
    async (req, res) => {

        return res.json({
            success: true,
            owner: {
                _id: req.owner._id,
                name: req.owner.name,
                email: req.owner.email,
                status: req.owner.status
            }
        });

    }
);


module.exports = router;

