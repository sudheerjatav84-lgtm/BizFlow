"use strict";


/* =========================================================
   OWNER AUTHENTICATION
========================================================= */

async function checkOwnerSession() {

    const token = sessionStorage.getItem(AUTH_TOKEN_KEY);

    if (!token) {
        showLoginScreen();
        return false;
    }

    try {

        const response = await apiRequest("/auth/me");

        if (!response?.success || !response.owner) {
            throw new Error("Invalid owner session.");
        }

        authState.owner = response.owner;
        authState.authenticated = true;

        hideLoginScreen();
        updateOwnerUI();

        return true;

    } catch (error) {

        console.error("Owner session check failed:", error);

        sessionStorage.removeItem(AUTH_TOKEN_KEY);

        authState.owner = null;
        authState.authenticated = false;

        showLoginScreen();

        return false;
    }
}


function showLoginScreen() {

    const screen = document.querySelector("#loginScreen");

    if (!screen) {
        return;
    }

    screen.setAttribute("aria-hidden", "false");

    document.body.classList.add("login-active");

    window.setTimeout(() => {
        document.querySelector("#loginEmail")?.focus();
    }, 50);
}


function hideLoginScreen() {

    const screen = document.querySelector("#loginScreen");

    if (!screen) {
        return;
    }

    screen.setAttribute("aria-hidden", "true");

    document.body.classList.remove("login-active");
}


function updateOwnerUI() {

    const owner = authState.owner;

    if (!owner) {
        return;
    }

    const ownerNameElements = document.querySelectorAll(
        "[data-owner-name]"
    );

    ownerNameElements.forEach((element) => {
        element.textContent = owner.name || "Owner";
    });

    const ownerEmailElements = document.querySelectorAll(
        "[data-owner-email]"
    );

    ownerEmailElements.forEach((element) => {
        element.textContent = owner.email || "";
    });
}


async function loginOwner(email, password) {

    const response = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
            email,
            password
        })
    });

    if (!response?.success || !response.token) {
        throw new Error(
            response?.message || "Login failed."
        );
    }

    sessionStorage.setItem(
        AUTH_TOKEN_KEY,
        response.token
    );

    authState.owner = response.owner || null;
    authState.authenticated = true;

    hideLoginScreen();
    updateOwnerUI();

    return response;
}


function setupLoginForm() {

    const form = document.querySelector("#loginForm");
    const emailInput = document.querySelector("#loginEmail");
    const passwordInput = document.querySelector("#loginPassword");
    const errorBox = document.querySelector("#loginError");
    const button = document.querySelector("#loginButton");
    const buttonText = document.querySelector("#loginButtonText");

    if (!form || !emailInput || !passwordInput) {
        console.error("Login form elements not found.");
        return;
    }

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (errorBox) {
            errorBox.textContent = "";
        }

        if (!email || !password) {
            if (errorBox) {
                errorBox.textContent =
                    "Email and password are required.";
            }
            return;
        }

        if (button) {
            button.disabled = true;
        }

        if (buttonText) {
            buttonText.textContent = "Signing In...";
        }

        try {

            await loginOwner(email, password);

            passwordInput.value = "";

            showToast(
                "Welcome back to BizFlow."
            );

            await loadBusinesses();

        } catch (error) {

            console.error("Owner login failed:", error);

            if (errorBox) {
                errorBox.textContent =
                    error.message || "Unable to sign in.";
            }

        } finally {

            if (button) {
                button.disabled = false;
            }

            if (buttonText) {
                buttonText.textContent = "Sign In";
            }
        }
    });
}


function logoutOwner() {

    sessionStorage.removeItem(AUTH_TOKEN_KEY);

    authState.owner = null;
    authState.authenticated = false;

    showLoginScreen();

    showToast("Signed out successfully.");
}

/* =========================================================
   BIZFLOW OWNER DASHBOARD
   Business Management Frontend
========================================================= */

const API_BASE = "/api";

const AUTH_TOKEN_KEY = "bizflow_owner_token";

const authState = {
    owner: null,
    authenticated: false
};


const state = {
    businesses: [],
    loading: false
};


/* =========================================================
   DOM HELPERS
========================================================= */

function $(selector) {
    return document.querySelector(selector);
}


function showToast(message, type = "success") {
    const toast = $("#toast");

    if (!toast) {
        return;
    }

    toast.textContent = message;

    toast.className = "toast show";

    if (type === "error") {
        toast.classList.add("error");
    } else {
        toast.classList.add("success");
    }

    window.clearTimeout(showToast.timer);

    showToast.timer = window.setTimeout(() => {
        toast.className = "toast";
    }, 3200);
}


/* =========================================================
   API
========================================================= */

async function apiRequest(url, options = {}) {

    const token = sessionStorage.getItem(AUTH_TOKEN_KEY);

    const headers = {
        ...(options.body
            ? {
                "Content-Type": "application/json"
            }
            : {}),
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers
    });

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (response.status === 401) {

        authState.owner = null;
        authState.authenticated = false;

        sessionStorage.removeItem(AUTH_TOKEN_KEY);

        throw new Error(
            data?.message ||
            "Authentication required."
        );
    }

    if (!response.ok) {
        throw new Error(
            data?.message ||
            `Request failed with status ${response.status}`
        );
    }

    return data;
}


/* =========================================================
   LOAD BUSINESSES
========================================================= */


