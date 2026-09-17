const API_URL = "http://localhost:5000";

let token = localStorage.getItem("forestSphereToken");

let currentUser = JSON.parse(
    localStorage.getItem("forestSphereUser") || "null"
);


// ==========================================
// PAGE INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    if (token && currentUser) {
        showApp();
    } else {
        showLogin();
    }

    setupForms();

});


// ==========================================
// AUTH PAGES
// ==========================================

function showLogin() {

    document
        .getElementById("loginPage")
        .classList.remove("hidden");

    document
        .getElementById("registerPage")
        .classList.add("hidden");

    document
        .getElementById("appPage")
        .classList.add("hidden");
}


function showRegister() {

    document
        .getElementById("loginPage")
        .classList.add("hidden");

    document
        .getElementById("registerPage")
        .classList.remove("hidden");

    document
        .getElementById("appPage")
        .classList.add("hidden");
}


// ==========================================
// SHOW APPLICATION
// ==========================================

function showApp() {

    document
        .getElementById("loginPage")
        .classList.add("hidden");

    document
        .getElementById("registerPage")
        .classList.add("hidden");

    document
        .getElementById("appPage")
        .classList.remove("hidden");

    updateUserInterface();

    showSection("dashboard");

    loadDashboard();

}


// ==========================================
// UPDATE USER INTERFACE
// ==========================================

function updateUserInterface() {

    if (!currentUser) return;

    document.getElementById("userName").textContent =
        currentUser.name;

    document.getElementById("userRole").textContent =
        formatRole(currentUser.role);

    document.getElementById("welcomeText").textContent =
        `Welcome back, ${currentUser.name}`;

    const firstLetter =
        currentUser.name.charAt(0).toUpperCase();

    document.querySelector(".user-avatar")
        .textContent = firstLetter;


    // Only officers/admins can create restoration projects

    const createProjectButton =
        document.getElementById("createProjectButton");

    if (
        currentUser.role === "officer" ||
        currentUser.role === "admin"
    ) {

        createProjectButton.classList.remove("hidden");

    } else {

        createProjectButton.classList.add("hidden");

    }

}


function formatRole(role) {

    if (role === "community")
        return "Community User";

    if (role === "officer")
        return "Forest Officer";

    if (role === "admin")
        return "Administrator";

    return role;

}


// ==========================================
// LOGIN
// ==========================================

