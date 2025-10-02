$(document).ready(function() {
    let html5QrCode = null;
    let isScanning = false;
    let dpiData = [];

    // Check if required libraries are loaded
    function checkLibraries() {
        if (typeof $ === 'undefined') {
            console.error("jQuery not loaded");
            return false;
        }
        if (typeof axios === 'undefined') {
            console.error("Axios not loaded");
            return false;
        }
        if (typeof Html5Qrcode === 'undefined') {
            console.error("Html5Qrcode library not loaded");
            return false;
        }
        console.log("All libraries loaded successfully");
        return true;
    }

    // Initialize app
    function initializeApp() {
        if (!checkLibraries()) {
            showErrorMessage("Required libraries failed to load. Please refresh the page.");
            return;
        }

        // Load DPI data and initialize scanner
        loadDpiData();
        initScanner();
    }

    // Load DPI data
    async function loadDpiData() {
        try {
            console.log("Loading DPI data...");
            // Try both relative paths for local and GitHub Pages
            let dataUrl;
            if (window.location.pathname.includes('/dpi4pp/')) {
                dataUrl = "../api/dpi.json";
            } else {
                dataUrl = "/api/dpi.json";
            }

            console.log("Attempting to load from:", dataUrl);
            const response = await axios.get(dataUrl);
            dpiData = response.data;
            console.log("DPI data loaded successfully:", dpiData.length, "facilities");
        } catch (error) {
            console.error("Failed to load DPI data:", error);
            console.error("Error details:", error.response?.status, error.response?.statusText);
            showErrorMessage("Failed to load facility database. Please try again later.");
        }
    }

    // Initialize scanner
    function initScanner() {
        try {
            if (typeof Html5Qrcode === 'undefined') {
                console.error("Html5Qrcode library not loaded");
                showErrorMessage("QR scanner library failed to load. Please refresh the page.");
                return;
            }
            html5QrCode = new Html5Qrcode("qr-reader");
            console.log("Scanner initialized successfully");
        } catch (error) {
            console.error("Failed to initialize scanner:", error);
            showErrorMessage("Failed to initialize camera scanner. Please use manual input instead.");
        }
    }

    // Start scanning
    function startScanning() {
        if (!html5QrCode) {
            initScanner();
            if (!html5QrCode) {
                return; // Initialization failed
            }
        }

        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        };

        console.log("Starting camera scanner...");

        html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText, decodedResult) => {
                console.log("QR Code detected:", decodedText);
                stopScanning();
                lookupDpiId(decodedText);
            },
            (errorMessage) => {
                // Only log specific scan errors, ignore continuous scanning errors
                if (!errorMessage.includes('No QR code found')) {
                    console.warn("Scanner warning:", errorMessage);
                }
            }
        ).then(() => {
            isScanning = true;
            updateScanStatus(true);
            updateScannerButtons(true);
            console.log("Camera started successfully");
        }).catch((err) => {
            console.error("Unable to start scanning:", err);
            isScanning = false;
            updateScanStatus(false);
            updateScannerButtons(false);

            // Provide specific error messages
            if (err.name === 'NotAllowedError') {
                showErrorMessage("Camera access denied. Please allow camera permissions or use manual input.");
            } else if (err.name === 'NotFoundError') {
                showErrorMessage("No camera found. Please use manual input instead.");
            } else if (err.name === 'NotSupportedError') {
                showErrorMessage("Camera not supported on this device. Please use manual input.");
            } else {
                showErrorMessage("Unable to access camera. Please check permissions or use manual input.");
            }
        });
    }

    // Stop scanning
    function stopScanning() {
        if (html5QrCode && isScanning) {
            html5QrCode.stop().then(() => {
                isScanning = false;
                updateScanStatus(false);
                updateScannerButtons(false);
            }).catch((err) => {
                console.error("Failed to stop scanning:", err);
            });
        }
    }

    // Update scan status indicator
    function updateScanStatus(active) {
        const indicator = $("#status-indicator");
        if (active) {
            indicator.removeClass("inactive").addClass("active");
            indicator.html('<i class="fas fa-circle"></i> Scanning...');
        } else {
            indicator.removeClass("active").addClass("inactive");
            indicator.html('<i class="fas fa-circle"></i> Ready to Scan');
        }
    }

    // Update scanner buttons
    function updateScannerButtons(scanning) {
        const startBtn = $("#start-scan");
        const stopBtn = $("#stop-scan");

        if (scanning) {
            startBtn.prop("disabled", true).removeClass("active");
            stopBtn.prop("disabled", false);
        } else {
            startBtn.prop("disabled", false).addClass("active");
            stopBtn.prop("disabled", true);
        }
    }

    // Lookup DPI ID
    function lookupDpiId(dpiId) {
        console.log("Looking up DPI ID:", dpiId);

        // Find facility by ID (case insensitive)
        const facility = dpiData.find(f =>
            f.id.toLowerCase() === dpiId.toLowerCase()
        );

        if (facility) {
            showFacilityDetails(facility);
        } else {
            showErrorMessage(`DPI ID "${dpiId}" not found in the database.`);
        }
    }

    // Show facility details
    function showFacilityDetails(facility) {
        console.log("Showing facility details:", facility);

        // Stop any ongoing scanning
        stopScanning();

        // Close any open modal
        $("#manual-modal").addClass("hidden");

        const detailsHtml = `
            <div class="detail-card">
                <h4><i class="fas fa-info-circle"></i> Basic Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Facility ID</span>
                        <span class="detail-value">${facility.id}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Name</span>
                        <span class="detail-value">${facility.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Type</span>
                        <span class="detail-value">${facility.type}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Location</span>
                        <span class="detail-value">${facility.location}</span>
                    </div>
                </div>
            </div>

            <div class="detail-card">
                <h4><i class="fas fa-cogs"></i> Operational Status</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Functionality</span>
                        <span class="detail-value">
                            <span class="status-badge ${facility.functionality === 'Functioning' ? 'functioning' : 'not-functioning'}">
                                ${facility.functionality}
                            </span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">JMP Status</span>
                        <span class="detail-value">
                            <span class="status-badge jmp-status ${facility.jmpStatus.toLowerCase().replace(' ', '-')}">
                                ${facility.jmpStatus}
                            </span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Last Service</span>
                        <span class="detail-value">${facility.lastService}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Next Service</span>
                        <span class="detail-value">${facility.nextService}</span>
                    </div>
                </div>
            </div>

            ${getTechnicalDetails(facility)}

            <div class="detail-card">
                <h4><i class="fas fa-map-marker-alt"></i> Location & Contact</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Coordinates</span>
                        <span class="detail-value">
                            ${facility.coordinates.latitude.toFixed(4)}, ${facility.coordinates.longitude.toFixed(4)}
                        </span>
                    </div>
                    ${facility.contractor ? `
                    <div class="detail-item">
                        <span class="detail-label">Contractor</span>
                        <span class="detail-value">${facility.contractor}</span>
                    </div>
                    ` : ''}
                    ${facility.technician ? `
                    <div class="detail-item">
                        <span class="detail-label">Technician</span>
                        <span class="detail-value">${facility.technician}</span>
                    </div>
                    ` : ''}
                    ${facility.supplier ? `
                    <div class="detail-item">
                        <span class="detail-label">Supplier</span>
                        <span class="detail-value">${facility.supplier}</span>
                    </div>
                    ` : ''}
                </div>
            </div>

            ${facility.waterQuality ? `
            <div class="detail-card">
                <h4><i class="fas fa-tint"></i> Water Quality</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">pH Level</span>
                        <span class="detail-value">${facility.waterQuality.pH}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Turbidity</span>
                        <span class="detail-value">${facility.waterQuality.turbidity}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Last Test</span>
                        <span class="detail-value">${facility.waterQuality.lastTest}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status</span>
                        <span class="detail-value">
                            <span class="status-badge ${facility.waterQuality.safe ? 'functioning' : 'not-functioning'}">
                                ${facility.waterQuality.safe ? 'Safe' : 'Unsafe'}
                            </span>
                        </span>
                    </div>
                </div>
            </div>
            ` : ''}
        `;

        $("#facility-details").html(detailsHtml);
        $("#result-section").removeClass("hidden");
        $("#error-section").addClass("hidden");
        $(".scanner-section").addClass("hidden");
    }

    // Get technical details based on facility type
    function getTechnicalDetails(facility) {
        switch (facility.type) {
            case 'Borehole':
                return `
                    <div class="detail-card">
                        <h4><i class="fas fa-tools"></i> Technical Specifications</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Depth</span>
                                <span class="detail-value">${facility.depth}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Pump Type</span>
                                <span class="detail-value">${facility.pumpType}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Flow Rate</span>
                                <span class="detail-value">${facility.flowRate}</span>
                            </div>
                        </div>
                    </div>
                `;
            case 'Hand Pump':
                return `
                    <div class="detail-card">
                        <h4><i class="fas fa-tools"></i> Technical Specifications</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Pump Model</span>
                                <span class="detail-value">${facility.pumpModel}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Installation Year</span>
                                <span class="detail-value">${facility.installationYear}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Spare Parts Available</span>
                                <span class="detail-value">
                                    <span class="status-badge ${facility.sparePartsAvailable ? 'functioning' : 'not-functioning'}">
                                        ${facility.sparePartsAvailable ? 'Yes' : 'No'}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                `;
            case 'Storage Tank':
                return `
                    <div class="detail-card">
                        <h4><i class="fas fa-tools"></i> Technical Specifications</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Capacity</span>
                                <span class="detail-value">${facility.capacity}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Material</span>
                                <span class="detail-value">${facility.material}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Installation Year</span>
                                <span class="detail-value">${facility.installationYear}</span>
                            </div>
                            ${facility.issue ? `
                            <div class="detail-item">
                                <span class="detail-label">Issue</span>
                                <span class="detail-value" style="color: #ef4444;">${facility.issue}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            case 'Solar Pump':
                return `
                    <div class="detail-card">
                        <h4><i class="fas fa-tools"></i> Technical Specifications</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Panel Capacity</span>
                                <span class="detail-value">${facility.panelCapacity}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Battery Backup</span>
                                <span class="detail-value">
                                    <span class="status-badge ${facility.batteryBackup ? 'functioning' : 'not-functioning'}">
                                        ${facility.batteryBackup ? 'Yes' : 'No'}
                                    </span>
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Flow Rate</span>
                                <span class="detail-value">${facility.flowRate}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Installation Year</span>
                                <span class="detail-value">${facility.installationYear}</span>
                            </div>
                        </div>
                    </div>
                `;
            case 'Rainwater System':
                return `
                    <div class="detail-card">
                        <h4><i class="fas fa-tools"></i> Technical Specifications</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Roof Area</span>
                                <span class="detail-value">${facility.roofArea}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Tank Capacity</span>
                                <span class="detail-value">${facility.tankCapacity}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">First Flush System</span>
                                <span class="detail-value">
                                    <span class="status-badge ${facility.firstFlush ? 'functioning' : 'not-functioning'}">
                                        ${facility.firstFlush ? 'Yes' : 'No'}
                                    </span>
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Filtration</span>
                                <span class="detail-value">
                                    <span class="status-badge ${facility.filtration ? 'functioning' : 'not-functioning'}">
                                        ${facility.filtration ? 'Yes' : 'No'}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                `;
            case 'Dug Well':
                return `
                    <div class="detail-card">
                        <h4><i class="fas fa-tools"></i> Technical Specifications</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Depth</span>
                                <span class="detail-value">${facility.depth}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Lining</span>
                                <span class="detail-value">${facility.lining}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Cover</span>
                                <span class="detail-value">${facility.cover}</span>
                            </div>
                            ${facility.issue ? `
                            <div class="detail-item">
                                <span class="detail-label">Issue</span>
                                <span class="detail-value" style="color: #ef4444;">${facility.issue}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            default:
                return '';
        }
    }

    // Show error message
    function showErrorMessage(message) {
        // Stop any ongoing scanning
        stopScanning();

        // Close any open modal
        $("#manual-modal").addClass("hidden");

        $("#error-message").text(message);
        $("#error-section").removeClass("hidden");
        $("#result-section").addClass("hidden");
        $(".scanner-section").addClass("hidden");
    }

    // Reset to scanner view
    function resetToScanner() {
        $("#result-section").addClass("hidden");
        $("#error-section").addClass("hidden");
        $(".scanner-section").removeClass("hidden");

        // Close any open modal
        $("#manual-modal").addClass("hidden");

        // Clear any input fields
        $("#dpi-id-input").val('');

        // Stop any ongoing scanning
        stopScanning();

        // Update scanner status
        updateScanStatus(false);
        updateScannerButtons(false);
    }

    // Event Listeners
    $("#start-scan").click(function() {
        startScanning();
    });

    $("#stop-scan").click(function() {
        stopScanning();
    });

    $("#manual-input").click(function() {
        $("#manual-modal").removeClass("hidden");
    });

    $("#close-modal").click(function() {
        $("#manual-modal").addClass("hidden");
    });

    $("#lookup-btn").click(function() {
        const dpiId = $("#dpi-id-input").val().trim();
        if (dpiId) {
            $("#manual-modal").addClass("hidden");
            lookupDpiId(dpiId);
            $("#dpi-id-input").val('');
        }
    });

    $("#dpi-id-input").keypress(function(e) {
        if (e.which === 13) {
            const dpiId = $(this).val().trim();
            if (dpiId) {
                $("#manual-modal").addClass("hidden");
                lookupDpiId(dpiId);
                $(this).val('');
            }
        }
    });

    $("#back-btn").click(function() {
        resetToScanner();
    });

    $("#back-to-scan").click(function() {
        resetToScanner();
    });

    // Close modal when clicking outside
    $(document).click(function(event) {
        if ($(event.target).hasClass('modal')) {
            $(".modal").addClass("hidden");
        }
    });

    // Initialize app
    initializeApp();
});