/* =========================================================
   LOAD BUSINESS TYPES
========================================================= */
async function loadBusinessTypes() {

    const select =
        document.querySelector("#businessType");

    if (!select) {
        return;
    }

    try {

        const currentValue =
            String(select.value || "").trim();

        const response =
            await apiRequest("/business-types");

        if (
            !response?.success ||
            !Array.isArray(response.businessTypes)
        ) {
            throw new Error(
                response?.message ||
                "Unable to load business types."
            );
        }

        const businessTypes =
            response.businessTypes;

        select.innerHTML =
            `<option value="">Select business type</option>`;

        businessTypes.forEach(
            (businessType) => {

                const option =
                    document.createElement("option");

                /*
                 * IMPORTANT:
                 * Backend expects MongoDB BusinessType _id.
                 * Display text remains the business type name.
                 */
                option.value =
                    String(businessType._id || "");

                option.textContent =
                    String(businessType.name || "");

                if (
                    !option.value ||
                    !option.textContent
                ) {
                    return;
                }

                select.appendChild(option);
            }
        );

        if (
            currentValue &&
            businessTypes.some(
                (businessType) =>
                    String(businessType._id || "") ===
                    currentValue
            )
        ) {
            select.value = currentValue;
        }

        /*
         * Keep the existing BizFlow custom dropdown
         * synchronized with the native select.
         */
        select.dispatchEvent(
            new Event("change", {
                bubbles: true
            })
        );

    } catch (error) {

        console.error(
            "Load business types error:",
            error
        );

        select.innerHTML =
            `<option value="">Unable to load business types</option>`;

        select.dispatchEvent(
            new Event("change", {
                bubbles: true
            })
        );

        showToast(
            error?.message ||
            "Unable to load business types.",
            "error"
        );
    }
}


async function loadBusinesses() {
    if (state.loading) {
        return;
    }

    state.loading = true;

    try {
        const response = await apiRequest("/businesses");

        state.businesses = Array.isArray(response.businesses)
            ? response.businesses
            : [];

        renderBusinesses();
        updateDashboardStats();
        syncServiceBusinessSelector();

    } catch (error) {
        console.error("Business loading error:", error);

        showToast(
            error.message || "Unable to load businesses.",
            "error"
        );

    } finally {
        state.loading = false;
    }
}


/* =========================================================
   RENDER BUSINESSES
========================================================= */

function renderBusinesses() {
    const list = $("#businessList");
    const emptyState =
        document.querySelector(".empty-business");

    if (!list) {
        return;
    }

    list.innerHTML = "";

    if (!state.businesses.length) {

        if (emptyState) {
            emptyState.style.display = "flex";
        }

        return;
    }

    if (emptyState) {
        emptyState.style.display = "none";
    }

    state.businesses.forEach((business) => {

        const item =
            document.createElement("article");

        item.className = "business-item";

        item.dataset.businessId =
            business._id || "";

        item.innerHTML = `
            <div class="business-item-info">

                <strong></strong>

                <span></span>

            </div>

            <div class="business-item-actions">

                <span
                    class="business-item-status ${
                        business.status === "inactive"
                            ? "inactive"
                            : ""
                    }"
                >
                    ${
                        business.status === "inactive"
                            ? "Inactive"
                            : "Active"
                    }
                </span>

                <button
                    type="button"
                    class="secondary-button manage-business-button"
                >
                    Manage
                </button>

            </div>
        `;

        const nameElement =
            item.querySelector(
                ".business-item-info strong"
            );

        const typeElement =
            item.querySelector(
                ".business-item-info span"
            );

        if (nameElement) {
            nameElement.textContent =
                business.name ||
                "Unnamed Business";
        }

        if (typeElement) {
            typeElement.textContent =
                business.type ||
                "Business";
        }

        const manageButton =
            item.querySelector(
                ".manage-business-button"
            );

        if (manageButton) {

            manageButton.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();
                    event.stopPropagation();

                    console.log(
                        "MANAGE BUSINESS CLICK:",
                        business._id
                    );

                    openManageBusinessModal(
                        business._id
                    );

                }
            );

        }

        list.appendChild(item);
    });
}




/* =========================================================
   MANAGE BUSINESS
========================================================= */

let selectedBusinessId = null;


function getBusinessById(id) {
    return state.businesses.find(
        (business) =>
            String(business._id) === String(id)
    );
}


async function openManageBusinessModal(businessId) {

    const business =
        getBusinessById(businessId);

    if (!business) {
        showToast(
            "Business not found.",
            "error"
        );

        return;
    }

    const modal =
        $("#manageBusinessModal");

    if (!modal) {
        showToast(
            "Manage business modal not found.",
            "error"
        );

        return;
    }

    selectedBusinessId =
        String(business._id);

    const nameInput =
        $("#manageBusinessName");

    const typeInput =
        $("#manageBusinessType");

    const statusInput =
        $("#manageBusinessStatus");

    const websiteEnabledInput =
        $("#manageWebsiteEnabled");

    const websiteHiddenInput =
        $("#manageWebsiteHidden");

    const websiteStatus =
        $("#manageWebsiteStatus");

    if (nameInput) {
        nameInput.value =
            business.name || "";
    }

    if (typeInput) {
        typeInput.value =
            business.type || "Other";
    }

    if (statusInput) {
        statusInput.value =
            business.status || "active";
    }

    const website =
        business.website || {};

    if (websiteEnabledInput) {
        websiteEnabledInput.checked =
            website.enabled === true;
    }

    if (websiteHiddenInput) {
        websiteHiddenInput.checked =
        website.hidden !== true;
    }

    if (websiteStatus) {
        websiteStatus.textContent =
            website.enabled === true ? "ON" : "OFF";

        websiteStatus.classList.toggle(
            "on",
            website.enabled === true
        );

        websiteStatus.classList.toggle(
            "off",
            website.enabled !== true
        );
    }

    modal.classList.remove("hidden");

    document.body.classList.add(
        "modal-open"
    );

    window.setTimeout(() => {
        nameInput?.focus();
    }, 50);
}


function closeManageBusinessModal() {

    const modal =
        $("#manageBusinessModal");

    if (!modal) {
        return;
    }

    modal.classList.add("hidden");

    document.body.classList.remove(
        "modal-open"
    );

    selectedBusinessId = null;
}


