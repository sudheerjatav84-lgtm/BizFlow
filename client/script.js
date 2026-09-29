"use strict";


/* =========================================================
   CUSTOMER WEBSITE
========================================================= */

const websiteApp =
    document.querySelector("#websiteApp");

const websiteUnavailable =
    document.querySelector("#websiteUnavailable");

const unavailableMessage =
    document.querySelector("#unavailableMessage");


/* =========================================================
   HELPERS
========================================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function showUnavailable(message) {

    if (websiteApp) {
        websiteApp.classList.add("hidden");
    }

    if (websiteUnavailable) {
        websiteUnavailable.classList.remove("hidden");
    }

    if (unavailableMessage) {
        unavailableMessage.textContent =
            message ||
            "This website is currently unavailable.";
    }

}


function showWebsite() {

    if (websiteApp) {
        websiteApp.classList.remove("hidden");
    }

    if (websiteUnavailable) {
        websiteUnavailable.classList.add("hidden");
    }

}


/* =========================================================
   GET BUSINESS ID
========================================================= */

function getBusinessId() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return (
        params.get("business") ||
        ""
    ).trim();

}


/* =========================================================
   LOAD BUSINESS
========================================================= */

async function loadBusinessWebsite() {

    const businessId =
        getBusinessId();


    /*
    No business selected.
    IMPORTANT:
    Do not show seeded/default business data.
    */

    if (!businessId) {

        showUnavailable(
            "No business website was selected."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `/api/public/businesses/${encodeURIComponent(
                    businessId
                )}`,
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    },
                    cache: "no-store"
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data?.success ||
            !data?.business
        ) {

            throw new Error(
                data?.message ||
                "Business website is unavailable."
            );

        }


        const business =
            data.business;


        renderBusiness(
            business
        );


        renderServices(
            Array.isArray(data.services)
                ? data.services
                : []
        );


        showWebsite();


    } catch (error) {

        console.error(
            "Customer website loading error:",
            error
        );


        showUnavailable(
            error.message ||
            "This website is currently unavailable."
        );

    }

}


/* =========================================================
   RENDER BUSINESS
========================================================= */

function renderBusiness(business) {

    const name =
        String(
            business.name ||
            "Business"
        ).trim();


    const type =
        String(
            business.type ||
            "Professional Business"
        ).trim();


    const brand =
        document.querySelector(
            "#businessBrand"
        );

    const businessName =
        document.querySelector(
            "#businessName"
        );

    const businessType =
        document.querySelector(
            "#businessType"
        );

    const contactBusinessName =
        document.querySelector(
            "#contactBusinessName"
        );

    const contactBusinessType =
        document.querySelector(
            "#contactBusinessType"
        );

    const footerBusinessName =
        document.querySelector(
            "#footerBusinessName"
        );


    if (brand) {
        brand.textContent = name;
    }


    if (businessName) {
        businessName.textContent = name;
    }


    if (businessType) {
        businessType.textContent = type;
    }


    if (contactBusinessName) {
        contactBusinessName.textContent =
            name;
    }


    if (contactBusinessType) {
        contactBusinessType.textContent =
            type;
    }


    if (footerBusinessName) {
        footerBusinessName.textContent =
            name;
    }


    document.title =
        `${name} | BizFlow`;


    const metaDescription =
        document.querySelector(
            'meta[name="description"]'
        );


    if (metaDescription) {

        metaDescription.setAttribute(
            "content",
            `${name} - ${type}`
        );

    }

}


/* =========================================================
   RENDER SERVICES
========================================================= */

function renderServices(services) {

    const list =
        document.querySelector(
            "#servicesEmpty"
        );

    const section =
        document.querySelector(
            "#services"
        );


    if (!section) {
        return;
    }


    const container =
        section.querySelector(
            ".container"
        );


    if (!container) {
        return;
    }


    const oldGrid =
        container.querySelector(
            ".services-grid"
        );


    if (oldGrid) {
        oldGrid.remove();
    }


    if (!services.length) {

        if (list) {
            list.classList.remove(
                "hidden"
            );
        }

        return;
    }


    if (list) {
        list.classList.add(
            "hidden"
        );
    }


    const grid =
        document.createElement(
            "div"
        );


    grid.className =
        "services-grid";


    services.forEach(
        service => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "service-card";


            const name =
                escapeHtml(
                    service.name ||
                    "Service"
                );


            const description =
                escapeHtml(
                    service.description ||
                    "Professional service."
                );


            const category =
                escapeHtml(
                    service.category ||
                    ""
                );


            const price =
                Number.isFinite(
                    Number(service.price)
                )
                    ? `₹${Number(
                        service.price
                    ).toLocaleString("en-IN")}`
                    : "";


            const duration =
                Number.isFinite(
                    Number(service.duration)
                ) &&
                Number(service.duration) > 0
                    ? `${Number(
                        service.duration
                    )} min`
                    : "";


            card.innerHTML = `

                <div class="service-card-top">

                    ${
                        category
                            ? `
                                <span class="service-category">
                                    ${category}
                                </span>
                              `
                            : ""
                    }

                </div>

                <h3>
                    ${name}
                </h3>

                <p>
                    ${description}
                </p>

                <div class="service-card-bottom">

                    ${
                        price
                            ? `
                                <strong>
                                    ${price}
                                </strong>
                              `
                            : ""
                    }

                    ${
                        duration
                            ? `
                                <span>
                                    ${duration}
                                </span>
                              `
                            : ""
                    }

                </div>

            `;


            grid.appendChild(
                card
            );

        }
    );


    container.appendChild(
        grid
    );

}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadBusinessWebsite();

    }
);