async function login(email, password) {

    try {

        const response = await fetch(
            `${API_URL}/api/auth/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            }
        );


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.message || "Login failed"
            );

        }


        token = data.token;

        currentUser = data.user;


        localStorage.setItem(
            "forestSphereToken",
            token
        );

        localStorage.setItem(
            "forestSphereUser",
            JSON.stringify(currentUser)
        );


        showApp();


    } catch (error) {

        document.getElementById(
            "loginMessage"
        ).textContent = error.message;

    }

}


// ==========================================
// REGISTER
// ==========================================

async function register(
    name,
    email,
    password,
    phone
) {

    try {

        const response = await fetch(
            `${API_URL}/api/auth/register`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name,
                    email,
                    password,
                    phone
                })
            }
        );


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.message || "Registration failed"
            );

        }


        document.getElementById(
            "registerMessage"
        ).textContent =
            "Account created successfully. Please sign in.";


        setTimeout(() => {

            showLogin();

        }, 1200);


    } catch (error) {

        document.getElementById(
            "registerMessage"
        ).textContent = error.message;

    }

}


// ==========================================
// LOGOUT
// ==========================================

function logout() {

    localStorage.removeItem(
        "forestSphereToken"
    );

    localStorage.removeItem(
        "forestSphereUser"
    );

    token = null;

    currentUser = null;

    showLogin();

}


// ==========================================
// API HELPER
// ==========================================

async function apiRequest(
    endpoint,
    options = {}
) {

    const response = await fetch(
        `${API_URL}${endpoint}`,
        {
            ...options,

            headers: {

                "Content-Type": "application/json",

                ...(token
                    ? {
                        Authorization:
                            `Bearer ${token}`
                    }
                    : {}),

                ...(options.headers || {})

            }

        }
    );


    const data = await response.json();


    if (!response.ok) {

        throw new Error(
            data.message || "Request failed"
        );

    }


    return data;

}


// ==========================================
// NAVIGATION
// ==========================================

function showSection(section) {

    const sections = [
        "dashboard",
        "conflicts",
        "wildlife",
        "restoration",
        "elephant-detection"
    ];

    sections.forEach(name => {

        const element = document.getElementById(
            `${name}Section`
        );

        if (element) {
            element.classList.add("hidden");
        }

    });


    const selectedSection = document.getElementById(
        `${section}Section`
    );

    if (selectedSection) {
        selectedSection.classList.remove("hidden");
    }


    document
        .querySelectorAll(".nav-item")
        .forEach(button => {
            button.classList.remove("active");
        });


    const titles = {
        dashboard: "Dashboard",
        conflicts: "Conflict Reports",
        wildlife: "Wildlife Sightings",
        restoration: "Forest Restoration",
        "elephant-detection": "AI Elephant Detection"
    };


    document.getElementById(
        "pageTitle"
    ).textContent = titles[section] || "ForestSphere";


    const activeButton = Array.from(
        document.querySelectorAll(".nav-item")
    ).find(button =>
        button.getAttribute("onclick") ===
        `showSection('${section}')`
    );

    if (activeButton) {
        activeButton.classList.add("active");
    }


    if (section === "dashboard") {
        loadDashboard();
    }


    if (section === "conflicts") {
        loadConflicts();
    }


    if (section === "wildlife") {
        loadWildlife();
    }


    if (section === "restoration") {
        loadRestoration();
    }


    if (section === "elephant-detection") {
        loadElephantDetections();
    }

}


// ==========================================
// DASHBOARD
// ==========================================

async function loadDashboard() {

    try {

        let conflictData;


        /*
         * Officers/admins see ALL reports.
         * Community users see only their own reports.
         */

        if (
            currentUser.role === "officer" ||
            currentUser.role === "admin"
        ) {

            conflictData =
                await apiRequest(
                    "/api/conflicts"
                );

        } else {

            conflictData =
                await apiRequest(
                    "/api/conflicts/my-reports"
                );

        }


        const wildlifeData =
            await apiRequest(
                "/api/wildlife/my-sightings"
            );


        const projectData =
            await apiRequest(
                "/api/restoration"
            );


        document.getElementById(
            "conflictCount"
        ).textContent =
            conflictData.count;


        document.getElementById(
            "wildlifeCount"
        ).textContent =
            wildlifeData.count;


        document.getElementById(
            "projectCount"
        ).textContent =
            projectData.count;


        const verified =
            conflictData.reports.filter(
                report =>
                    report.status === "VERIFIED"
            ).length;


        document.getElementById(
            "verifiedCount"
        ).textContent =
            verified;


        renderRecentConflicts(
            conflictData.reports.slice(0, 3)
        );


        renderRestorationOverview(
            projectData.projects.slice(0, 3)
        );


    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

    }

}


// ==========================================
// CONFLICT REPORTS
// ==========================================

async function loadConflicts() {

    try {

        let data;


        /*
         * OFFICER / ADMIN
         *
         * Get every conflict report so that
         * the officer can review them.
         */

        if (
            currentUser.role === "officer" ||
            currentUser.role === "admin"
        ) {

            data =
                await apiRequest(
                    "/api/conflicts"
                );


            renderOfficerConflicts(
                data.reports
            );


        } else {

            /*
             * COMMUNITY USER
             *
             * Only their own reports.
             */

            data =
                await apiRequest(
                    "/api/conflicts/my-reports"
                );


            renderConflicts(
                data.reports
            );

        }


    } catch (error) {

        document.getElementById(
            "conflictList"
        ).innerHTML = `

            <div class="empty-state">

                ${escapeHTML(error.message)}

            </div>

        `;

    }

}


// ==========================================
// COMMUNITY CONFLICT VIEW
// ==========================================

function renderConflicts(reports) {

    const container =
        document.getElementById(
            "conflictList"
        );


    if (
        !reports ||
        reports.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                No conflict reports found.

            </div>

        `;

        return;

    }


    container.innerHTML =

        reports.map(report => `

            <div class="data-card">

                <div class="data-card-header">

                    <h3>

                        ${escapeHTML(
                            report.title
                        )}

                    </h3>


                    <span
                        class="badge ${String(
                            report.status
                        ).toLowerCase()}">

                        ${escapeHTML(
                            report.status
                        )}

                    </span>

                </div>


                <p>

                    ${escapeHTML(
                        report.description
                    )}

                </p>


                <p>

                    📍
                    ${escapeHTML(
                        report.location
                    )}

                </p>


                <p>

                    Type:
                    ${escapeHTML(
                        report.incidentType
                    )}

                </p>

            </div>

        `).join("");

}


// ==========================================
// OFFICER CONFLICT VIEW
// ==========================================

function renderOfficerConflicts(reports) {

    const container =
        document.getElementById(
            "conflictList"
        );


    if (
        !reports ||
        reports.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                No conflict reports found.

            </div>

        `;

        return;

    }


    container.innerHTML =

        reports.map(report => {


            const reporterName =
                report.reportedBy?.name ||
                "Unknown User";


            let verifyButton = "";


            /*
             * Show Verify button ONLY
             * for pending reports.
             */

            if (
                report.status === "PENDING"
            ) {

                verifyButton = `

                    <button

                        class="primary-button small"

                        onclick="verifyConflict(
                            '${report._id}'
                        )">

                        ✓ Verify Report

                    </button>

                `;

            }


            return `

                <div class="data-card">

                    <div class="data-card-header">

                        <h3>

                            ${escapeHTML(
                                report.title
                            )}

                        </h3>


                        <span
                            class="badge ${String(
                                report.status
                            ).toLowerCase()}">

                            ${escapeHTML(
                                report.status
                            )}

                        </span>

                    </div>


                    <p>

                        ${escapeHTML(
                            report.description
                        )}

                    </p>


                    <p>

                        📍
                        ${escapeHTML(
                            report.location
                        )}

                    </p>


                    <p>

                        Type:
                        ${escapeHTML(
                            report.incidentType
                        )}

                    </p>


                    <p>

                        Reported by:

                        <strong>

                            ${escapeHTML(
                                reporterName
                            )}

                        </strong>

                    </p>


                    ${verifyButton}

                </div>

            `;

        }).join("");

}


// ==========================================
// VERIFY CONFLICT
// ==========================================

async function verifyConflict(
    reportId
) {

    const confirmed =
        confirm(
            "Are you sure you want to verify this conflict report?"
        );


    if (!confirmed) {

        return;

    }


    try {

        await apiRequest(

            `/api/conflicts/${reportId}/verify`,

            {
                method: "PUT"
            }

        );


        alert(
            "Conflict report verified successfully."
        );


        /*
         * Reload the report list.
         */

        await loadConflicts();


        /*
         * Reload dashboard statistics.
         */

        await loadDashboard();


    } catch (error) {

        alert(
            "Verification failed: " +
            error.message
        );

    }

}


// ==========================================
// RECENT CONFLICT REPORTS
// ==========================================

function renderRecentConflicts(
    reports
) {

    const container =
        document.getElementById(
            "recentConflicts"
        );


    if (
        !reports ||
        reports.length === 0
    ) {

        container.innerHTML =
            "No reports available.";

        return;

    }


    container.innerHTML =

        reports.map(report => `

            <div class="data-card">

                <div class="data-card-header">

                    <h3>

                        ${escapeHTML(
                            report.title
                        )}

                    </h3>


                    <span
                        class="badge ${String(
                            report.status
                        ).toLowerCase()}">

                        ${escapeHTML(
                            report.status
                        )}

                    </span>

                </div>

            </div>

        `).join("");

}


// ==========================================
// CREATE CONFLICT
// ==========================================

async function createConflict(
    event
) {

    event.preventDefault();


    try {

        await apiRequest(

            "/api/conflicts",

            {

                method: "POST",

                body: JSON.stringify({

                    title:
                        document.getElementById(
                            "conflictTitle"
                        ).value,


                    description:
                        document.getElementById(
                            "conflictDescription"
                        ).value,


                    location:
                        document.getElementById(
                            "conflictLocation"
                        ).value,


                    incidentDate:
                        document.getElementById(
                            "conflictDate"
                        ).value,


                    incidentType:
                        document.getElementById(
                            "conflictType"
                        ).value

                })

            }

        );


        closeModal(
            "conflictModal"
        );


        event.target.reset();


        await loadConflicts();


        await loadDashboard();


        alert(
            "Conflict report submitted successfully."
        );


    } catch (error) {

        alert(
            error.message
        );

    }

}


// ==========================================
// WILDLIFE
// ==========================================

async function loadWildlife() {

    try {

        const data =
            await apiRequest(
                "/api/wildlife/my-sightings"
            );


        renderWildlife(
            data.sightings
        );


    } catch (error) {

        document.getElementById(
            "wildlifeList"
        ).innerHTML = `

            <div class="empty-state">

                ${escapeHTML(
                    error.message
                )}

            </div>

        `;

    }

}


// ==========================================
// WILDLIFE DISPLAY
// ==========================================

function renderWildlife(
    sightings
) {

    const container =
        document.getElementById(
            "wildlifeList"
        );


    if (
        !sightings ||
        sightings.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                No wildlife sightings found.

            </div>

        `;

        return;

    }


    container.innerHTML =

        sightings.map(
            sighting => `

            <div class="data-card">

                <div class="data-card-header">

                    <h3>

                        🐘
                        ${escapeHTML(
                            sighting.species
                        )}

                    </h3>


                    <span
                        class="badge ${String(
                            sighting.status
                        ).toLowerCase()}">

                        ${escapeHTML(
                            sighting.status
                        )}

                    </span>

                </div>


                <p>

                    📍
                    ${escapeHTML(
                        sighting.location
                    )}

                </p>


                <p>

                    ${escapeHTML(
                        sighting.description
                    )}

                </p>

            </div>

        `
        ).join("");

}