async function saveBusinessChanges(event) {

    event.preventDefault();

    if (!selectedBusinessId) {
        showToast(
            "No business selected.",
            "error"
        );

        return;
    }

    const nameInput =
        $("#manageBusinessName");

    const typeInput =
        $("#manageBusinessType");

    const statusInput =
        $("#manageBusinessStatus");

    const websiteEnabledInput =
        $("#manageWebsiteEnabled");

    const websiteHiddenInput =
        $("#manageWebsiteHidden");

    const saveButton =
        $("#saveBusinessChanges");

    const name =
        String(nameInput?.value || "").trim();

    const type =
        String(typeInput?.value || "").trim();

    const status =
        String(statusInput?.value || "").trim();

    const websiteEnabled =
        websiteEnabledInput?.checked === true;

    const websiteHidden =
        websiteHiddenInput?.checked === true;

    if (!name) {
        showToast(
            "Business name is required.",
            "error"
        );

        nameInput?.focus();
        return;
    }

    if (!type) {
        showToast(
            "Business type is required.",
            "error"
        );

        typeInput?.focus();
        return;
    }

    if (
        status !== "active" &&
        status !== "inactive"
    ) {
        showToast(
            "Invalid business status.",
            "error"
        );

        return;
    }

    const originalText =
        saveButton?.textContent ||
        "Save Changes";

    try {

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent =
                "Saving...";
        }

        const response =
            await apiRequest(
                `/businesses/${selectedBusinessId}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        name,
                        type,
                        status,
                        website: {
                            enabled: websiteEnabled,
                            hidden: websiteHidden
                        }
                    })
                }
            );

        if (!response?.success) {
            throw new Error(
                response?.message ||
                "Unable to update business."
            );
        }

        const updatedBusiness =
            response.business;

        const index =
            state.businesses.findIndex(
                (business) =>
                    String(business._id) ===
                    String(selectedBusinessId)
            );

        if (
            index !== -1 &&
            updatedBusiness
        ) {
            state.businesses[index] =
                updatedBusiness;
        }

        renderBusinesses();
        updateDashboardStats();

        closeManageBusinessModal();

        showToast(
            "Business updated successfully.",
            "success"
        );

    } catch (error) {

        console.error(
            "Update business error:",
            error
        );

        showToast(
            error.message ||
            "Unable to update business.",
            "error"
        );

    } finally {

        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent =
                originalText;
        }
    }
}


async function deleteSelectedBusiness() {

    if (!selectedBusinessId) {
        showToast(
            "No business selected.",
            "error"
        );

        return;
    }

    const business =
        getBusinessById(
            selectedBusinessId
        );

    if (!business) {
        showToast(
            "Business not found.",
            "error"
        );

        return;
    }

    const confirmed =
        window.confirm(
            `Delete "${business.name}"? This action cannot be undone.`
        );

    if (!confirmed) {
        return;
    }

    const deleteButton =
        $("#deleteBusiness");

    const originalText =
        deleteButton?.textContent ||
        "Delete Business";

    try {

        if (deleteButton) {
            deleteButton.disabled = true;
            deleteButton.textContent =
                "Deleting...";
        }

        const response =
            await apiRequest(
                `/businesses/${selectedBusinessId}`,
                {
                    method: "DELETE"
                }
            );

        if (!response?.success) {
            throw new Error(
                response?.message ||
                "Unable to delete business."
            );
        }

        state.businesses =
            state.businesses.filter(
                (item) =>
                    String(item._id) !==
                    String(selectedBusinessId)
            );

        renderBusinesses();

        updateDashboardStats();

        closeManageBusinessModal();

        showToast(
            "Business deleted successfully.",
            "success"
        );

    } catch (error) {

        console.error(
            "Delete business error:",
            error
        );

        showToast(
            error.message ||
            "Unable to delete business.",
            "error"
        );

    } finally {

        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.textContent =
                originalText;
        }
    }
}


/* =========================================================
   DASHBOARD STATS
========================================================= */

function updateDashboardStats() {
    const count = state.businesses.length;

    const businessCount = $("#businessCount");

    if (businessCount) {
        businessCount.textContent = String(count);
    }

    const businessTitle = $("#businessTitle");

    if (businessTitle) {

        if (!count) {
            businessTitle.textContent =
                "No business added yet";
        } else if (count === 1) {
            businessTitle.textContent =
                state.businesses[0].name ||
                "Your Business";
        } else {
            businessTitle.textContent =
                `${count} Businesses`;
        }
    }

    const businessDescription =
        $("#businessDescription");

    if (businessDescription) {

        if (!count) {

            businessDescription.textContent =
                "Create your first business. Your business will appear here after it is saved successfully.";

        } else {

            businessDescription.textContent =
                "Your active businesses are ready to manage from this workspace.";
        }
    }

    const welcomeMessage =
        $("#welcomeMessage");

    if (welcomeMessage) {

        if (!count) {

            welcomeMessage.textContent =
                "Your workspace is ready. Add your first business to get started.";

        } else if (count === 1) {

            welcomeMessage.textContent =
                "Your business workspace is ready to manage.";

        } else {

            welcomeMessage.textContent =
                "Your businesses are ready to manage from one workspace.";
        }
    }
}


/* =========================================================
   MODAL
========================================================= */

function openBusinessModal() {
    const modal = $("#businessModal");

    if (!modal) {
        return;
    }

    modal.classList.remove("hidden");

    document.body.classList.add("modal-open");

    window.setTimeout(() => {

        const nameInput =
            $("#businessName");

        if (nameInput) {
            nameInput.focus();
        }

    }, 50);
}


function closeBusinessModal() {
    const modal = $("#businessModal");

    if (!modal) {
        return;
    }

    modal.classList.add("hidden");

    document.body.classList.remove("modal-open");
}


function resetBusinessForm() {
    const form = $("#businessForm");

    if (form) {
        form.reset();
    }
}


/* =========================================================
   CREATE BUSINESS
========================================================= */

async function createBusiness(event) {
    event.preventDefault();

    if (state.loading) {
        return;
    }

    const nameInput =
        $("#businessName");

    const typeInput =
        $("#businessType");

    const submitButton =
        $("#createBusiness");

    const name =
        String(nameInput?.value || "").trim();

    const businessTypeId =
        String(typeInput?.value || "").trim();

    if (!name) {
        showToast(
            "Please enter your business name.",
            "error"
        );

        nameInput?.focus();

        return;
    }

    if (!businessTypeId) {
        showToast(
            "Please select a business type.",
            "error"
        );

        typeInput?.focus();

        return;
    }

    const originalText =
        submitButton?.textContent ||
        "Create Business";

    try {

        state.loading = true;

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent =
                "Creating...";
        }

        const response =
            await apiRequest("/businesses", {
                method: "POST",
                body: JSON.stringify({
                    name,
                    type: businessTypeId,
                    businessTypeId
                })
            });

        if (!response?.success) {
            throw new Error(
                response?.message ||
                "Unable to create business."
            );
        }

        if (response.business) {

            state.businesses.unshift(
                response.business
            );

        } else {

            await loadBusinesses();
        }

        renderBusinesses();
        updateDashboardStats();

        resetBusinessForm();
        closeBusinessModal();

        showToast(
            "Business created successfully.",
            "success"
        );

    } catch (error) {

        console.error(
            "Create business error:",
            error
        );

        showToast(
            error.message ||
            "Unable to create business.",
            "error"
        );

    } finally {

        state.loading = false;

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent =
                originalText;
        }
    }
}


/* =========================================================
   VISIT STORE
========================================================= */

function visitStore() {

    const business =
        selectedBusinessId
            ? getBusinessById(selectedBusinessId)
            : null;

    if (!business || !business._id) {

        showToast(
            "Select a business first.",
            "warning"
        );

        return;
    }

    const businessId =
        encodeURIComponent(
            String(business._id)
        );

    window.location.href =
        `/?business=${businessId}`;
}


/* =========================================================
   EVENT LISTENERS
========================================================= */

function setupEventListeners() {
    setupServiceEvents();

    const addBusiness =
        $("#addBusiness");

    const addBusinessSecondary =
        $("#addBusinessSecondary");

    const closeBusiness =
        $("#closeBusinessModal");

    const modalOverlay =
        $("#modalOverlay");

    const businessForm =
        $("#businessForm");

    const refreshBusinesses =
        $("#refreshBusinesses");

    const visitStoreButton =
        $("#visitStore");
    
    const manageBusinessModal =
        $("#manageBusinessModal");

    const closeManageBusiness =
        $("#closeManageBusinessModal");

    const manageBusinessOverlay =
        $("#manageBusinessOverlay");

    const manageBusinessForm =
        $("#manageBusinessForm");

    const deleteBusinessButton =
        $("#deleteBusiness");


    closeManageBusiness?.addEventListener(
        "click",
        closeManageBusinessModal
    );


    manageBusinessOverlay?.addEventListener(
        "click",
        closeManageBusinessModal
    );


    manageBusinessForm?.addEventListener(
        "submit",
        saveBusinessChanges
    );


    deleteBusinessButton?.addEventListener(
        "click",
        deleteSelectedBusiness
    );


    manageBusinessModal?.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                manageBusinessModal
            ) {
                closeManageBusinessModal();
            }

        }
    );



    addBusiness?.addEventListener(
        "click",
        openBusinessModal
    );


    addBusinessSecondary?.addEventListener(
        "click",
        openBusinessModal
    );


    closeBusiness?.addEventListener(
        "click",
        closeBusinessModal
    );


    modalOverlay?.addEventListener(
        "click",
        closeBusinessModal
    );


    businessForm?.addEventListener(
        "submit",
        createBusiness
    );


    refreshBusinesses?.addEventListener(
        "click",
        async () => {

            const originalText =
                refreshBusinesses.textContent;

            refreshBusinesses.disabled = true;

            refreshBusinesses.textContent =
                "Loading businesses..."

            try {

                await loadBusinesses();

                showToast(
                    "Businesses refreshed.",
                    "success"
                );

            } finally {

                refreshBusinesses.disabled =
                    false;

                refreshBusinesses.textContent =
                    originalText;
            }
        }
    );


    visitStoreButton?.addEventListener(
        "click",
        visitStore
    );


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape"
            ) {

                const modal =
                    $("#businessModal");

                if (
                    modal &&
                    !modal.classList.contains("hidden")
                ) {
                    closeBusinessModal();
                }
            }
        }
    );
}



/* =========================================================
   SERVICE MANAGEMENT
========================================================= */

const serviceState = {
    services: [],
    selectedBusinessId: "",
    editingId: ""
};


/* ---------------------------------------------------------
   ESCAPE HTML
--------------------------------------------------------- */

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ---------------------------------------------------------
   LOAD SERVICES
--------------------------------------------------------- */

async function loadServices(businessId) {

    const list = $("#serviceList");
    const count = $("#serviceCount");
    const badge = $("#serviceStatusBadge");

    if (!list || !count || !badge) {
        return;
    }

    if (!businessId) {

        serviceState.services = [];
        serviceState.selectedBusinessId = "";

        count.textContent = "0";

        badge.textContent = "NO BUSINESS";
        badge.className = "status-badge off";

        list.innerHTML = `
            <div class="service-empty-state">
                <div class="service-empty-icon">+</div>
                <strong>No business selected</strong>
                <p>Select a business to view services.</p>
            </div>
        `;

        return;
    }

    serviceState.selectedBusinessId =
        String(businessId);

    try {

        const response =
            await apiRequest(
                `/services?business=${encodeURIComponent(businessId)}`
            );

        serviceState.services =
            Array.isArray(response.services)
                ? response.services
                : [];

        badge.textContent = "ACTIVE";
        badge.className = "status-badge on";

        renderServices();

    } catch (error) {

        console.error(
            "Service loading error:",
            error
        );

        serviceState.services = [];
        count.textContent = "0";

        list.innerHTML = `
            <div class="service-empty-state">
                <div class="service-empty-icon">!</div>
                <strong>Unable to load services</strong>
                <p>${escapeHtml(
                    error.message ||
                    "Please try again."
                )}</p>
            </div>
        `;

        showToast(
            error.message ||
            "Unable to load services.",
            "error"
        );
    }
}


/* ---------------------------------------------------------
   RENDER SERVICES
--------------------------------------------------------- */

function renderServices() {

    const list = $("#serviceList");
    const count = $("#serviceCount");

    if (!list || !count) {
        return;
    }

    count.textContent =
        String(serviceState.services.length);

    if (!serviceState.services.length) {

        list.innerHTML = `
            <div class="service-empty-state">
                <div class="service-empty-icon">+</div>
                <strong>No services yet</strong>
                <p>Add your first service using the form.</p>
            </div>
        `;

        return;
    }

    list.innerHTML = "";

    serviceState.services.forEach(
        (service) => {

            const item =
                document.createElement("article");

            item.className = "service-item";

            item.dataset.serviceId =
                service._id || "";

            item.innerHTML = `
                <div class="service-item-main">

                    <div class="service-item-top">

                        <div>
                            <h4>
                                ${escapeHtml(
                                    service.name || ""
                                )}
                            </h4>

                            <span class="service-category">
                                ${escapeHtml(
                                    service.category ||
                                    "General"
                                )}
                            </span>
                        </div>

                        <span
                            class="service-item-status ${
                                service.status === "inactive"
                                    ? "inactive"
                                    : ""
                            }"
                        >
                            ${
                                service.status === "inactive"
                                    ? "Inactive"
                                    : "Active"
                            }
                        </span>

                    </div>

                    ${
                        service.description
                            ? `
                                <p class="service-description">
                                    ${escapeHtml(
                                        service.description
                                    )}
                                </p>
                              `
                            : ""
                    }

                    <div class="service-meta">

                        <span>
                            \u20B9${Number(
                                service.price || 0
                            ).toFixed(2)}
                        </span>

                        <span>
                            ${Number(
                                service.duration || 0
                            )} min
                        </span>

                    </div>

                </div>

                <div class="service-item-actions">

                    <button
                        type="button"
                        class="secondary-button service-edit-button"
                        data-service-action="edit"
                        data-service-id="${
                            service._id || ""
                        }"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="secondary-button service-delete-button"
                        data-service-action="delete"
                        data-service-id="${
                            service._id || ""
                        }"
                    >
                        Delete
                    </button>

                </div>
            `;

            list.appendChild(item);
        }
    );
}


/* ---------------------------------------------------------
   RESET SERVICE FORM
--------------------------------------------------------- */

function resetServiceForm() {

    const form = $("#serviceForm");

    if (form) {
        form.reset();
    }

    const id = $("#serviceId");
    const status = $("#serviceFormStatus");
    const button = $("#saveServiceButton");
    const cancel = $("#cancelServiceEdit");

    if (id) {
        id.value = "";
    }

    if (status) {
        status.value = "active";
    }

    if (button) {
        button.textContent = "Add Service";
    }

    if (cancel) {
        cancel.classList.add("hidden");
    }

    serviceState.editingId = "";
}


/* ---------------------------------------------------------
   EDIT SERVICE
--------------------------------------------------------- */

function editService(serviceId) {

    const service =
        serviceState.services.find(
            (item) =>
                String(item._id) ===
                String(serviceId)
        );

    if (!service) {
        return;
    }

    serviceState.editingId =
        service._id || "";

    const id = $("#serviceId");
    const name = $("#serviceName");
    const category = $("#serviceCategory");
    const description = $("#serviceDescription");
    const price = $("#servicePrice");
    const duration = $("#serviceDuration");
    const status = $("#serviceFormStatus");
    const button = $("#saveServiceButton");
    const cancel = $("#cancelServiceEdit");

    if (id) {
        id.value = service._id || "";
    }

    if (name) {
        name.value = service.name || "";
    }

    if (category) {
        category.value = service.category || "";
    }

    if (description) {
        description.value =
            service.description || "";
    }

    if (price) {
        price.value =
            service.price ?? 0;
    }

    if (duration) {
        duration.value =
            service.duration ?? 0;
    }

    if (status) {
        status.value =
            service.status === "inactive"
                ? "inactive"
                : "active";
    }

    if (button) {
        button.textContent =
            "Save Changes";
    }

    if (cancel) {
        cancel.classList.remove("hidden");
    }

    $("#serviceForm")?.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


/* ---------------------------------------------------------
   DELETE SERVICE
--------------------------------------------------------- */

async function deleteService(serviceId) {

    const service =
        serviceState.services.find(
            (item) =>
                String(item._id) ===
                String(serviceId)
        );

    if (!service) {
        return;
    }

    if (
        !window.confirm(
            `Delete "${service.name}"?`
        )
    ) {
        return;
    }

    try {

        await apiRequest(
            `/services/${serviceId}`,
            {
                method: "DELETE"
            }
        );

        showToast(
            "Service deleted successfully.",
            "success"
        );

        if (
            String(serviceState.editingId) ===
            String(serviceId)
        ) {
            resetServiceForm();
        }

        await loadServices(
            serviceState.selectedBusinessId
        );

    } catch (error) {

        console.error(
            "Service delete error:",
            error
        );

        showToast(
            error.message ||
            "Unable to delete service.",
            "error"
        );
    }
}


/* ---------------------------------------------------------
   SAVE SERVICE
--------------------------------------------------------- */

async function saveService(event) {

    event.preventDefault();

    const businessId =
        serviceState.selectedBusinessId ||
        $("#serviceBusinessSelect")?.value ||
        "";

    if (!businessId) {

        showToast(
            "Please select a business first.",
            "error"
        );

        return;
    }

    const name =
        String(
            $("#serviceName")?.value || ""
        ).trim();

    const category =
        String(
            $("#serviceCategory")?.value || ""
        ).trim();

    const description =
        String(
            $("#serviceDescription")?.value || ""
        ).trim();

    const price =
        $("#servicePrice")?.value === ""
            ? 0
            : Number(
                $("#servicePrice")?.value
            );

    const duration =
        $("#serviceDuration")?.value === ""
            ? 0
            : Number(
                $("#serviceDuration")?.value
            );

    const status =
        $("#serviceFormStatus")?.value ||
        "active";

    if (!name) {

        showToast(
            "Service name is required.",
            "error"
        );

        return;
    }

    if (
        !Number.isFinite(price) ||
        price < 0
    ) {

        showToast(
            "Please enter a valid price.",
            "error"
        );

        return;
    }

    if (
        !Number.isFinite(duration) ||
        duration < 0
    ) {

        showToast(
            "Please enter a valid duration.",
            "error"
        );

        return;
    }

    const payload = {
        business: businessId,
        name,
        category,
        description,
        price,
        duration,
        status
    };

    const button =
        $("#saveServiceButton");

    const originalText =
        button?.textContent ||
        "Add Service";

    if (button) {
        button.disabled = true;
        button.textContent =
            serviceState.editingId
                ? "Saving..."
                : "Adding...";
    }

    try {

        if (serviceState.editingId) {

            await apiRequest(
                `/services/${serviceState.editingId}`,
                {
                    method: "PATCH",
                    body: JSON.stringify(payload)
                }
            );

            showToast(
                "Service updated successfully.",
                "success"
            );

        } else {

            await apiRequest(
                "/services",
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            );

            showToast(
                "Service created successfully.",
                "success"
            );
        }

        resetServiceForm();

        await loadServices(
            businessId
        );

    } catch (error) {

        console.error(
            "Service save error:",
            error
        );

        showToast(
            error.message ||
            "Unable to save service.",
            "error"
        );

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent =
                originalText;
        }
    }
}


/* ---------------------------------------------------------
   BUSINESS SELECT
--------------------------------------------------------- */

function populateServiceBusinesses() {

    const select =
        $("#serviceBusinessSelect");

    if (!select) {
        return;
    }

    const currentValue =
        select.value ||
        serviceState.selectedBusinessId ||
        "";

    select.innerHTML = `
        <option value="">
            Select a business
        </option>
    `;

    state.businesses.forEach(
        (business) => {

            const option =
                document.createElement("option");

            option.value =
                business._id || "";

            option.textContent =
                business.name ||
                "Unnamed Business";

            select.appendChild(option);
        }
    );

    if (
        currentValue &&
        state.businesses.some(
            (business) =>
                String(business._id) ===
                String(currentValue)
        )
    ) {
        select.value = currentValue;
    }
}


/* ---------------------------------------------------------
   SERVICE EVENTS
--------------------------------------------------------- */

function setupServiceEvents() {

    const businessSelect =
        $("#serviceBusinessSelect");

    const serviceForm =
        $("#serviceForm");

    const cancelEdit =
        $("#cancelServiceEdit");

    const serviceList =
        $("#serviceList");

    businessSelect?.addEventListener(
        "change",
        async () => {

            resetServiceForm();

            await loadServices(
                businessSelect.value
            );
        }
    );

    serviceForm?.addEventListener(
        "submit",
        saveService
    );

    cancelEdit?.addEventListener(
        "click",
        resetServiceForm
    );

    serviceList?.addEventListener(
        "click",
        (event) => {

            const button =
                event.target.closest(
                    "[data-service-action]"
                );

            if (!button) {
                return;
            }

            const action =
                button.dataset.serviceAction;

            const serviceId =
                button.dataset.serviceId;

            if (!serviceId) {
                return;
            }

            if (action === "edit") {
                editService(serviceId);
            }

            if (action === "delete") {
                deleteService(serviceId);
            }
        }
    );
}


/* ---------------------------------------------------------
   SYNC SERVICE BUSINESS SELECTOR
--------------------------------------------------------- */

function syncServiceBusinessSelector() {

    populateServiceBusinesses();

    const select =
        $("#serviceBusinessSelect");

    if (!select) {
        return;
    }

    if (
        !select.value &&
        state.businesses.length
    ) {
        select.value =
            state.businesses[0]._id || "";
    }

    if (select.value) {

        serviceState.selectedBusinessId =
            select.value;

        loadServices(
            select.value
        );
    }
}

/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );

    navItems.forEach((item) => {

        item.addEventListener(
            "click",
            () => {

                navItems.forEach(
                    (nav) =>
                        nav.classList.remove("active")
                );

                item.classList.add("active");
            }
        );
    });
}


/* =========================================================
   INITIALIZE
========================================================= */

async function initializeDashboard() {

    setupLoginForm();

    const authenticated = await checkOwnerSession();

    if (!authenticated) {
        return;
    }

    setupEventListeners();

    setupNavigation();

    updateDashboardStats();

    await loadBusinessTypes();
    await loadBusinesses();
}


if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeDashboard
    );

} else {

    initializeDashboard();
}




/* =========================================================
   CUSTOMER WEBSITE - VISIT BUTTON
========================================================= */

function initializeCustomerWebsiteButton() {

    const button =
        document.querySelector(
            "#visitBusinessWebsite"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        () => {

            if (!selectedBusinessId) {

                showToast(
                    "Please select a business first.",
                    "error"
                );

                return;
            }


            const business =
                getBusinessById(
                    selectedBusinessId
                );


            if (!business) {

                showToast(
                    "Business not found.",
                    "error"
                );

                return;
            }


            const website =
                business.website || {};


            if (
                business.status !== "active"
            ) {

                showToast(
                    "Activate the business before visiting its website.",
                    "error"
                );

                return;
            }


            if (
                website.enabled !== true
            ) {

                showToast(
                    "Customer website is OFF. Turn it ON first.",
                    "error"
                );

                return;
            }


            if (
                website.hidden === true
            ) {

                showToast(
                    "Customer website is hidden. Turn visibility ON first.",
                    "error"
                );

                return;
            }


            const url =
                `/?business=${encodeURIComponent(
                    selectedBusinessId
                )}`;


            window.open(
                url,
                "_blank",
                "noopener,noreferrer"
            );

        }
    );

}


/* =========================================================
   INITIALIZE CUSTOMER WEBSITE BUTTON
========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeCustomerWebsiteButton
    );

} else {

    initializeCustomerWebsiteButton();

}



/* =========================================================
   BIZFLOW - SERVICE BUSINESS SELECTOR REAL DATA FIX
   ========================================================= */

async function populateServiceBusinesses() {
    const select = document.getElementById("serviceBusinessSelect");

    if (!select) {
        console.warn("BizFlow: #serviceBusinessSelect not found.");
        return;
    }

    try {
        select.innerHTML = '<option value="">Loading businesses...</option>';
        select.disabled = true;

        const token = sessionStorage.getItem("bizflow_owner_token");

        if (!token) {
            throw new Error("Authentication token not found.");
        }

        const response = await fetch("/api/businesses", {
            method: "GET",
            credentials: "same-origin",
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(
                "Business API returned HTTP " + response.status
            );
        }

        const data = await response.json();

        console.log("BizFlow Service Business API:", data);

        const businesses = Array.isArray(data)
            ? data
            : Array.isArray(data.businesses)
                ? data.businesses
                : [];

        select.innerHTML = "";

        if (businesses.length === 0) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "No businesses available";
            select.appendChild(option);

            select.disabled = true;

            if (typeof updateServiceManagementState === "function") {
                updateServiceManagementState();
            }

            return;
        }

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Select a business";
        select.appendChild(placeholder);

        businesses.forEach((business) => {
            if (!business || !business._id) {
                return;
            }

            const option = document.createElement("option");

            option.value = String(business._id);

            option.textContent =
                String(business.name || "Unnamed Business");

            select.appendChild(option);
        });

        select.disabled = false;

        if (typeof updateServiceManagementState === "function") {
            updateServiceManagementState();
        }

        console.log(
            "BizFlow: Service business selector populated:",
            select.options.length - 1
        );

    } catch (error) {

        console.error(
            "BizFlow: Failed to populate service businesses:",
            error
        );

        select.innerHTML =
            '<option value="">Unable to load businesses</option>';

        select.disabled = true;
    }
}

/* Re-sync whenever Service Management becomes active */
function syncServiceBusinessSelector() {
    populateServiceBusinesses();
}

/* Initial load */
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        populateServiceBusinesses();
    }, 100);
});

/* =========================================================
   END SERVICE BUSINESS SELECTOR REAL DATA FIX
   ========================================================= */

/* =========================================================
   BIZFLOW SERVICE - ENSURE CURRENT BUSINESS SERVICES LOAD
   ========================================================= */

async function ensureCurrentServiceData() {

    const select = document.querySelector(
        "#serviceBusinessSelect"
    );

    if (!select) {
        console.warn(
            "BizFlow: service business selector not found."
        );
        return;
    }

    const businessId =
        String(select.value || "").trim();

    if (!businessId) {
        console.warn(
            "BizFlow: no business selected for services."
        );

        serviceState.services = [];
        serviceState.selectedBusinessId = "";

        return;
    }

    serviceState.selectedBusinessId =
        businessId;

    console.log(
        "BizFlow: Loading services for business:",
        businessId
    );

    await loadServices(businessId);

    console.log(
        "BizFlow: Services loaded into state:",
        serviceState.services.length
    );
}


/* ---------------------------------------------------------
   SERVICE NAVIGATION / SECTION REFRESH
   --------------------------------------------------------- */

document.addEventListener(
    "click",
    async (event) => {

        const target =
            event.target.closest(
                '[data-section="services"], [data-page="services"], [href="#services"]'
            );

        if (!target) {
            return;
        }

        setTimeout(
            async () => {

                try {

                    await ensureCurrentServiceData();

                } catch (error) {

                    console.error(
                        "BizFlow: service navigation load failed:",
                        error
                    );

                }

            },
            50
        );
    }
);


/* ---------------------------------------------------------
   EXTRA SAFETY:
   WHEN SELECT BUSINESS CHANGES, ALWAYS REFRESH STATE
   --------------------------------------------------------- */

document.addEventListener(
    "change",
    async (event) => {

        if (
            event.target?.id !==
            "serviceBusinessSelect"
        ) {
            return;
        }

        const businessId =
            String(
                event.target.value || ""
            ).trim();

        if (!businessId) {

            serviceState.services = [];
            serviceState.selectedBusinessId = "";

            renderServices();

            return;
        }

        try {

            await loadServices(
                businessId
            );

            console.log(
                "BizFlow: Service selector refreshed:",
                serviceState.services.length
            );

        } catch (error) {

            console.error(
                "BizFlow: service selector refresh failed:",
                error
            );

        }

    }
);


/* =========================================================
   END SERVICE STATE FIX
   ========================================================= */

/* =========================================================
   BIZFLOW CUSTOM DROPDOWN SYSTEM
========================================================= */

(function initBizFlowCustomDropdowns() {

    function closeAllDropdowns(except = null) {

        document
            .querySelectorAll(".bizflow-custom-dropdown.is-open")
            .forEach((dropdown) => {

                if (dropdown !== except) {

                    dropdown.classList.remove("is-open");

                    const trigger =
                        dropdown.querySelector(
                            ".bizflow-dropdown-trigger"
                        );

                    if (trigger) {
                        trigger.setAttribute(
                            "aria-expanded",
                            "false"
                        );
                    }
                }
            });
    }


    function syncDropdown(dropdown) {

        const select =
            dropdown.querySelector(
                ".bizflow-native-select"
            );

        const valueElement =
            dropdown.querySelector(
                ".bizflow-dropdown-value"
            );

        const menu =
            dropdown.querySelector(
                ".bizflow-dropdown-menu"
            );

        if (!select || !valueElement || !menu) {
            return;
        }


        const selectedOption =
            select.options[
                select.selectedIndex
            ];


        if (
            !selectedOption ||
            !selectedOption.value
        ) {

            valueElement.textContent =
                "Select business type";

            valueElement.classList.add(
                "is-placeholder"
            );

        } else {

            valueElement.textContent =
                selectedOption.textContent;

            valueElement.classList.remove(
                "is-placeholder"
            );
        }


        menu
            .querySelectorAll(
                ".bizflow-dropdown-option"
            )
            .forEach((optionButton) => {

                const selected =
                    optionButton.dataset.value ===
                    String(select.value);

                optionButton.classList.toggle(
                    "is-selected",
                    selected
                );

                const check =
                    optionButton.querySelector(
                        ".bizflow-dropdown-check"
                    );

                if (check) {
                    check.setAttribute(
                        "aria-hidden",
                        selected ? "false" : "true"
                    );
                }
            });
    }


    function buildOptions(dropdown) {

        const select =
            dropdown.querySelector(
                ".bizflow-native-select"
            );

        const menu =
            dropdown.querySelector(
                ".bizflow-dropdown-menu"
            );

        if (!select || !menu) {
            return;
        }


        menu.innerHTML = "";


        Array.from(select.options)
            .forEach((option) => {

                if (!option.value) {
                    return;
                }


                const button =
                    document.createElement("button");

                button.type = "button";

                button.className =
                    "bizflow-dropdown-option";

                button.setAttribute(
                    "role",
                    "option"
                );

                button.dataset.value =
                    String(option.value);


                const text =
                    document.createElement("span");

                text.className =
                    "bizflow-dropdown-option-text";

                text.textContent =
                    option.textContent;


                const check =
                    document.createElement("span");

                check.className =
                    "bizflow-dropdown-check";

                check.setAttribute(
                    "aria-hidden",
                    "true"
                );

                check.innerHTML = `
                    <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            d="M5 12.5l4 4L19 7"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                `;


                button.appendChild(text);

                button.appendChild(check);


                button.addEventListener(
                    "click",
                    function(event) {

                        event.preventDefault();

                        select.value =
                            button.dataset.value;

                        select.dispatchEvent(
                            new Event(
                                "change",
                                {
                                    bubbles: true
                                }
                            )
                        );


                        syncDropdown(dropdown);

                        dropdown.classList.remove(
                            "is-open"
                        );


                        const trigger =
                            dropdown.querySelector(
                                ".bizflow-dropdown-trigger"
                            );

                        if (trigger) {
                            trigger.setAttribute(
                                "aria-expanded",
                                "false"
                            );

                            trigger.focus();
                        }
                    }
                );


                menu.appendChild(button);
            });


        syncDropdown(dropdown);
    }


    function initializeDropdown(dropdown) {

        if (
            dropdown.dataset.bizflowReady ===
            "true"
        ) {
            return;
        }


        const select =
            dropdown.querySelector(
                ".bizflow-native-select"
            );

        const trigger =
            dropdown.querySelector(
                ".bizflow-dropdown-trigger"
            );


        if (!select || !trigger) {
            return;
        }


        dropdown.dataset.bizflowReady =
            "true";


        buildOptions(dropdown);


        trigger.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                const isOpen =
                    dropdown.classList.contains(
                        "is-open"
                    );


                closeAllDropdowns(dropdown);


                if (!isOpen) {

                    buildOptions(dropdown);

                    dropdown.classList.add(
                        "is-open"
                    );

                    trigger.setAttribute(
                        "aria-expanded",
                        "true"
                    );
                }
            }
        );


        select.addEventListener(
            "change",
            function() {

                buildOptions(dropdown);

            }
        );


        dropdown.addEventListener(
            "keydown",
            function(event) {

                if (event.key === "Escape") {

                    dropdown.classList.remove(
                        "is-open"
                    );

                    trigger.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                    trigger.focus();
                }
            }
        );
    }


    function initializeAll() {

        document
            .querySelectorAll(
                ".bizflow-custom-dropdown"
            )
            .forEach(
                initializeDropdown
            );
    }


    document.addEventListener(
        "click",
        function(event) {

            if (
                !event.target.closest(
                    ".bizflow-custom-dropdown"
                )
            ) {

                closeAllDropdowns();
            }
        }
    );


    initializeAll();


    /*
     * Business type options are loaded
     * asynchronously from the API.
     * Rebuild the custom dropdown after
     * the native select changes.
     */

    const observer =
        new MutationObserver(
            function() {

                document
                    .querySelectorAll(
                        ".bizflow-custom-dropdown"
                    )
                    .forEach(
                        (dropdown) => {

                            const select =
                                dropdown.querySelector(
                                    ".bizflow-native-select"
                                );

                            if (select) {

                                initializeDropdown(
                                    dropdown
                                );

                                buildOptions(
                                    dropdown
                                );
                            }
                        }
                    );
            }
        );


    document
        .querySelectorAll(
            ".bizflow-native-select"
        )
        .forEach((select) => {

            observer.observe(
                select,
                {
                    childList: true,
                    subtree: true
                }
            );
        });

})();


/* =========================================================
   BIZFLOW - SERVICE BUSINESS ACTIVE / INACTIVE TOGGLE
========================================================= */

(function initServiceBusinessStatusToggle() {

    function initializeStatusToggle() {

        const toggle =
            document.querySelector(
                "#serviceBusinessStatusToggle"
            );

        if (!toggle) {
            return;
        }

        if (
            toggle.dataset.bizflowStatusReady ===
            "true"
        ) {
            return;
        }

        toggle.dataset.bizflowStatusReady =
            "true";

        toggle.addEventListener(
            "click",
            function () {

                const isActive =
                    toggle.classList.contains(
                        "is-active"
                    );

                if (isActive) {

                    toggle.classList.remove(
                        "is-active"
                    );

                    toggle.classList.add(
                        "is-inactive"
                    );

                    toggle.setAttribute(
                        "aria-pressed",
                        "false"
                    );

                    const text =
                        toggle.querySelector(
                            ".service-business-status-text"
                        );

                    if (text) {
                        text.textContent =
                            "Inactive";
                    }

                } else {

                    toggle.classList.remove(
                        "is-inactive"
                    );

                    toggle.classList.add(
                        "is-active"
                    );

                    toggle.setAttribute(
                        "aria-pressed",
                        "true"
                    );

                    const text =
                        toggle.querySelector(
                            ".service-business-status-text"
                        );

                    if (text) {
                        text.textContent =
                            "Active";
                    }
                }
            }
        );
    }

    initializeStatusToggle();

    const observer =
        new MutationObserver(
            initializeStatusToggle
        );

    observer.observe(
        document.body,
        {
            childList: true,
            subtree: true
        }
    );

})();

