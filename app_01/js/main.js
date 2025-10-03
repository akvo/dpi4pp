$(document).ready(function () {
    // Load school and facility data
    let schoolsData = [];
    let facilitiesData = [];
    let indicatorsData = {}; // Store indicators mapping
    let loadedSchools = new Set(); // Track schools that have loaded their facilities
    let enrollmentChart = null; // Store chart instance
    let schoolMap = null; // Store map instance
    let schoolMarkers = []; // Store school markers
    let currentFilter = 'all'; // Current map filter

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

            // Initialize map if on maps page
            if ($('#maps-page').hasClass('active')) {
                setTimeout(() => {
                    initializeSchoolMap();
                }, 100);
            }
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

    async function loadIndicatorsData() {
        try {
            console.log("Attempting to load indicators mapping...");

            const indicatorsResponse = await axios.get("../api/indicators.json");
            indicatorsData = indicatorsResponse.data;
            console.log("Indicators data loaded successfully:", indicatorsData);

            return indicatorsData;
        } catch (error) {
            console.log("Failed to load indicators data:", error.message);
            return {};
        }
    }

    // Helper function to get source for an indicator
    function getIndicatorSource(facilityType, indicatorKey, subKey = null) {
        if (!indicatorsData[facilityType]) {
            return "Unknown";
        }

        const typeMapping = indicatorsData[facilityType];

        // Handle nested indicators (e.g., waterQuality.pH)
        if (subKey && typeMapping[indicatorKey] && typeMapping[indicatorKey].subIndicators) {
            const subIndicator = typeMapping[indicatorKey].subIndicators[subKey];
            return subIndicator ? subIndicator.source : "Unknown";
        }

        // Handle direct indicators
        const indicator = typeMapping[indicatorKey];
        return indicator ? indicator.source : "Unknown";
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
                                                <th>Source</th>
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
                                <h4>School Data</h4>
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
                { indicator: "Type", value: facility.type || "N/A", key: "type" },
                { indicator: "Location", value: facility.location || "N/A", key: "location" },
                {
                    indicator: "Functionality",
                    value: `<span class="status-badge ${facility.functionality === "Functioning" ? "active" : "pending"}">${facility.functionality}</span>`,
                    key: "functionality"
                },
                { indicator: "JMP Status", value: facility.jmpStatus || "N/A", key: "jmpStatus" },
                {
                    indicator: "Last Service",
                    value: facility.lastService || "N/A",
                    key: "lastService"
                },
                {
                    indicator: "Next Service",
                    value: facility.nextService || "N/A",
                    key: "nextService"
                },
            ];

            // Add specific details based on facility type
            if (facility.type === "Borehole") {
                details.push(
                    { indicator: "Depth", value: facility.depth || "N/A", key: "depth" },
                    {
                        indicator: "Pump Type",
                        value: facility.pumpType || "N/A",
                        key: "pumpType"
                    },
                    {
                        indicator: "Flow Rate",
                        value: facility.flowRate || "N/A",
                        key: "flowRate"
                    },
                );
                if (facility.waterQuality) {
                    details.push(
                        {
                            indicator: "Water pH",
                            value: facility.waterQuality.pH || "N/A",
                            key: "waterQuality",
                            subKey: "pH"
                        },
                        {
                            indicator: "Turbidity",
                            value: facility.waterQuality.turbidity || "N/A",
                            key: "waterQuality",
                            subKey: "turbidity"
                        },
                        {
                            indicator: "Water Safe",
                            value: facility.waterQuality.safe ? "Yes" : "No",
                            key: "waterQuality",
                            subKey: "safe"
                        },
                    );
                }
            } else if (facility.type === "Hand Pump") {
                details.push(
                    {
                        indicator: "Pump Model",
                        value: facility.pumpModel || "N/A",
                        key: "pumpModel"
                    },
                    {
                        indicator: "Installation Year",
                        value: facility.installationYear || "N/A",
                        key: "installationYear"
                    },
                    {
                        indicator: "Spare Parts Available",
                        value: facility.sparePartsAvailable ? "Yes" : "No",
                        key: "sparePartsAvailable"
                    },
                );
            } else if (facility.type === "Storage Tank") {
                details.push(
                    {
                        indicator: "Capacity",
                        value: facility.capacity || "N/A",
                        key: "capacity"
                    },
                    {
                        indicator: "Material",
                        value: facility.material || "N/A",
                        key: "material"
                    },
                    {
                        indicator: "Installation Year",
                        value: facility.installationYear || "N/A",
                        key: "installationYear"
                    },
                );
            } else if (facility.type === "Solar Pump") {
                details.push(
                    {
                        indicator: "Panel Capacity",
                        value: facility.panelCapacity || "N/A",
                        key: "panelCapacity"
                    },
                    {
                        indicator: "Battery Backup",
                        value: facility.batteryBackup ? "Yes" : "No",
                        key: "batteryBackup"
                    },
                    {
                        indicator: "Flow Rate",
                        value: facility.flowRate || "N/A",
                        key: "flowRate"
                    },
                );
            } else if (facility.type === "Rainwater System") {
                details.push(
                    {
                        indicator: "Roof Area",
                        value: facility.roofArea || "N/A",
                        key: "roofArea"
                    },
                    {
                        indicator: "Tank Capacity",
                        value: facility.tankCapacity || "N/A",
                        key: "tankCapacity"
                    },
                    {
                        indicator: "First Flush",
                        value: facility.firstFlush ? "Yes" : "No",
                        key: "firstFlush"
                    },
                    {
                        indicator: "Filtration",
                        value: facility.filtration ? "Yes" : "No",
                        key: "filtration"
                    },
                );
            } else if (facility.type === "Dug Well") {
                details.push(
                    { indicator: "Depth", value: facility.depth || "N/A", key: "depth" },
                    { indicator: "Lining", value: facility.lining || "N/A", key: "lining" },
                    { indicator: "Cover", value: facility.cover || "N/A", key: "cover" },
                );
            }

            // Add contractor/technician info if available
            if (facility.contractor) {
                details.push({
                    indicator: "Contractor",
                    value: facility.contractor,
                    key: "contractor"
                });
            }
            if (facility.technician) {
                details.push({
                    indicator: "Technician",
                    value: facility.technician,
                    key: "technician"
                });
            }
            if (facility.submittedBy) {
                details.push({
                    indicator: "Data Source",
                    value: facility.submittedBy,
                    key: "submittedBy"
                });
            }

            // Render the details
            details.forEach((detail) => {
                const source = getIndicatorSource(facility.type, detail.key, detail.subKey);
                tbody.append(`
                    <tr>
                        <td>${detail.indicator}</td>
                        <td>${detail.value}</td>
                        <td>${source}</td>
                    </tr>
                `);
            });
        } else {
            tbody.html(
                '<tr><td colspan="3" style="text-align: center;">Facility data not found</td></tr>',
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

        // Initialize components based on page
        if (pageName === 'dashboard') {
            setTimeout(() => {
                initializeEnrollmentChart();
            }, 100);
        } else if (pageName === 'maps') {
            setTimeout(() => {
                initializeSchoolMap();
            }, 100);
        }
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

    // Dashboard Chart Initialization
    function initializeEnrollmentChart() {
        const ctx = document.getElementById('enrollmentChart');
        if (!ctx) return;

        // Sample enrollment data
        const enrollmentData = {
            labels: ['10am', '11am', '12am', '01am', '02am', '03am', '04am', '05am', '06am', '07am'],
            datasets: [{
                label: 'Student Enrollment',
                data: [60, 52, 62, 58, 45, 40, 58, 68, 52, 65],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        };

        const config = {
            type: 'line',
            data: enrollmentData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#3b82f6',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `Students: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                size: 12
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: '#f1f5f9',
                            borderDash: [5, 5]
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                size: 12
                            },
                            callback: function(value) {
                                return value;
                            }
                        },
                        min: 0,
                        max: 100
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    point: {
                        hoverBackgroundColor: '#1d4ed8'
                    }
                }
            }
        };

        // Destroy existing chart if it exists
        if (enrollmentChart) {
            enrollmentChart.destroy();
        }

        enrollmentChart = new Chart(ctx, config);
    }

    // Initialize dashboard when dashboard page is active
    function initializeDashboard() {
        if ($('#dashboard-page').hasClass('active')) {
            // Initialize chart after a short delay to ensure DOM is ready
            setTimeout(() => {
                initializeEnrollmentChart();
            }, 100);
        }
    }

    // Maps functionality
    function initializeSchoolMap() {
        if (!document.getElementById('school-map')) return;

        // Initialize map centered on Liberia
        schoolMap = L.map('school-map').setView([6.4281, -9.4295], 7);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(schoolMap);

        // Load and display school markers
        if (schoolsData.length > 0) {
            displaySchoolMarkers();
        }
    }

    function displaySchoolMarkers() {
        // Clear existing markers
        schoolMarkers.forEach(marker => schoolMap.removeLayer(marker));
        schoolMarkers = [];

        // Filter schools based on current filter
        let filteredSchools = schoolsData;
        if (currentFilter !== 'all') {
            if (currentFilter === 'Primary' || currentFilter === 'Secondary') {
                filteredSchools = schoolsData.filter(school => school.type === currentFilter);
            }
        }

        // Add markers for each school
        filteredSchools.forEach(school => {
            const marker = createSchoolMarker(school);
            if (marker) {
                marker.addTo(schoolMap);
                schoolMarkers.push(marker);
            }
        });

        // Update visible schools count
        $('#visible-schools').text(filteredSchools.length);
    }

    function createSchoolMarker(school) {
        if (!school.coordinates) return null;

        // Determine marker color based on school type and WASH status
        let markerColor = '#3b82f6'; // Default blue
        if (school.type === 'Primary') {
            markerColor = '#10b981'; // Green
        } else if (school.type === 'Secondary') {
            markerColor = '#f59e0b'; // Orange
        }

        // Check WASH status
        const washFunctional = school.washData ?
            (school.washData.studentsWithWaterAccess / school.washData.totalStudents) > 0.7 : true;

        if (!washFunctional) {
            markerColor = '#ef4444'; // Red for needs repair
        }

        // Create custom icon
        const icon = L.divIcon({
            className: 'custom-school-marker',
            html: `<div style="
                width: 20px;
                height: 20px;
                background: ${markerColor};
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 10px;
                font-weight: bold;
            ">
                <i class="fas fa-school" style="font-size: 8px;"></i>
            </div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            popupAnchor: [0, -10]
        });

        // Create marker
        const marker = L.marker([school.coordinates.latitude, school.coordinates.longitude], { icon });

        // Create popup content
        const washPercentage = school.washData ?
            Math.round((school.washData.studentsWithWaterAccess / school.washData.totalStudents) * 100) : 0;

        const facilitiesCount = school.facilities ? school.facilities.length : 0;

        const popupContent = `
            <div style="font-family: 'Inter', sans-serif; min-width: 200px;">
                <h4 style="margin: 0 0 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
                    ${school.name}
                </h4>
                <div style="margin-bottom: 8px;">
                    <span style="display: inline-block; padding: 2px 8px; background: ${school.type === 'Primary' ? '#dcfce7' : '#fef3c7'}; color: ${school.type === 'Primary' ? '#166534' : '#92400e'}; border-radius: 12px; font-size: 11px; font-weight: 600;">
                        ${school.type}
                    </span>
                </div>
                <p style="margin: 4px 0; font-size: 13px; color: #64748b;">
                    <i class="fas fa-map-marker-alt"></i> ${school.province}
                </p>
                <p style="margin: 4px 0; font-size: 13px; color: #64748b;">
                    <i class="fas fa-users"></i> ${school.washData ? school.washData.totalStudents : 'N/A'} Students
                </p>
                <p style="margin: 4px 0; font-size: 13px; color: #64748b;">
                    <i class="fas fa-tint"></i> ${washPercentage}% Water Access
                </p>
                <p style="margin: 4px 0; font-size: 13px; color: #64748b;">
                    <i class="fas fa-wrench"></i> ${facilitiesCount} WASH Facilities
                </p>
                <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">
                    Last updated: ${school.lastUpdated}
                </p>
            </div>
        `;

        marker.bindPopup(popupContent);
        return marker;
    }

    // Map filter functionality
    $(document).on('click', '.map-btn', function() {
        $('.map-btn').removeClass('active');
        $(this).addClass('active');

        currentFilter = $(this).data('filter');

        if (schoolMap && schoolsData.length > 0) {
            displaySchoolMarkers();
        }
    });

    // Load data on page initialization
    console.log("=== App 01 Dashboard Initializing ===");

    // Initialize dashboard
    initializeDashboard();

    // Load schools data and indicators mapping
    Promise.all([
        loadSchoolsData(),
        loadIndicatorsData()
    ])
        .then(() => {
            console.log("Schools data and indicators loading completed");
        })
        .catch((error) => {
            console.error("Data loading failed:", error);
        });

    console.log("App 01 Dashboard initialized");
});