// ==========================================
// CREATE WILDLIFE SIGHTING
// ==========================================

async function createWildlife(
    event
) {

    event.preventDefault();


    try {

        await apiRequest(

            "/api/wildlife",

            {

                method: "POST",

                body: JSON.stringify({

                    species:
                        document.getElementById(
                            "wildlifeSpecies"
                        ).value,


                    location:
                        document.getElementById(
                            "wildlifeLocation"
                        ).value,


                    sightingDate:
                        document.getElementById(
                            "wildlifeDate"
                        ).value,


                    description:
                        document.getElementById(
                            "wildlifeDescription"
                        ).value

                })

            }

        );


        closeModal(
            "wildlifeModal"
        );


        event.target.reset();


        await loadWildlife();


        await loadDashboard();


        alert(
            "Wildlife sighting submitted successfully."
        );


    } catch (error) {

        alert(
            error.message
        );

    }

}


// ==========================================
// AI ELEPHANT DETECTION
// ==========================================

async function loadElephantDetections() {

    const container = document.getElementById(
        "elephantDetectionList"
    );

    if (!container) return;

    container.innerHTML = `
        <div class="empty-state">
            Loading AI elephant detections...
        </div>
    `;

    try {

        const data = await apiRequest(
            "/api/elephant-detections"
        );

        renderElephantDetections(
            data.detections || []
        );

    } catch (error) {

        container.innerHTML = `
            <div class="empty-state">
                ${escapeHTML(error.message)}
            </div>
        `;

    }
}


