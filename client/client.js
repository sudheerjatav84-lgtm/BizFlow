"use strict";


/* =========================================================
   BIZFLOW CUSTOMER WEBSITE
========================================================= */

const API_BASE = "/api/public";

let currentBusinessId = null;


/* =========================================================
   DOM
========================================================= */

const loadingState =
    document.querySelector("#loadingState");

const errorState =
    document.querySelector("#errorState");

const businessState =
    document.querySelector("#businessState");

const errorMessage =
    document.querySelector("#errorMessage");

const retryButton =
    document.querySelector("#retryButton");

const businessName =
    document.querySelector("#businessName");

const businessType =
    document.querySelector("#businessType");

const heroBusinessName =
    document.querySelector("#heroBusinessName");

const heroBusinessType =
    document.querySelector("#heroBusinessType");

const infoBusinessName =
    document.querySelector("#infoBusinessName");

const infoBusinessType =
    document.querySelector("#infoBusinessType");

const websiteStatus =
    document.querySelector("#websiteStatus");

const contactButton =
    document.querySelector("#contactButton");


/* =========================================================
   QUERY PARAMETER
========================================================= */

function getBusinessId() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return (
        params.get("business") ||
        params.get("businessId") ||
        ""
    ).trim();

}


/* =========================================================
   STATE
========================================================= */

function showLoading() {

    loadingState?.classList.remove("hidden");

    errorState?.classList.add("hidden");

    businessState?.classList.add("hidden");

}

function showError(message) {

    loadingState?.classList.add("hidden");

    errorState?.classList.remove("hidden");

    businessState?.classList.add("hidden");

    if (errorMessage) {

        errorMessage.textContent =
            message ||
            "This business website is not available.";

    }

}

function showBusiness() {

    loadingState?.classList.add("hidden");

    errorState?.classList.add("hidden");

    businessState?.classList.remove("hidden");

}


/* =========================================================
   API
========================================================= */

async function loadBusiness() {

    showLoading();

    currentBusinessId =
        getBusinessId();

    if (!currentBusinessId) {

        showError(
            "No business was selected. Please open the website using a valid business link."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/businesses/${encodeURIComponent(
                    currentBusinessId
                )}`,
                {
                    method: "GET",
                    headers: {
                        "Accept":
                            "application/json"
                    },
                    credentials: "same-origin"
                }
            );


        let data = null;

        try {

            data =
                await response.json();

        } catch {

            data = null;

        }


        if (
            !response.ok ||
            !data?.success ||
            !data?.business
        ) {

            throw new Error(
                data?.message ||
                "This business website is not available."
            );

        }


        renderBusiness(
            data.business
        );

    } catch (error) {

        console.error(
            "Customer website error:",
            error
        );

        showError(
            error.message ||
            "Unable to load this business website."
        );

    }

}


/* =========================================================
   RENDER BUSINESS
========================================================= */

function renderBusiness(business) {

    const name =
        String(
            business.name || "Business"
        ).trim();

    const type =
        String(
            business.type || "Professional Business"
        ).trim();


    document.title =
        `${name} | BizFlow`;


    if (businessName) {
        businessName.textContent =
            name;
    }


    if (businessType) {
        businessType.textContent =
            type;
    }


    if (heroBusinessName) {
        heroBusinessName.textContent =
            name;
    }


    if (heroBusinessType) {
        heroBusinessType.textContent =
            type;
    }


    if (infoBusinessName) {
        infoBusinessName.textContent =
            name;
    }


    if (infoBusinessType) {
        infoBusinessType.textContent =
            type;
    }


    if (websiteStatus) {

        websiteStatus.textContent =
            "ONLINE";

    }


    showBusiness();

}


/* =========================================================
   CONTACT
========================================================= */

function handleContact() {

    alert(
        "Contact information will be configured by the business owner."
    );

}


/* =========================================================
   EVENTS
========================================================= */

retryButton?.addEventListener(
    "click",
    loadBusiness
);

contactButton?.addEventListener(
    "click",
    handleContact
);


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    loadBusiness
);
