$(document).ready(function () {
    // Wait for all libraries to be loaded
    setTimeout(function() {
        // Global variables
    let map = null;
    let geojsonData = null;
    let counties = [];
    let wards = [];
    let currentFilters = {
        period: "all",
        county: "all",
        asset: "all",
        status: "all",
        source: "all",
    };
    let currentPage = 1;
    const rowsPerPage = 5;
    let allWardData = [];

    // Check if libraries are loaded before initializing
    function checkLibrariesAndInit() {
        if (typeof L === 'undefined' || typeof topojson === 'undefined' || typeof Chart === 'undefined') {
            console.log('Waiting for libraries...', { L: typeof L, topojson: typeof topojson, Chart: typeof Chart });
            setTimeout(checkLibrariesAndInit, 100);
        } else {
            console.log('All libraries loaded, initializing...');
            initializeApp();
        }
    }

    checkLibrariesAndInit();

    async function initializeApp() {
        console.log("=== WASH Registry Liberia Dashboard Initializing ===");
        console.log("Libraries available:", typeof L, typeof topojson, typeof Chart, typeof $);

        try {
            // Load saved filter state
            loadFilterState();

            // Load map data
            await loadMapData();

            // Initialize map
            initializeMap();

            // Populate filters
            populateFilters();

            // Initialize UI components
            initializeTable();
            initializeBarChart();

            // Set up event handlers
            setupEventHandlers();

            // Apply initial filters
            applyFilters();

            console.log("Dashboard initialized successfully");
        } catch (error) {
            console.error("Failed to initialize dashboard:", error);
            showError("Failed to load dashboard data");
        }
    }

    // Load TopoJSON map data
    async function loadMapData() {
        try {
            console.log("Loading Liberia map data...");
            const response = await fetch("../api/source/liberia.json");

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`,
                );
            }

            const topojsonData = await response.json();

            console.log('TopoJSON data structure:', {
                type: topojsonData.type,
                hasObjects: !!topojsonData.objects,
                objectKeys: topojsonData.objects ? Object.keys(topojsonData.objects) : [],
                topojsonLib: typeof topojson
            });

            // Check if topojson is available
            if (typeof topojson === 'undefined') {
                console.error('Available libraries:', typeof L, typeof topojson, typeof $);
                throw new Error('topojson library not loaded');
            }

            // Check if objects exist
            if (!topojsonData.objects) {
                console.error('TopoJSON structure:', Object.keys(topojsonData));
                throw new Error('TopoJSON objects not found');
            }

            // Check if the specific object exists
            const boundaryKey = "liberia-district-boundary";
            if (!topojsonData.objects[boundaryKey]) {
                console.error('Available objects:', Object.keys(topojsonData.objects));
                throw new Error(`TopoJSON object "${boundaryKey}" not found`);
            }

            // Convert TopoJSON to GeoJSON
            geojsonData = topojson.feature(
                topojsonData,
                topojsonData.objects[boundaryKey],
            );

            // Extract counties and districts
            extractCounties();

            console.log(
                `Map data loaded successfully. Found ${counties.length} counties.`,
            );
        } catch (error) {
            console.error("Failed to load map data:", error);
            throw error;
        }
    }

    // Extract counties and districts from GeoJSON
    function extractCounties() {
        const countySet = new Set();

        geojsonData.features.forEach((feature) => {
            // Try to extract county and district using regex patterns
            const properties = feature.properties || {};

            // Common county property names
            const countyPatterns = [
                /county/i,
                /province/i,
                /region/i,
                /state/i,
                /COUNTY_NAME/i,
                /County/i,
                /PROVINCE/i,
            ];

            // Common district property names
            const districtPatterns = [
                /district/i,
                /area/i,
                /zone/i,
                /ward/i,
                /DISTRICT_NAME/i,
                /District/i,
                /AREA/i,
            ];

            let county = null;
            let district = null;

            // Find county
            for (const pattern of countyPatterns) {
                for (const [key, value] of Object.entries(properties)) {
                    if (pattern.test(key) && value) {
                        county = String(value);
                        break;
                    }
                }
                if (county) break;
            }

            // Find district
            for (const pattern of districtPatterns) {
                for (const [key, value] of Object.entries(properties)) {
                    if (pattern.test(key) && value) {
                        district = String(value);
                        break;
                    }
                }
                if (district) break;
            }

            // Fallback: use first available property
            if (!county) {
                const firstProp = Object.values(properties)[0];
                if (firstProp) {
                    county = String(firstProp);
                }
            }

            if (county) {
                countySet.add(county);
                feature.county = county;
                feature.district = district || county;

                // Generate deterministic functionality percentage (25-85%)
                const hash = hashCode(district || county);
                const functionality = 25 + (Math.abs(hash) % 61); // 25-85%
                feature.functionality = functionality;
            }
        });

        counties = Array.from(countySet).sort();

        // Generate ward data
        generateWardData();
    }

    // Generate ward data for table
    function generateWardData() {
        const wardPrefixes = [
            'Central', 'North', 'South', 'East', 'West',
            'River', 'Market', 'School', 'Health', 'Farm',
            'Coastal', 'Mountain', 'City', 'Rural', 'Urban',
            'Port', 'Station', 'Bridge', 'Garden', 'Park',
            'Hill', 'Valley', 'Lake', 'Forest', 'Mines'
        ];

        const wardSuffixes = [
            'District', 'Area', 'Zone', 'Quarter', 'Sector',
            'Division', 'Precinct', 'Territory', 'Region', 'Block'
        ];

        allWardData = [];
        let wardCounter = 1;

        counties.forEach((county, countyIndex) => {
            // Generate 3-6 wards per county
            const numWards = 3 + Math.floor(Math.random() * 4);

            for (let i = 0; i < numWards; i++) {
                const prefix = wardPrefixes[(countyIndex * 7 + i) % wardPrefixes.length];
                const suffix = wardSuffixes[(countyIndex * 3 + i) % wardSuffixes.length];
                const wardName = `${prefix} ${suffix} ${wardCounter}`;
                const hash = hashCode(`${county}-${wardName}`);

                const numAssets = 1 + Math.floor(Math.random() * 15);
                const functionality = 25 + (Math.abs(hash) % 61); // 25-85%
                const population = 500 + Math.floor(Math.random() * 5000);

                allWardData.push({
                    ward: wardName,
                    county: county,
                    assets: numAssets,
                    functional: Math.round((numAssets * functionality) / 100),
                    percentage: functionality,
                    population: population
                });

                wardCounter++;
            }
        });

        // Sort by ward name
        allWardData.sort((a, b) => a.ward.localeCompare(b.ward));
    }

    // Simple hash function for deterministic values
    function hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash;
    }

    // Initialize Leaflet map
    function initializeMap() {
        // Create map
        map = L.map("map", {
            center: [6.5, -9.5], // Center of Liberia
            zoom: 7,
            zoomControl: true,
        });

        // Add tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
            maxZoom: 18,
        }).addTo(map);

        // Create GeoJSON layer with choropleth styling
        const geoJsonLayer = L.geoJSON(geojsonData, {
            style: getFeatureStyle,
            onEachFeature: function (feature, layer) {
                // Add hover effects
                layer.on({
                    mouseover: function (e) {
                        highlightFeature(e);
                        showInfoPanel(feature);
                    },
                    mouseout: function (e) {
                        resetHighlight(e);
                        hideInfoPanel();
                    },
                    click: function (e) {
                        showPopup(feature, e.latlng);
                    },
                });
            },
        }).addTo(map);

        // Fit map to feature bounds
        if (geojsonData.features.length > 0) {
            map.fitBounds(geoJsonLayer.getBounds());
        }

        // Add legend
        addLegend();

        // Fix gray tiles issue - invalidate size after map is fully loaded
        setTimeout(function() {
            map.invalidateSize();
        }, 100);
    }

    // Get styling for GeoJSON features
    function getFeatureStyle(feature) {
        const functionality = feature.functionality || 50;

        // Color scale: dark green (low) -> medium green (medium) -> light green (high)
        let color;
        if (functionality < 40) {
            color = "#0d4f2d"; // Dark green
        } else if (functionality < 70) {
            color = "#2d8659"; // Medium green
        } else {
            color = "#5cb85c"; // Light green
        }

        return {
            fillColor: color,
            weight: 1,
            opacity: 0.8,
            color: "#404040",
            fillOpacity: 0.7,
        };
    }

    // Highlight feature on hover
    function highlightFeature(e) {
        const layer = e.target;
        layer.setStyle({
            weight: 3,
            opacity: 1,
            color: "#00a8ff",
            fillOpacity: 0.9,
        });
    }

    // Reset feature highlight
    function resetHighlight(e) {
        const layer = e.target;
        layer.setStyle(getFeatureStyle(layer.feature));
    }

    // Show info panel on hover
    function showInfoPanel(feature) {
        // You could implement a floating info panel here
        // For now, we'll just update cursor
        document.getElementById("map").style.cursor = "pointer";
    }

    // Hide info panel
    function hideInfoPanel() {
        document.getElementById("map").style.cursor = "default";
    }

    // Show popup on click
    function showPopup(feature, latlng) {
        const popupContent = `
            <div style="font-family: 'Inter', sans-serif; min-width: 200px;">
                <h4 style="margin: 0 0 10px 0; color: #1a1a1a;">${feature.district || "Unknown Area"}</h4>
                <p style="margin: 5px 0; color: #666;">
                    <strong>County:</strong> ${feature.county || "Unknown"}
                </p>
                <p style="margin: 5px 0; color: #666;">
                    <strong>Functionality:</strong> ${feature.functionality}%
                </p>
            </div>
        `;

        L.popup().setLatLng(latlng).setContent(popupContent).openOn(map);
    }

    // Add legend to map
    function addLegend() {
        const legend = L.control({ position: "bottomright" });

        legend.onAdd = function (map) {
            const div = L.DomUtil.create("div", "info legend");
            div.style.backgroundColor = "#ffffff";
            div.style.border = "1px solid #e2e8f0";
            div.style.padding = "12px";
            div.style.color = "#1e293b";
            div.style.fontSize = "12px";
            div.style.borderRadius = "8px";
            div.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.1)";

            const grades = [0, 40, 70, 100];
            const labels = [];
            const colors = ["#0d4f2d", "#2d8659", "#5cb85c"];

            div.innerHTML =
                '<h4 style="margin: 0 0 10px 0; font-size: 14px; color: #1e293b; font-weight: 600;">Functionality %</h4>';

            for (let i = 0; i < grades.length - 1; i++) {
                labels.push(
                    `<div style="display: flex; align-items: center; margin-bottom: 5px;">
                        <div style="width: 20px; height: 10px; background-color: ${colors[i]}; border: 1px solid #e2e8f0; margin-right: 8px; border-radius: 2px;"></div>
                        <span style="color: #64748b;">${grades[i]}-${grades[i + 1]}%</span>
                    </div>`,
                );
            }

            div.innerHTML += labels.join("");
            return div;
        };

        legend.addTo(map);
    }

    
    // Populate filter dropdowns
    function populateFilters() {
        // Populate county filter
        const countySelect = $("#county-filter");
        countySelect
            .empty()
            .append('<option value="all">All Counties</option>');

        counties.forEach((county) => {
            countySelect.append(`<option value="${county}">${county}</option>`);
        });

        // Restore saved filter values
        Object.keys(currentFilters).forEach((key) => {
            $(`#${key}-filter`).val(currentFilters[key]);
        });
    }

    // Initialize table
    function initializeTable() {
        updateTable();
    }

    // Initialize bar chart
    function initializeBarChart() {
        updateBarChart();
    }

    // Update table with current data
    function updateTable() {
        const tbody = $("#overview-tbody");
        tbody.empty();

        // Filter data based on current filters
        let filteredData = allWardData.filter(ward => {
            if (currentFilters.county !== "all" && ward.county !== currentFilters.county) {
                return false;
            }
            return true;
        });

        // Calculate pagination
        const totalRecords = filteredData.length;
        const totalPages = Math.ceil(totalRecords / rowsPerPage) || 1;

        // Ensure current page is valid
        if (currentPage > totalPages) {
            currentPage = totalPages;
        }

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = Math.min(startIndex + rowsPerPage, totalRecords);
        const pageData = filteredData.slice(startIndex, endIndex);

        // Populate table with current page data
        pageData.forEach((row) => {
            const tr = $(`
                <tr>
                    <td>${row.ward}</td>
                    <td>${row.assets}</td>
                    <td>${row.percentage}%</td>
                    <td>${row.population.toLocaleString()}</td>
                </tr>
            `);
            tbody.append(tr);
        });

        // Update pagination info
        updatePagination(totalRecords, totalPages, startIndex + 1, endIndex);
    }

    // Update pagination controls
    function updatePagination(totalRecords, totalPages, startRecord, endRecord) {
        $('#showing-start').text(totalRecords > 0 ? startRecord : 0);
        $('#showing-end').text(endRecord);
        $('#total-records').text(totalRecords);

        // Update button states
        $('#prev-btn').prop('disabled', currentPage === 1);
        $('#next-btn').prop('disabled', currentPage === totalPages);

        // Generate page numbers
        const paginationNumbers = $('#pagination-numbers');
        paginationNumbers.empty();

        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = $(`<button class="pagination-number ${i === currentPage ? 'active' : ''}">${i}</button>`);
            pageBtn.on('click', () => {
                currentPage = i;
                updateTable();
            });
            paginationNumbers.append(pageBtn);
        }
    }

    // Update bar chart
    let waterAssetsChart = null;

    // External tooltip handler
    function externalTooltipHandler(context) {
        // Tooltip Element
        const {chart, tooltip} = context;
        const chartArea = chart.chartArea;

        let tooltipEl = document.querySelector('.chart-canvas-wrapper .chartjs-tooltip');

        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.className = 'chartjs-tooltip';
            tooltipEl.style.opacity = 0;
            tooltipEl.style.position = 'absolute';
            tooltipEl.style.background = '#1e293b';
            tooltipEl.style.color = '#ffffff';
            tooltipEl.style.borderRadius = '8px';
            tooltipEl.style.padding = '10px 16px';
            tooltipEl.style.pointerEvents = 'none';
            tooltipEl.style.transition = 'all .1s ease';
            tooltipEl.style.fontSize = '13px';
            tooltipEl.style.fontWeight = '600';
            tooltipEl.style.textAlign = 'center';
            tooltipEl.style.lineHeight = '1.5';
            tooltipEl.style.whiteSpace = 'nowrap';
            tooltipEl.style.zIndex = '100';
            document.querySelector('.chart-canvas-wrapper').appendChild(tooltipEl);
        }

        // Hide if no tooltip
        if (tooltip.opacity === 0) {
            tooltipEl.style.opacity = 0;
            return;
        }

        // Set Text
        if (tooltip.body) {
            const bodyLines = tooltip.body.map(b => b.lines);
            const dataIndex = tooltip.dataPoints[0].dataIndex;
            const label = chart.data.labels[dataIndex];

            let innerHtml = '<div style="position: relative; padding-bottom: 6px;">';
            innerHtml += '<div style="margin-bottom: 2px;">2024</div>';
            innerHtml += '<div>' + label + '</div>';
            innerHtml += '<div style="width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 8px solid #1e293b; position: absolute; bottom: -14px; left: 50%; transform: translateX(-50%);"></div>';
            innerHtml += '</div>';

            tooltipEl.innerHTML = innerHtml;
        }

        const {offsetLeft: positionX, offsetTop: positionY} = chart.canvas;

        // Get the element (bar) that triggered the tooltip
        const activeElements = chart.getActiveElements();
        if (activeElements.length > 0) {
            const element = activeElements[0].element;
            const barCenterX = element.x;
            const barTopY = element.y;

            // Position tooltip centered above the bar
            tooltipEl.style.opacity = 1;
            tooltipEl.style.left = positionX + barCenterX + 'px';
            tooltipEl.style.top = positionY + barTopY + 'px';
            tooltipEl.style.transform = 'translate(-50%, -100%) translateY(-8px)';
        }
    }

    function updateBarChart() {
        // Load DPI data and calculate distribution
        fetch('../api/dpi.json')
            .then(response => response.json())
            .then(dpiData => {
                // Count assets by type
                const typeCounts = {};
                let total = 0;

                dpiData.forEach(asset => {
                    const type = asset.type;
                    typeCounts[type] = (typeCounts[type] || 0) + 1;
                    total++;
                });

                // Prepare chart data - map to reference image categories
                const typeMapping = {
                    'Hand Pump': 'Public Taps',
                    'Borehole': 'Protected Spring',
                    'Solar Pump': 'Private Taps',
                    'Storage Tank': 'Groundwater',
                    'Rainwater System': 'Private Taps',
                    'Dug Well': 'Groundwater'
                };

                const categoryData = {};
                Object.keys(typeCounts).forEach(type => {
                    const category = typeMapping[type] || type;
                    categoryData[category] = (categoryData[category] || 0) + typeCounts[type];
                });

                // Calculate percentages and prepare data
                const labels = Object.keys(categoryData);
                const values = Object.values(categoryData);
                const percentages = values.map(v => ((v / total) * 100).toFixed(1));

                // Color mapping
                const colorMap = {
                    'Public Taps': '#a8d5e2',
                    'Protected Spring': '#ffb88c',
                    'Private Taps': '#86e5d2',
                    'Groundwater': '#2d6470'
                };
                const colors = labels.map(label => colorMap[label] || '#cccccc');

                const ctx = document.getElementById('water-assets-chart').getContext('2d');

                // Destroy existing chart if it exists
                if (waterAssetsChart) {
                    waterAssetsChart.destroy();
                }

                // Chart options
                const chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Distribution of Water Assets per Type',
                            color: '#ffffff',
                            font: {
                                size: 18,
                                weight: '600'
                            },
                            align: 'start',
                            padding: {
                                bottom: 20
                            }
                        },
                        legend: {
                            display: false
                        },
                        tooltip: {
                            enabled: false,
                            external: externalTooltipHandler
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: false
                            },
                            ticks: {
                                display: false
                            },
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            title: {
                                display: false
                            },
                            ticks: {
                                color: '#64748b',
                                stepSize: 2,
                                font: {
                                    size: 12
                                }
                            },
                            grid: {
                                color: '#e2e8f0',
                                drawBorder: false
                            },
                            beginAtZero: true
                        }
                    }
                };

                // Create new chart
                waterAssetsChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Number of Assets',
                            data: values,
                            backgroundColor: colors,
                            borderColor: colors,
                            borderWidth: 0,
                            borderRadius: 8,
                            barThickness: 60
                        }]
                    },
                    options: chartOptions
                });

                // Create custom legend with real data
                const chartData = {
                    data: {
                        labels: labels,
                        values: values,
                        percentages: percentages
                    },
                    colors: colors
                };
                console.log('Creating legend with data:', chartData);
                console.log('Legend container exists:', document.getElementById('chart-legend'));
                createCustomLegend(chartData);
            })
            .catch(error => {
                console.error('Error loading chart data:', error);
                // Fallback to empty chart
                const ctx = document.getElementById('water-assets-chart').getContext('2d');
                if (waterAssetsChart) {
                    waterAssetsChart.destroy();
                }
                waterAssetsChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Public Taps', 'Private Taps', 'Protected Spring', 'Groundwater Source'],
                        datasets: [{
                            label: 'Number of Assets',
                            data: [8, 12, 16, 20],
                            backgroundColor: ['#00a8ff', '#00d4aa', '#ffa502', '#ff4757']
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Distribution of Water Assets per Type',
                                color: '#ffffff',
                                font: {
                                    size: 16,
                                    weight: 'bold'
                                }
                            },
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            x: {
                                title: {
                                    display: false
                                },
                                ticks: {
                                    display: false
                                },
                                grid: {
                                    display: false
                                }
                            },
                            y: {
                                title: {
                                    display: false
                                },
                                ticks: {
                                    color: '#94a3b8',
                                    stepSize: 5,
                                    max: 20
                                },
                                grid: {
                                    color: '#e2e8f0'
                                },
                                beginAtZero: true
                            }
                        }
                    }
                });
            });
    }

    // Create custom legend
    function createCustomLegend(chartData) {
        const legendContainer = document.getElementById('chart-legend');

        if (!legendContainer) {
            return;
        }

        legendContainer.innerHTML = '';

        chartData.data.labels.forEach((label, index) => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';

            const colorBox = document.createElement('div');
            colorBox.className = 'legend-color';
            colorBox.style.backgroundColor = chartData.colors[index];

            const labelText = document.createElement('span');
            labelText.className = 'legend-label';
            labelText.textContent = label;

            const percentage = document.createElement('span');
            percentage.className = 'legend-percentage';
            percentage.textContent = chartData.data.percentages[index] + '%';

            legendItem.appendChild(colorBox);
            legendItem.appendChild(labelText);
            legendItem.appendChild(percentage);

            legendContainer.appendChild(legendItem);
        });
    }

    
    // Setup event handlers
    function setupEventHandlers() {
        // Apply filter button
        $(".apply-filter-btn").on("click", applyFilters);

        // Filter change events
        $('select[id$="-filter"]').on("change", function () {
            // Auto-apply on change (optional)
            // applyFilters();
        });

        // Sortable table headers
        $(".sortable").on("click", function () {
            const sortBy = $(this).data("sort");
            sortTable(sortBy);

            // Update sort icons
            $(".sort-icon")
                .removeClass("fa-sort-up fa-sort-down")
                .addClass("fa-sort");
            const currentIcon = $(this).find(".sort-icon");
            // Toggle sort direction logic would go here
        });

        // Pagination buttons
        $('#prev-btn').on('click', () => {
            if (currentPage > 1) {
                currentPage--;
                updateTable();
            }
        });

        $('#next-btn').on('click', () => {
            currentPage++;
            updateTable();
        });

        // Settings button
        $(".settings-btn").on("click", function () {
            alert("Settings panel would open here");
        });

        // Tooltip triggers
        $(".tooltip-trigger").on("mouseenter", function () {
            // Show tooltip logic
        });
    }

    // Apply filters
    function applyFilters() {
        // Show shimmer on KPIs
        $(".kpi-card").addClass("shimmer");

        // Update current filters
        Object.keys(currentFilters).forEach((key) => {
            currentFilters[key] = $(`#${key}-filter`).val();
        });

        // Save filter state
        saveFilterState();

        // Reset to first page when filters are applied
        currentPage = 1;

        // Simulate loading delay
        setTimeout(() => {
            // Update map
            updateMapView();

            // Update table
            updateTable();

            // Update bar chart
            updateBarChart();

            // Remove shimmer
            $(".kpi-card").removeClass("shimmer");

            // Announce to screen readers
            announceStatus("Data refreshed successfully");
        }, 600);
    }

    // Update map view based on filters
    function updateMapView() {
        if (currentFilters.county !== "all") {
            // Filter features by county
            const countyFeatures = geojsonData.features.filter(
                (f) => f.county === currentFilters.county,
            );

            if (countyFeatures.length > 0) {
                // Create temporary layer for filtered county
                const filteredLayer = L.geoJSON(countyFeatures, {
                    style: getFeatureStyle,
                    onEachFeature: function (feature, layer) {
                        layer.on({
                            mouseover: function (e) {
                                highlightFeature(e);
                            },
                            mouseout: function (e) {
                                resetHighlight(e);
                            },
                            click: function (e) {
                                showPopup(feature, e.latlng);
                            },
                        });
                    },
                });

                // Fit to filtered bounds
                map.fitBounds(filteredLayer.getBounds());
            }
        } else {
            // Reset to full view
            map.fitBounds(map.getBounds());
        }
    }

    // Sort table
    function sortTable(sortBy) {
        let sortDirection = 'asc';

        // Check if already sorting by this column to toggle direction
        if (allWardData.sortBy === sortBy) {
            sortDirection = allWardData.sortDirection === 'asc' ? 'desc' : 'asc';
        }

        allWardData.sort((a, b) => {
            let aVal, bVal;
            let comparison = 0;

            switch (sortBy) {
                case "ward":
                    aVal = a.ward;
                    bVal = b.ward;
                    comparison = aVal.localeCompare(bVal);
                    break;
                case "assets":
                    aVal = a.assets;
                    bVal = b.assets;
                    comparison = aVal - bVal;
                    break;
                case "percentage":
                    aVal = a.percentage;
                    bVal = b.percentage;
                    comparison = aVal - bVal;
                    break;
                case "population":
                    aVal = a.population;
                    bVal = b.population;
                    comparison = aVal - bVal;
                    break;
                default:
                    comparison = 0;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });

        // Store sort state
        allWardData.sortBy = sortBy;
        allWardData.sortDirection = sortDirection;

        // Reset to first page when sorting
        currentPage = 1;
        updateTable();
    }

    // Save filter state to localStorage
    function saveFilterState() {
        localStorage.setItem(
            "wash-registry-filters",
            JSON.stringify(currentFilters),
        );
    }

    // Load filter state from localStorage
    function loadFilterState() {
        const saved = localStorage.getItem("wash-registry-filters");
        if (saved) {
            try {
                currentFilters = JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse saved filters:", e);
            }
        }
    }

    // Announce status to screen readers
    function announceStatus(message) {
        $("#status-announcement").text(message);
        setTimeout(() => {
            $("#status-announcement").text("");
        }, 1000);
    }

    // Show error message
    function showError(message) {
        console.error(message);
        // You could implement a toast notification here
        alert(message);
    }

    }, 100); // Wait 100ms for libraries to load
});