function renderElephantDetections(detections) {

    const container = document.getElementById(
        "elephantDetectionList"
    );

    if (!container) return;

    if (!detections || detections.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                No AI elephant detections found.
            </div>
        `;
        return;
    }


    const canVerify =
        currentUser &&
        (currentUser.role === "officer" ||
         currentUser.role === "admin");


    container.innerHTML = detections.map(detection => {

        const status = String(
            detection.verificationStatus || "PENDING"
        ).toUpperCase();

        const risk = String(
            detection.riskLevel || "MEDIUM"
        ).toUpperCase();

        const confidence = Number(
            detection.confidence || 0
        );

        const confidencePercent = Math.round(
            confidence * 100
        );

        const timestamp = formatDetectionDate(
            detection.timestamp
        );

        let actionButtons = "";

        if (canVerify && status === "PENDING") {
            actionButtons = `
                <div class="detection-actions">

                    <button
                        class="primary-button small"
                        onclick="verifyElephantDetection('${detection._id}')">
                        ✓ Verify Detection
                    </button>

                    <button
                        class="secondary-button small"
                        onclick="rejectElephantDetection('${detection._id}')">
                        ✕ Reject Detection
                    </button>

                </div>
            `;
        }


        const verificationDetails =
            status !== "PENDING" && detection.verifiedBy
                ? `
                    <p>
                        Verified by:
                        <strong>
                            ${escapeHTML(detection.verifiedBy)}
                        </strong>
                    </p>

                    <p>
                        Verified at:
                        ${formatDetectionDate(detection.verifiedAt)}
                    </p>
                `
                : "";


        const imageFilename = detection.image
            ? String(detection.image)
            : "";

        const imageUrl = imageFilename
            ? `${API_URL}/detection-images/${encodeURIComponent(imageFilename)}`
            : "";

        const detectionImage = imageUrl
            ? `
                <div class="detection-image-wrapper">
                    <img
                        class="detection-image"
                        src="${imageUrl}"
                        alt="YOLO elephant detection image"
                        loading="lazy"
                        onerror="this.parentElement.classList.add('image-load-error'); this.style.display='none';"
                    >
                    <div class="detection-image-error">
                        Detection image unavailable
                    </div>
                </div>
            `
            : `
                <div class="detection-image-wrapper no-image">
                    <div class="detection-image-placeholder">
                        📷<br>
                        No detection image available
                    </div>
                </div>
            `;

        return `
            <div class="data-card detection-card">

                <div class="detection-card-content">

                    ${detectionImage}

                    <div class="detection-card-details">

                        <div class="data-card-header">

                            <div>
                                <h3>🐘 Elephant Detection</h3>
                                <p class="detection-id">
                                    ID: ${escapeHTML(detection._id)}
                                </p>
                            </div>

                            <span class="badge ${status.toLowerCase()}">
                                ${escapeHTML(status)}
                            </span>

                        </div>


                        <div class="detection-grid">

                            <div class="detection-field">
                                <span>Camera ID</span>
                                <strong>${escapeHTML(detection.deviceId)}</strong>
                            </div>

                            <div class="detection-field">
                                <span>PIR Sensor</span>
                                <strong>${escapeHTML(detection.sensorId)}</strong>
                            </div>

                            <div class="detection-field">
                                <span>Zone</span>
                                <strong>${escapeHTML(detection.zone)}</strong>
                            </div>

                            <div class="detection-field">
                                <span>Elephant Count</span>
                                <strong>${escapeHTML(detection.elephantCount)}</strong>
                            </div>

                            <div class="detection-field">
                                <span>YOLO Confidence</span>
                                <strong>${confidencePercent}%</strong>
                            </div>

                            <div class="detection-field">
                                <span>Risk Level</span>
                                <strong class="risk-${risk.toLowerCase()}">
                                    ${escapeHTML(risk)}
                                </strong>
                            </div>

                            <div class="detection-field detection-field-wide">
                                <span>Detection Time</span>
                                <strong>${escapeHTML(timestamp)}</strong>
                            </div>

                            <div class="detection-field detection-field-wide">
                                <span>Image Reference</span>
                                <strong>${escapeHTML(detection.image || "Not available")}</strong>
                            </div>

                        </div>

                        ${verificationDetails}
                        ${actionButtons}

                    </div>

                </div>

            </div>
        `;

    }).join("");
}


function formatDetectionDate(value) {

    if (!value) {
        return "Not available";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString();
}


async function verifyElephantDetection(
    detectionId
) {

    if (!currentUser ||
        (currentUser.role !== "officer" &&
         currentUser.role !== "admin")) {
        alert("Only Forest Officers and Administrators can verify detections.");
        return;
    }


    const confirmed = confirm(
        "Are you sure you want to verify this elephant detection?"
    );

    if (!confirmed) {
        return;
    }


    try {

        await apiRequest(
            `/api/elephant-detections/${detectionId}/verify`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    verificationStatus: "VERIFIED",
                    verifiedBy: currentUser.name || currentUser.email || "Forest Officer"
                })
            }
        );

        alert(
            "Elephant detection verified successfully."
        );

        await loadElephantDetections();
        await loadDashboard();

    } catch (error) {

        alert(
            "Verification failed: " +
            error.message
        );

    }
}


async function rejectElephantDetection(
    detectionId
) {

    if (!currentUser ||
        (currentUser.role !== "officer" &&
         currentUser.role !== "admin")) {
        alert("Only Forest Officers and Administrators can reject detections.");
        return;
    }


    const confirmed = confirm(
        "Are you sure you want to reject this elephant detection?"
    );

    if (!confirmed) {
        return;
    }


    try {

        await apiRequest(
            `/api/elephant-detections/${detectionId}/verify`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    verificationStatus: "REJECTED",
                    verifiedBy: currentUser.name || currentUser.email || "Forest Officer"
                })
            }
        );

        alert(
            "Elephant detection rejected successfully."
        );

        await loadElephantDetections();
        await loadDashboard();

    } catch (error) {

        alert(
            "Rejection failed: " +
            error.message
        );

    }
}


// ==========================================
// RESTORATION
// ==========================================

async function loadRestoration() {

    try {

        const data =
            await apiRequest(
                "/api/restoration"
            );


        renderProjects(
            data.projects
        );


    } catch (error) {

        document.getElementById(
            "projectList"
        ).innerHTML = `

            <div class="empty-state">

                ${escapeHTML(
                    error.message
                )}

            </div>

        `;

    }

}


// ==========================================
// RESTORATION DISPLAY
// ==========================================

function renderProjects(
    projects
) {

    const container =
        document.getElementById(
            "projectList"
        );


    if (
        !projects ||
        projects.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                No restoration projects found.

            </div>

        `;

        return;

    }


    container.innerHTML =

        projects.map(
            project => `

            <div class="data-card">

                <div class="data-card-header">

                    <h3>

                        🌱
                        ${escapeHTML(
                            project.projectName
                        )}

                    </h3>


                    <span
                        class="badge ${String(
                            project.status
                        ).toLowerCase()}">

                        ${escapeHTML(
                            project.status
                        )}

                    </span>

                </div>


                <p>

                    ${escapeHTML(
                        project.description
                    )}

                </p>


                <p>

                    📍
                    ${escapeHTML(
                        project.location
                    )}

                </p>


                <div class="progress-bar">

                    <div
                        class="progress-fill"
                        style="width:${project.progress}%">

                    </div>

                </div>


                <p>

                    Progress:

                    <strong>

                        ${project.progress}%

                    </strong>

                </p>

            </div>

        `
        ).join("");

}


