const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");

require("dotenv").config({
    path: path.join(__dirname, "..", "server.env")
});

const businessRoutes = require("./routes/businessRoutes");
const publicBusinessRoutes = require("./routes/publicBusinessRoutes");
const authRoutes = require("./routes/authRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const businessTypeRoutes = require("./routes/businessTypeRoutes");
const publicRoutes = require("./routes/publicRoutes");

const app = express();

const PORT = Number(process.env.PORT || 5000);
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("SERVER STARTUP FAILED: MONGO_URI is missing in server.env");
    process.exit(1);
}


// SECURITY

const clientOrigin =
    String(process.env.CLIENT_ORIGIN || "").trim();

if (!clientOrigin) {
    console.error(
        "SERVER STARTUP FAILED: CLIENT_ORIGIN is missing in server.env"
    );

    process.exit(1);
}


// HELMET
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],

                scriptSrc: ["'self'"],

                styleSrc: ["'self'", "'unsafe-inline'"],

                imgSrc: ["'self'", "data:", "blob:", "https:"],

                fontSrc: ["'self'", "data:", "https:"],

                connectSrc: ["'self'"],

                objectSrc: ["'none'"],

                baseUri: ["'self'"],

                frameAncestors: ["'self'"],

                formAction: ["'self'"]
            }
        },

        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: false
        }
    })
);


// CORS
app.use(
    cors({
        origin: function (origin, callback) {

            if (!origin || origin === clientOrigin) {
                return callback(null, true);
            }

            return callback(
                new Error("CORS origin not allowed"),
                false
            );
        },
        methods: [
            "GET",
            "POST",
            "PATCH",
            "PUT",
            "DELETE",
            "OPTIONS"
        ],
        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ],
        credentials: false
    })
);

// JSON
// JSON
app.use(
    express.json({
        limit: "100kb"
    })
);


// HEALTH CHECK
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        service: "BizFlow",
        database:
            mongoose.connection.readyState === 1
                ? "connected"
                : "disconnected"
    });
});


// AUTH API
app.use(
    "/api/auth",
    authRoutes
);

// BUSINESS API

// PUBLIC CUSTOMER BUSINESS WEBSITE API
app.use(
    "/api/public/businesses",
    publicBusinessRoutes
);

app.use(
    "/api/businesses",
    businessRoutes
);


// PUBLIC WEBSITE API
app.use(
    "/api/public",
    publicRoutes
);

// SERVICE API
app.use(
    "/api/services",
    serviceRoutes
);

app.use(
    "/api/business-types",
    businessTypeRoutes
);


// ADMIN
app.use(
    "/admin",
    express.static(
        path.join(__dirname, "..", "admin")
    )
);


// CUSTOMER WEBSITE
app.use(
    "/",
    express.static(
        path.join(__dirname, "..", "client")
    )
);


// ADMIN ROOT
app.get("/admin/", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "..",
            "admin",
            "index.html"
        )
    );
});




// GLOBAL ERROR HANDLER
app.use((error, req, res, next) => {

    if (error && error.type === "entity.too.large") {
        return res.status(413).json({
            success: false,
            message: "Request body is too large."
        });
    }

    console.error("Unhandled server error:", error);

    return res.status(500).json({
        success: false,
        message: "Internal server error."
    });
});

// DATABASE + SERVER
mongoose
    .connect(MONGO_URI)
    .then(() => {

        console.log(
            `MongoDB Connected: ${mongoose.connection.host}`
        );

        app.listen(
            PORT,
            () => {
                console.log(
                    `BizFlow running: http://localhost:${PORT}`
                );
            }
        );

    })
    .catch((error) => {

        console.error(
            "MongoDB connection failed:",
            error.message
        );

        process.exit(1);
    });







