const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({
    path: require("path").join(__dirname, "..", "server.env")
});

const BusinessType = require("./models/BusinessType");

const BUSINESS_TYPES = [
    {
        name: "Hotel & Hospitality",
        slug: "hotel-hospitality",
        description: "Hotels, resorts and hospitality businesses",
        dashboardKey: "hotel",
        websiteKey: "hotel"
    },
    {
        name: "Restaurant & Food Services",
        slug: "restaurant-food-services",
        description: "Restaurants, cafes and food service businesses",
        dashboardKey: "restaurant",
        websiteKey: "restaurant"
    },
    {
        name: "Grocery Store",
        slug: "grocery-store",
        description: "Grocery and daily-needs stores",
        dashboardKey: "grocery",
        websiteKey: "grocery"
    },
    {
        name: "Retail & Shopping",
        slug: "retail-shopping",
        description: "Professional retail and shopping businesses",
        dashboardKey: "retail",
        websiteKey: "retail"
    },
    {
        name: "Healthcare & Medical",
        slug: "healthcare-medical",
        description: "Healthcare, clinics and medical businesses",
        dashboardKey: "healthcare",
        websiteKey: "healthcare"
    },
    {
        name: "Beauty & Salon",
        slug: "beauty-salon",
        description: "Beauty, salon and personal grooming businesses",
        dashboardKey: "beauty",
        websiteKey: "beauty"
    },
    {
        name: "Fitness & Wellness",
        slug: "fitness-wellness",
        description: "Fitness, gym and wellness businesses",
        dashboardKey: "fitness",
        websiteKey: "fitness"
    },
    {
        name: "Marketing & Advertising",
        slug: "marketing-advertising",
        description: "Marketing, advertising and creative agencies",
        dashboardKey: "marketing",
        websiteKey: "marketing"
    },
    {
        name: "Home & Personal Services",
        slug: "home-personal-services",
        description: "Professional home and personal service businesses",
        dashboardKey: "home-services",
        websiteKey: "home-services"
    },
    {
        name: "Automotive Services",
        slug: "automotive-services",
        description: "Automotive repair, maintenance and service businesses",
        dashboardKey: "automotive",
        websiteKey: "automotive"
    }
];

async function seedBusinessTypes() {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is missing from server.env");
        }

        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected.");

        for (const item of BUSINESS_TYPES) {
            await BusinessType.findOneAndUpdate(
                {
                    slug: item.slug
                },
                {
                    $set: {
                        name: item.name,
                        description: item.description,
                        dashboardKey: item.dashboardKey,
                        websiteKey: item.websiteKey,
                        enabled: true
                    },
                    $setOnInsert: {
                        slug: item.slug
                    }
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true
                }
            );

            console.log(`PASS - ${item.name}`);
        }

        await BusinessType.updateMany(
            {
                slug: {
                    $nin: BUSINESS_TYPES.map(
                        (item) => item.slug
                    )
                }
            },
            {
                $set: {
                    enabled: false
                }
            }
        );

        console.log("");
        console.log("Business types seeded successfully.");
        console.log("Active business types:", BUSINESS_TYPES.length);

    } catch (error) {
        console.error("");
        console.error("BUSINESS TYPE SEED ERROR:");
        console.error(error);

        process.exitCode = 1;

    } finally {
        await mongoose.connection.close();
    }
}

seedBusinessTypes();