// ==========================================
// RESTORATION OVERVIEW
// ==========================================

function renderRestorationOverview(
    projects
) {

    const container =
        document.getElementById(
            "restorationOverview"
        );


    if (
        !projects ||
        projects.length === 0
    ) {

        container.innerHTML =
            "No projects available.";

        return;

    }


    container.innerHTML =

        projects.map(
            project => `

            <div class="data-card">

                <div class="data-card-header">

                    <strong>

                        ${escapeHTML(
                            project.projectName
                        )}

                    </strong>


                    <span>

                        ${project.progress}%

                    </span>

                </div>


                <div class="progress-bar">

                    <div
                        class="progress-fill"
                        style="width:${project.progress}%">

                    </div>

                </div>

            </div>

        `
        ).join("");

}


// ==========================================
// CREATE RESTORATION PROJECT
// ==========================================

async function createProject(
    event
) {

    event.preventDefault();


    try {

        await apiRequest(

            "/api/restoration",

            {

                method: "POST",

                body: JSON.stringify({

                    projectName:
                        document.getElementById(
                            "projectName"
                        ).value,


                    description:
                        document.getElementById(
                            "projectDescription"
                        ).value,


                    location:
                        document.getElementById(
                            "projectLocation"
                        ).value,


                    startDate:
                        document.getElementById(
                            "projectStartDate"
                        ).value,


                    targetDate:
                        document.getElementById(
                            "projectTargetDate"
                        ).value

                })

            }

        );


        closeModal(
            "projectModal"
        );


        event.target.reset();


        await loadRestoration();


        await loadDashboard();


        alert(
            "Restoration project created successfully."
        );


    } catch (error) {

        alert(
            error.message
        );

    }

}


