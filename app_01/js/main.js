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
            facilitiesData = facilitiesResponse.data.filter(facility => facility.submittedBy === "WASH Registry");
            console.log("DPI data loaded successfully:", facilitiesData);
            console.log("Filtered to WASH Registry data only. Total records:", facilitiesData.length);

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

            // Create details row
            const detailsRow = $(`
                <tr class="school-details" id="school-${index + 1}-details" style="display: none;">
                    <td colspan="5">
                        <div class="school-details-content">
                            <div class="detail-section">
                                <h4><i class="fas fa-tint"></i> Primary WASH Data</h4>
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
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div class="detail-section">
                                <h4><i class="fas fa-database"></i> External Data</h4>
                                <div id="button-section-${index}" class="button-section">
                                    <button class="get-data-btn" data-school-id="${index}">
                                        <i class="fas fa-download"></i> GET Data from WASH Registry
                                    </button>
                                </div>
                                <div id="loading-${index}" class="loading-section" style="display: none; text-align: center; padding: 20px;">
                                    <div class="loading-spinner">
                                        <i class="fas fa-spinner fa-spin"></i>
                                        <p>Fetching data from WASH Registry...</p>
                                    </div>
                                </div>
                                <div id="table-section-${index}" class="external-data-table" style="display: none;">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>WASH Asset</th>
                                                <th>UID</th>
                                                <th>Functionality</th>
                                                <th>JMP Status</th>
                                                <th>Last Service</th>
                                            </tr>
                                        </thead>
                                        <tbody id="facilities-${index}">
                                        </tbody>
                                    </table>
                                    <p class="registry-source" id="source-info-${index}"><small><i class="fas fa-info-circle"></i> Source: Liberia WASH Registry - Last synchronized: 2024-09-18</small></p>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `);

            tbody.append(schoolRow);
            tbody.append(detailsRow);

            // Load facilities for this school
            loadSchoolFacilities(school, index);
        });
    }

    function loadSchoolFacilities(school, schoolIndex) {
        console.log(
            `Preparing facilities section for school: ${school.name}, index: ${schoolIndex}`,
        );

        // Initially hide the table section - data will be loaded when button is clicked
        $(`#table-section-${schoolIndex}`).hide();

        if (!school.facilities || school.facilities.length === 0) {
            // Hide the GET Data button if no facilities are available
            $(`#button-section-${schoolIndex}`).hide();
        }
    }

    async function fetchSchoolFacilitiesData(school, schoolIndex) {
        console.log(`Fetching facilities data for school: ${school.name}`);

        const buttonSection = $(`#button-section-${schoolIndex}`);
        const loadingSection = $(`#loading-${schoolIndex}`);
        const tableSection = $(`#table-section-${schoolIndex}`);
        const facilitiesTable = $(`#facilities-${schoolIndex}`);

        // Show loading state
        buttonSection.hide();
        loadingSection.show();

        // Simulate 2-second delay for external data fetching
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Load facilities data if not already loaded
        if (facilitiesData.length === 0) {
            await loadFacilitiesData();
        }

        // Hide loading state
        loadingSection.hide();

        // Populate facilities table
        facilitiesTable.empty();

        if (!school.facilities || school.facilities.length === 0) {
            facilitiesTable.append(
                '<tr><td colspan="5" style="text-align: center; padding: 10px;">No facilities recorded for this school</td></tr>',
            );
        } else {
            school.facilities.forEach((facilityId) => {
                const facility = facilitiesData.find((f) => f.id === facilityId);
                if (facility) {
                    console.log(
                        `Found facility: ${facility.name} (${facility.id})`,
                    );
                    const facilityRow = $(`
                        <tr>
                            <td>${facility.name}</td>
                            <td>${facility.id}</td>
                            <td><span class="status-badge ${facility.functionality === "Functioning" ? "active" : "pending"}">${facility.functionality}</span></td>
                            <td>${facility.jmpStatus}</td>
                            <td>${facility.lastService}</td>
                        </tr>
                    `);
                    facilitiesTable.append(facilityRow);
                } else {
                    console.log(`Facility not found for ID: ${facilityId}`);
                }
            });
        }

        // Show table section and mark as loaded
        tableSection.show();
        loadedSchools.add(schoolIndex);

        // Update summary after loading data
        updateWASHSummary();

        console.log(`Facilities data loaded for school: ${school.name}`);
    }

    function updateWASHSummary() {
        const totalSchools = schoolsData.length;
        const functionalAssets = facilitiesData.length > 0 ? facilitiesData.filter(
            (f) => f.functionality === "Functioning",
        ).length : 0;
        const schoolsWithWater = schoolsData.filter(
            (s) =>
                s.washData.studentsWithWaterAccess / s.washData.totalStudents >
                0.5,
        ).length;
        const nonFunctionalAssets = facilitiesData.length > 0 ? facilitiesData.filter(
            (f) => f.functionality !== "Functioning",
        ).length : 0;

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
                    value = functionalAssets > 0 ? functionalAssets : "Click 'GET Data' to load";
                    break;
                case "Assets Needing Repair:":
                    value = nonFunctionalAssets > 0 ? nonFunctionalAssets : "Click 'GET Data' to load";
                    break;
                case "Last Registry Sync:":
                    value = facilitiesData.length > 0 ? "2024-09-18" : "Not synced";
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

    // GET Data button click handler
    $(document).on("click", ".get-data-btn", function (e) {
        e.stopPropagation();
        const schoolIndex = $(this).data("school-id");
        const school = schoolsData[schoolIndex];

        if (school && !loadedSchools.has(schoolIndex)) {
            fetchSchoolFacilitiesData(school, schoolIndex);
        }
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
