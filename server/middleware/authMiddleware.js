const jwt = require("jsonwebtoken");
const Owner = require("../models/Owner");

function getTokenFromRequest(req) {
    const header = String(
        req.headers.authorization || ""
    ).trim();

    if (!header) {
        return "";
    }

    if (!header.toLowerCase().startsWith("bearer ")) {
        return "";
    }

    return header.slice(7).trim();
}

async function requireOwnerAuth(req, res, next) {
    try {
        const token = getTokenFromRequest(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const secret = process.env.JWT_SECRET;

        if (!secret) {
            console.error(
                "JWT_SECRET is missing in server.env"
            );

            return res.status(500).json({
                success: false,
                message: "Authentication configuration is missing."
            });
        }

        const decoded = jwt.verify(
            token,
            secret,
            {
                algorithms: ["HS256"]
            }
        );

        if (
            !decoded ||
            !decoded.ownerId
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token."
            });
        }

        const owner = await Owner
            .findById(decoded.ownerId)
            .select("-passwordHash")
            .lean();

        if (!owner) {
            return res.status(401).json({
                success: false,
                message: "Owner account not found."
            });
        }

        if (owner.status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Owner account is inactive."
            });
        }

        req.owner = owner;

        next();

    } catch (error) {

        console.error(
            "Owner authentication error:",
            error.message
        );

        if (
            error.name === "TokenExpiredError"
        ) {
            return res.status(401).json({
                success: false,
                message: "Authentication token has expired."
            });
        }

        return res.status(401).json({
            success: false,
            message: "Invalid authentication token."
        });
    }
}

module.exports = {
    requireOwnerAuth
};