// ==========================================
// MODALS
// ==========================================

function openConflictModal() {

    document
        .getElementById(
            "conflictModal"
        )
        .classList.remove("hidden");

}


function openWildlifeModal() {

    document
        .getElementById(
            "wildlifeModal"
        )
        .classList.remove("hidden");

}


function openProjectModal() {

    document
        .getElementById(
            "projectModal"
        )
        .classList.remove("hidden");

}


function closeModal(id) {

    document
        .getElementById(id)
        .classList.add("hidden");

}


// ==========================================
// FORM SETUP
// ==========================================

function setupForms() {


    // LOGIN

    document
        .getElementById(
            "loginForm"
        )
        .addEventListener(
            "submit",
            event => {

                event.preventDefault();


                login(

                    document.getElementById(
                        "loginEmail"
                    ).value,


                    document.getElementById(
                        "loginPassword"
                    ).value

                );

            }
        );


    // REGISTER

    document
        .getElementById(
            "registerForm"
        )
        .addEventListener(
            "submit",
            event => {

                event.preventDefault();


                register(

                    document.getElementById(
                        "registerName"
                    ).value,


                    document.getElementById(
                        "registerEmail"
                    ).value,


                    document.getElementById(
                        "registerPassword"
                    ).value,


                    document.getElementById(
                        "registerPhone"
                    ).value

                );

            }
        );


    // CONFLICT

    document
        .getElementById(
            "conflictForm"
        )
        .addEventListener(
            "submit",
            createConflict
        );


    // WILDLIFE

    document
        .getElementById(
            "wildlifeForm"
        )
        .addEventListener(
            "submit",
            createWildlife
        );


    // RESTORATION

    document
        .getElementById(
            "projectForm"
        )
        .addEventListener(
            "submit",
            createProject
        );

}


// ==========================================
// HTML ESCAPING
// ==========================================

function escapeHTML(
    value
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value || "";


    return div.innerHTML;

}