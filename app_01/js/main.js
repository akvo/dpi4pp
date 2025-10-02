$(document).ready(function () {
    // Load school and facility data
    let schoolsData = [];
    let facilitiesData = [];
    let loadedSchools = new Set(); // Track schools that have loaded their facilities

    async function loadSchoolsData() {
        try {
            console.log("Attempting to load schools data with Axios...");

            // Try to load schools data
            const schoolsResponse = await axios.get("../api/schools.json");
            schoolsData = schoolsResponse.data.schools;
            console.log("Schools data loaded successfully:", schoolsData);

            // Render table with loaded data
            renderSchoolsTable();
            updateWASHSummary();
        } catch (error) {
            console.log(
                "Failed to load JSON files (this is normal for local development):",
                error.message,
            );
            console.log("Using embedded fallback data...");
        } finally {
            console.log("Schools data loading process completed");
        }
    }

    async function loadFacilitiesData() {
        try {
            console.log("Attempting to load DPI data from WASH Registry...");

            // Try to load DPI data
            const facilitiesResponse = await axios.get("../api/dpi.json");
            facilitiesData = facilitiesResponse.data.filter(
                (facility) => facility.submittedBy === "WASH Registry",
            );
            console.log("DPI data loaded successfully:", facilitiesData);
            console.log(
                "Filtered to WASH Registry data only. Total records:",
                facilitiesData.length,
            );

            return facilitiesData;
        } catch (error) {
            console.log("Failed to load DPI data:", error.message);
            return [];
        }
    }

    function renderSchoolsTable() {
        console.log("Rendering schools table with data:", schoolsData);

        const tbody = $("#schools-table tbody");
        tbody.empty();

        if (!schoolsData || schoolsData.length === 0) {
            tbody.append(
                '<tr><td colspan="5" style="text-align: center; padding: 20px;">No school data available</td></tr>',
            );
            return;
        }

        schoolsData.forEach((school, index) => {
            // Create school row
            const schoolRow = $(`
                <tr class="school-row" data-school-id="${index + 1}">
                    <td><button class="expand-btn"><i class="fas fa-chevron-right"></i></button></td>
                    <td>${school.name}</td>
                    <td><span class="school-type-badge ${school.type.toLowerCase()}">${school.type}</span></td>
                    <td>${school.province}</td>
                    <td>${school.lastUpdated}</td>
                </tr>
            `);

            // Create facility rows for WASH Data section
            let facilityRows = "";
            if (school.facilities && school.facilities.length > 0) {
                school.facilities.forEach((facility, fIndex) => {
                    facilityRows += `
                        <tr class="facility-row" data-facility-index="${fIndex}" data-school-index="${index}">
                            <td>${facility.name} <span class="facility-id-badge">${facility.id}</span></td>
                            <td>
                                <button class="facility-expand-btn" data-facility-id="${facility.id}" data-school-index="${index}" data-facility-index="${fIndex}">
                                    <i class="fas fa-download"></i> Get Additional Data from WASH Registry
                                </button>
                            </td>
                        </tr>
                        <tr class="facility-details" id="facility-${index}-${fIndex}-details" style="display: none;">
                            <td colspan="2">
                                <div class="facility-loading" id="facility-loading-${index}-${fIndex}" style="text-align: center; padding: 10px;">
                                    <i class="fas fa-spinner fa-spin"></i> Loading facility data...
                                </div>
                                <div class="facility-data-table" id="facility-data-${index}-${fIndex}" style="display: none;">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Indicator</th>
                                                <th>Value</th>
                                            </tr>
                                        </thead>
                                        <tbody id="facility-tbody-${index}-${fIndex}">
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }

            // Create details row
            const detailsRow = $(`
                <tr class="school-details" id="school-${index + 1}-details" style="display: none;">
                    <td colspan="5">
                        <div class="school-details-content">
                            <div class="detail-section">
                                <h4><i class="fas fa-tint"></i> School Data</h4>
                                <div class="primary-data-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Indicator</th>
                                                <th>Value</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>Students with Access to Water</td>
                                                <td>${school.washData.studentsWithWaterAccess} / ${school.washData.totalStudents} (${Math.round((school.washData.studentsWithWaterAccess / school.washData.totalStudents) * 100)}%)</td>
                                            </tr>
                                            <tr>
                                                <td>Functional Toilets</td>
                                                <td>${school.washData.functionalToilets} / ${school.washData.totalToilets}</td>
                                            </tr>
                                            <tr>
                                                <td>Handwashing Stations</td>
                                                <td>${school.washData.handwashingStations}</td>
                                            </tr>
                                            <tr>
                                                <td>Water Storage Capacity</td>
                                                <td>${school.washData.waterStorageCapacity} ${school.washData.storageUnit}</td>
                                            </tr>
                                            ${facilityRows}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `);

            tbody.append(schoolRow);
            tbody.append(detailsRow);
        });
    }

    async function loadFacilityDetails(facilityId, schoolIndex, facilityIndex) {
        console.log(`Loading facility details for: ${facilityId}`);

        const loadingDiv = $(
            `#facility-loading-${schoolIndex}-${facilityIndex}`,
        );
        const dataDiv = $(`#facility-data-${schoolIndex}-${facilityIndex}`);
        const tbody = $(`#facility-tbody-${schoolIndex}-${facilityIndex}`);

        // Show loading state
        loadingDiv.show();
        dataDiv.hide();

        // Simulate delay for fetching
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Load facilities data if not already loaded
        if (facilitiesData.length === 0) {
            await loadFacilitiesData();
        }

        // Find the facility data
        const facility = facilitiesData.find((f) => f.id === facilityId);

        if (facility) {
            tbody.empty();

            // Add facility details as rows
            const details = [
                { indicator: "Type", value: facility.type || "N/A" },
                { indicator: "Location", value: facility.location || "N/A" },
                {
                    indicator: "Functionality",
                    value: `<span class="status-badge ${facility.functionality === "Functioning" ? "active" : "pending"}">${facility.functionality}</span>`,
                },
                { indicator: "JMP Status", value: facility.jmpStatus || "N/A" },
                {
                    indicator: "Last Service",
                    value: facility.lastService || "N/A",
                },
                {
                    indicator: "Next Service",
                    value: facility.nextService || "N/A",
                },
            ];

            // Add specific details based on facility type
            if (facility.type === "Borehole") {
                details.push(
                    { indicator: "Depth", value: facility.depth || "N/A" },
                    {
                        indicator: "Pump Type",
                        value: facility.pumpType || "N/A",
                    },
                    {
                        indicator: "Flow Rate",
                        value: facility.flowRate || "N/A",
                    },
                );
                if (facility.waterQuality) {
                    details.push(
                        {
                            indicator: "Water pH",
                            value: facility.waterQuality.pH || "N/A",
                        },
                        {
                            indicator: "Turbidity",
                            value: facility.waterQuality.turbidity || "N/A",
                        },
                        {
                            indicator: "Water Safe",
                            value: facility.waterQuality.safe ? "Yes" : "No",
                        },
                    );
                }
            } else if (facility.type === "Hand Pump") {
                details.push(
                    {
                        indicator: "Pump Model",
                        value: facility.pumpModel || "N/A",
                    },
                    {
                        indicator: "Installation Year",
                        value: facility.installationYear || "N/A",
                    },
                    {
                        indicator: "Spare Parts Available",
                        value: facility.sparePartsAvailable ? "Yes" : "No",
                    },
                );
            } else if (facility.type === "Storage Tank") {
                details.push(
                    {
                        indicator: "Capacity",
                        value: facility.capacity || "N/A",
                    },
                    {
                        indicator: "Material",
                        value: facility.material || "N/A",
                    },
                    {
                        indicator: "Installation Year",
                        value: facility.installationYear || "N/A",
                    },
                );
            } else if (facility.type === "Solar Pump") {
                details.push(
                    {
                        indicator: "Panel Capacity",
                        value: facility.panelCapacity || "N/A",
                    },
                    {
                        indicator: "Battery Backup",
                        value: facility.batteryBackup ? "Yes" : "No",
                    },
                    {
                        indicator: "Flow Rate",
                        value: facility.flowRate || "N/A",
                    },
                );
            } else if (facility.type === "Rainwater System") {
                details.push(
                    {
                        indicator: "Roof Area",
                        value: facility.roofArea || "N/A",
                    },
                    {
                        indicator: "Tank Capacity",
                        value: facility.tankCapacity || "N/A",
                    },
                    {
                        indicator: "First Flush",
                        value: facility.firstFlush ? "Yes" : "No",
                    },
                    {
                        indicator: "Filtration",
                        value: facility.filtration ? "Yes" : "No",
                    },
                );
            } else if (facility.type === "Dug Well") {
                details.push(
                    { indicator: "Depth", value: facility.depth || "N/A" },
                    { indicator: "Lining", value: facility.lining || "N/A" },
                    { indicator: "Cover", value: facility.cover || "N/A" },
                );
            }

            // Add contractor/technician info if available
            if (facility.contractor) {
                details.push({
                    indicator: "Contractor",
                    value: facility.contractor,
                });
            }
            if (facility.technician) {
                details.push({
                    indicator: "Technician",
                    value: facility.technician,
                });
            }
            if (facility.submittedBy) {
                details.push({
                    indicator: "Data Source",
                    value: facility.submittedBy,
                });
            }

            // Render the details
            details.forEach((detail) => {
                tbody.append(`
                    <tr>
                        <td>${detail.indicator}</td>
                        <td>${detail.value}</td>
                    </tr>
                `);
            });
        } else {
            tbody.html(
                '<tr><td colspan="2" style="text-align: center;">Facility data not found</td></tr>',
            );
        }

        // Hide loading and show data
        loadingDiv.hide();
        dataDiv.show();
    }

    // Handler for facility expand button
    $(document).on("click", ".facility-expand-btn", async function (e) {
        e.stopPropagation();

        const $btn = $(this);
        const facilityId = $btn.data("facility-id");
        const schoolIndex = $btn.data("school-index");
        const facilityIndex = $btn.data("facility-index");
        const $detailsRow = $(
            `#facility-${schoolIndex}-${facilityIndex}-details`,
        );

        if ($detailsRow.is(":visible")) {
            // Collapse
            $detailsRow.slideUp(200);
            $btn.html(
                '<i class="fas fa-download"></i> Get Additional Data from WASH Registry',
            );
        } else {
            // Expand and load data
            $detailsRow.slideDown(200);
            $btn.html('<i class="fas fa-chevron-up"></i> Hide Additional Data');

            // Load facility details if not already loaded
            if (!$detailsRow.data("loaded")) {
                await loadFacilityDetails(
                    facilityId,
                    schoolIndex,
                    facilityIndex,
                );
                $detailsRow.data("loaded", true);
            }
        }
    });

    function updateWASHSummary() {
        const totalSchools = schoolsData.length;
        const functionalAssets =
            facilitiesData.length > 0
                ? facilitiesData.filter(
                      (f) => f.functionality === "Functioning",
                  ).length
                : 0;
        const schoolsWithWater = schoolsData.filter(
            (s) =>
                s.washData.studentsWithWaterAccess / s.washData.totalStudents >
                0.5,
        ).length;
        const nonFunctionalAssets =
            facilitiesData.length > 0
                ? facilitiesData.filter(
                      (f) => f.functionality !== "Functioning",
                  ).length
                : 0;

        // Update summary stats (this would update the quick-stats section)
        $(".quick-stat").each(function () {
            const label = $(this).find(".stat-label").text();
            let value = "";

            switch (label) {
                case "Total Schools:":
                    value = totalSchools;
                    break;
                case "Schools with Water Access:":
                    value = `${schoolsWithWater} (${Math.round((schoolsWithWater / totalSchools) * 100)}%)`;
                    break;
                case "Functional WASH Assets:":
                    value =
                        functionalAssets > 0
                            ? functionalAssets
                            : "Click 'GET Data' to load";
                    break;
                case "Assets Needing Repair:":
                    value =
                        nonFunctionalAssets > 0
                            ? nonFunctionalAssets
                            : "Click 'GET Data' to load";
                    break;
                case "Last Registry Sync:":
                    value =
                        facilitiesData.length > 0 ? "2024-09-18" : "Not synced";
                    break;
            }

            if (value) {
                $(this).find(".stat-value").text(value);
            }
        });
    }

    // Navigation functionality
    $(".nav-item").on("click", function (e) {
        e.preventDefault();

        // Remove active class from all nav items
        $(".nav-item").removeClass("active");
        $(this).addClass("active");

        // Hide all pages
        $(".page").removeClass("active");

        // Show selected page
        const pageName = $(this).data("page");
        $(`#${pageName}-page`).addClass("active");
    });

    // Search functionality
    $(".search-btn").on("click", function () {
        const searchTerm = $(".search-bar input").val().trim();
        if (searchTerm) {
            alert(`Searching for: ${searchTerm}`);
            // Implement actual search functionality here
        }
    });

    // Search on Enter key
    $(".search-bar input").on("keypress", function (e) {
        if (e.which === 13) {
            $(".search-btn").click();
        }
    });

    // Notification button
    $(".notification-btn").on("click", function () {
        alert("You have 3 new notifications");
        // Implement notification panel here
    });

    // User button
    $(".user-btn").on("click", function () {
        alert("User profile menu");
        // Implement user dropdown menu here
    });

    // Animate stat numbers on page load
    function animateStatNumbers() {
        $(".stat-number").each(function () {
            const $this = $(this);
            const target = parseInt($this.data("target"));
            const increment = target / 50; // Animation duration
            let current = 0;

            const timer = setInterval(function () {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                $this.text(Math.floor(current));
            }, 30);
        });
    }

    // Animate stat cards on hover
    $(".stat-card").hover(
        function () {
            $(this).addClass("hovered");
        },
        function () {
            $(this).removeClass("hovered");
        },
    );

    // Chart placeholder interactions
    $(".chart-placeholder").on("click", function () {
        $(this).html("<p>📊 Loading chart data...</p>");
        // Simulate chart loading
        setTimeout(() => {
            $(this).html("<p>📊 Chart would be rendered here</p>");
        }, 1000);
    });

    // Order/Activity item interactions
    $(".order-item").on("click", function () {
        const orderId = $(this).find(".order-id").text();
        alert(`Activity details for ${orderId}`);
        // Implement activity detail view here
    });

    // Map button interactions
    $(".map-btn").on("click", function () {
        $(".map-btn").removeClass("active");
        $(this).addClass("active");
        const mapType = $(this).text();
        $(".chart-placeholder p:first").html(`🗺️ Loading ${mapType}...`);

        // Simulate map loading
        setTimeout(() => {
            $(".chart-placeholder p:first").html(`🗺️ ${mapType} View`);
        }, 1000);
    });

    // Database button interactions
    $(".db-btn").on("click", function () {
        $(".db-btn").removeClass("active");
        $(this).addClass("active");
        const dbType = $(this).text();
        alert(`Loading ${dbType} data...`);
        // Implement database view switching here
    });

    // Function to toggle school details
    function toggleSchoolDetails($schoolRow) {
        const schoolId = $schoolRow.data("school-id");
        const $detailsRow = $(`#school-${schoolId}-details`);
        const $icon = $schoolRow.find(".expand-btn i");

        console.log(`Toggle expand for school ID: ${schoolId}`);

        // Toggle details row
        if ($detailsRow.is(":visible")) {
            $detailsRow.slideUp(300);
            $icon.removeClass("fa-chevron-down").addClass("fa-chevron-right");
            console.log("Collapsing school details");
        } else {
            // Close all other expanded rows
            $(".school-details").slideUp(300);
            $(".expand-btn i")
                .removeClass("fa-chevron-down")
                .addClass("fa-chevron-right");

            // Open this row
            $detailsRow.slideDown(300);
            $icon.removeClass("fa-chevron-right").addClass("fa-chevron-down");
            console.log("Expanding school details");
        }
    }

    // Expandable school rows functionality - using event delegation for dynamically created elements
    $(document).on("click", ".school-row", function (e) {
        // Don't trigger if clicking on the expand button itself (handled separately)
        if (!$(e.target).closest(".expand-btn").length) {
            toggleSchoolDetails($(this));
        }
    });

    // Expand button click handler
    $(document).on("click", ".expand-btn", function (e) {
        e.stopPropagation();
        toggleSchoolDetails($(this).closest(".school-row"));
    });

    // Database table row interactions (for non-expandable rows)
    $(".db-table tbody tr")
        .not(".school-row")
        .on("click", function () {
            const schoolName = $(this).find("td:first").text();
            if (schoolName && !schoolName.includes("button")) {
                alert(`School details for ${schoolName}`);
                // Implement school detail view here
            }
        });

    // Load data on page initialization
    console.log("=== App 01 Dashboard Initializing ===");

    // Load only schools data initially - facilities data will be loaded on demand
    loadSchoolsData()
        .then(() => {
            console.log("Schools data loading completed");
        })
        .catch((error) => {
            console.error("Schools data loading failed:", error);
        });

    console.log("App 01 Dashboard initialized");
});
