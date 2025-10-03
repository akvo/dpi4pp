$(document).ready(function() {
    let html5QrCode = null;
    let isScanning = false;
    let dpiData = [];
    let facilitiesMap = null;
    let mapMarkers = [];
    let liberiaLayer = null;

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
        checkCameraAvailability().then((available) => {
            if (available) {
                initScanner();
            } else {
                console.log("No cameras detected, disabling camera features");
                disableCameraFeatures();
            }
        });
    }

    // Check if cameras are available
    async function checkCameraAvailability() {
        try {
            console.log("=== CAMERA AVAILABILITY CHECK ===");

            if (!navigator.mediaDevices) {
                console.error("navigator.mediaDevices not available");
                return false;
            }

            if (!navigator.mediaDevices.enumerateDevices) {
                console.error("navigator.mediaDevices.enumerateDevices not available");
                return false;
            }

            if (!navigator.mediaDevices.getUserMedia) {
                console.error("navigator.mediaDevices.getUserMedia not available");
                return false;
            }

            console.log("Media devices API available, checking devices...");
            const devices = await navigator.mediaDevices.enumerateDevices();
            console.log("All devices:", devices);

            const cameras = devices.filter(device => device.kind === 'videoinput');
            console.log(`Found ${cameras.length} camera(s):`, cameras);

            // Test camera access
            if (cameras.length > 0) {
                try {
                    console.log("Testing camera access...");
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    console.log("Camera access successful, stopping test stream");
                    stream.getTracks().forEach(track => track.stop());
                    return true;
                } catch (testError) {
                    console.error("Camera access test failed:", testError);
                    return false;
                }
            }

            return cameras.length > 0;
        } catch (error) {
            console.error("Error checking camera availability:", error);
            return false;
        }
    }

    // Disable camera features if no cameras available
    function disableCameraFeatures() {
        $("#start-scan").prop("disabled", true);
        updateScanStatus(false);
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

            // Load facilities list after data is loaded
            loadFacilitiesList();

            // Show search bar for list view
            $("#shared-search").removeClass("hidden");
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

            // Check for camera support
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error("Camera not supported in this browser");
                showErrorMessage("Camera not supported in this browser. Please use manual input.");
                return;
            }

            html5QrCode = new Html5Qrcode("qr-reader");
            console.log("Scanner initialized successfully");

            // Check camera permissions
            checkCameraPermissions();
        } catch (error) {
            console.error("Failed to initialize scanner:", error);
            showErrorMessage("Failed to initialize camera scanner. Please use manual input instead.");
        }
    }

    // Check camera permissions
    function checkCameraPermissions() {
        if ('permissions' in navigator) {
            navigator.permissions.query({ name: 'camera' }).then((result) => {
                console.log('Camera permission status:', result.state);
                if (result.state === 'denied') {
                    showErrorMessage("Camera permission denied. Please enable camera access in browser settings or use manual input.");
                }
            }).catch((err) => {
                console.log('Permission query not supported:', err);
            });
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

        // Check for HTTPS requirement
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            showErrorMessage("Camera access requires HTTPS. Please use manual input or access via HTTPS.");
            return;
        }

        const config = {
            fps: 10,
            qrbox: { width: 300, height: 300 },
            disableFlip: false,
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
            defaultZoomValueIfSupported: 2
        };

        console.log("Starting camera scanner with config:", config);

        // Test callback functions
        const testSuccessCallback = function(text, result) {
            console.log("SUCCESS CALLBACK TEST - this should trigger when QR detected");
            console.log("Text:", text);
        };

        const testErrorCallback = function(error) {
            // Don't log this test as it's just for verification
        };

        console.log("Success callback function:", typeof testSuccessCallback);
        console.log("Error callback function:", typeof testErrorCallback);

        // Try different camera approaches
        const cameraConstraints = [
            { facingMode: "environment" }, // Back camera first
            { facingMode: "user" },        // Front camera fallback
            {}                             // Any available camera
        ];

        tryStartCamera(0, cameraConstraints, config);
    }

    // Try to start camera with different constraints
    function tryStartCamera(constraintIndex, constraints, config) {
        if (constraintIndex >= constraints.length) {
            showErrorMessage("Unable to access any camera. Please check permissions or use manual input.");
            return;
        }

        const currentConstraint = constraints[constraintIndex];
        console.log(`Trying camera constraint ${constraintIndex}:`, currentConstraint);

        html5QrCode.start(
            currentConstraint,
            config,
            function(decodedText, decodedResult) {
                console.log("=== QR CODE DETECTED BY CAMERA ===");
                console.log("Raw decoded text:", decodedText);
                console.log("Decoded text type:", typeof decodedText);
                console.log("Decoded text length:", decodedText ? decodedText.length : 0);
                console.log("Full decoded result:", decodedResult);

                // Immediately call the lookup without stopping first
                console.log("Calling lookupDpiId with:", decodedText);
                lookupDpiId(decodedText);

                // Stop scanner after a brief delay to ensure lookup starts
                setTimeout(() => {
                    console.log("Stopping scanner after detection");
                    stopScanning();
                }, 100);
            },
            function(errorMessage) {
                // Only log specific scan errors, ignore continuous scanning errors
                if (!errorMessage.includes('No QR code found') &&
                    !errorMessage.includes('NotFoundException') &&
                    !errorMessage.includes('QR code parse error') &&
                    !errorMessage.includes('No MultiFormat Readers')) {
                    console.warn("Scanner warning:", errorMessage);
                }
            }
        ).then(() => {
            isScanning = true;
            updateScanStatus(true);
            updateScannerButtons(true);
            console.log("Camera started successfully with constraint:", currentConstraint);
            console.log("Scanner is now running and should detect QR codes");

            // Test notification after 3 seconds
            setTimeout(() => {
                console.log("Scanner has been running for 3 seconds - point camera at QR code");
            }, 3000);
        }).catch((err) => {
            console.error(`Failed with constraint ${constraintIndex}:`, err);

            // If this is the last constraint, show specific error
            if (constraintIndex === constraints.length - 1) {
                isScanning = false;
                updateScanStatus(false);
                updateScannerButtons(false);

                // Provide specific error messages
                if (err.name === 'NotAllowedError' || err.toString().includes('Permission denied')) {
                    showErrorMessage("Camera access denied. Please allow camera permissions in your browser or use manual input.");
                } else if (err.name === 'NotFoundError' || err.toString().includes('No video input device')) {
                    showErrorMessage("No camera found on this device. Please use manual input instead.");
                } else if (err.name === 'NotSupportedError' || err.toString().includes('not supported')) {
                    showErrorMessage("Camera not supported on this device. Please use manual input.");
                } else if (err.toString().includes('HTTPS')) {
                    showErrorMessage("Camera access requires HTTPS. Please use manual input or access via HTTPS.");
                } else {
                    showErrorMessage("Unable to access camera. Please check permissions, try manual input, or refresh the page.");
                }
            } else {
                // Try next constraint
                setTimeout(() => {
                    tryStartCamera(constraintIndex + 1, constraints, config);
                }, 100);
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
                console.log("Camera stopped successfully");
            }).catch((err) => {
                console.error("Failed to stop scanning:", err);
                // Force reset state even if stop fails
                isScanning = false;
                updateScanStatus(false);
                updateScannerButtons(false);
            });
        } else if (html5QrCode) {
            // Ensure we're in the correct state
            isScanning = false;
            updateScanStatus(false);
            updateScannerButtons(false);
        }
    }

    // Update scan status indicator
    function updateScanStatus(active) {
        const indicator = $("#status-indicator");
        if (active) {
            indicator.removeClass("inactive").addClass("active");
        } else {
            indicator.removeClass("active").addClass("inactive");
        }
    }

    // Update scanner buttons
    function updateScannerButtons(scanning) {
        const startBtn = $("#start-scan");

        if (scanning) {
            startBtn.prop("disabled", true).addClass("scanning");
        } else {
            startBtn.prop("disabled", false).removeClass("scanning");
        }
    }

    // Lookup DPI ID
    function lookupDpiId(dpiId) {
        console.log("=== LOOKUP DPI ID ===");
        console.log("DPI ID to lookup:", dpiId);
        console.log("DPI data available:", dpiData.length, "facilities");

        if (!dpiData || dpiData.length === 0) {
            console.error("No DPI data loaded!");
            showErrorMessage("Database not loaded. Please refresh the page and try again.");
            return;
        }

        // Find facility by ID (case insensitive)
        const facility = dpiData.find(f =>
            f.id.toLowerCase() === dpiId.toLowerCase()
        );

        console.log("Facility found:", !!facility);
        if (facility) {
            console.log("Facility details:", facility);
            showFacilityDetails(facility);
        } else {
            console.log("Available DPI IDs:", dpiData.map(f => f.id));
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

        // Update view state to show we're on detail page
        currentView = 'detail';

        // Always show scanner icon when on detail page
        $("#center-icon").removeClass("fa-search").addClass("fa-qrcode");

        // Hide search bar on detail page
        $("#shared-search").addClass("hidden");

        // Get image URL
        let imageUrl = facility.image || `https://placehold.co/400x300/e5e7eb/6b7280?text=${encodeURIComponent(facility.type)}`;
        if (facility.image && facility.image.startsWith('/api/')) {
            imageUrl = '..' + facility.image;
        }

        // Set hero image
        $("#detail-hero-image").attr("src", imageUrl);

        // Set facility info
        $("#detail-facility-name").text(facility.type);
        $("#detail-facility-id").text(`# ${facility.id}`);
        $("#detail-facility-location span").text(facility.location);

        // Set status badge
        const statusClass = facility.functionality === "Functioning" ? "functioning" : "not-functioning";
        const statusText = facility.functionality === "Functioning" ? "Functioning" : "No function";
        $("#detail-status-badge")
            .removeClass("functioning not-functioning")
            .addClass(statusClass)
            .text(statusText);

        // Generate description
        const description = generateFacilityDescription(facility);
        $("#detail-description").html(description);

        // Show result section
        $("#result-section").removeClass("hidden");
        $("#error-section").addClass("hidden");
        $("#scanner-view").addClass("hidden");
        $("#facilities-list").addClass("hidden");
        $("#map-view").addClass("hidden");
    }

    // Generate facility description
    function generateFacilityDescription(facility) {
        let description = `<p>This ${facility.type.toLowerCase()}, located in ${facility.location}, Liberia, `;

        if (facility.functionality === "Functioning") {
            description += `is currently functional and provides access to clean water for the surrounding community.`;
        } else {
            description += `is currently non-functional and does not provide access to clean water for the surrounding community.`;
        }

        if (facility.issue) {
            description += ` The exact cause of the malfunction is: ${facility.issue}.`;
        }

        if (facility.lastService) {
            description += ` Last serviced on ${facility.lastService}.`;
        }

        // Add technical details
        const technicalDetails = getTechnicalSummary(facility);
        if (technicalDetails) {
            description += `</p><p><strong>Technical Details:</strong> ${technicalDetails}</p>`;
        } else {
            description += `</p>`;
        }

        return description;
    }

    // Get technical summary
    function getTechnicalSummary(facility) {
        const details = [];

        if (facility.depth) details.push(`Depth: ${facility.depth}`);
        if (facility.pumpType) details.push(`Pump Type: ${facility.pumpType}`);
        if (facility.flowRate) details.push(`Flow Rate: ${facility.flowRate}`);
        if (facility.capacity) details.push(`Capacity: ${facility.capacity}`);
        if (facility.material) details.push(`Material: ${facility.material}`);
        if (facility.pumpModel) details.push(`Model: ${facility.pumpModel}`);
        if (facility.panelCapacity) details.push(`Solar Panel: ${facility.panelCapacity}`);

        return details.join(', ');
    }

    // Old detail cards function - keeping structure for compatibility
    function generateOldDetailCards() {
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

        console.log("Setting facility details HTML...");
        const facilityDetailsEl = $("#facility-details");
        console.log("Facility details element found:", facilityDetailsEl.length);
        facilityDetailsEl.html(detailsHtml);

        console.log("Showing result section...");
        const resultSection = $("#result-section");
        console.log("Result section element found:", resultSection.length);
        console.log("Result section classes before:", resultSection.attr("class"));
        resultSection.removeClass("hidden");
        console.log("Result section classes after:", resultSection.attr("class"));

        console.log("Hiding error section...");
        const errorSection = $("#error-section");
        console.log("Error section element found:", errorSection.length);
        errorSection.addClass("hidden");

        console.log("Hiding scanner and list sections...");
        $("#scanner-view").addClass("hidden");
        $("#facilities-list").addClass("hidden");

        console.log("Final check - Result section visible:", !resultSection.hasClass("hidden"));
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
        // Only show error section for lookup failures, not camera errors
        // For camera errors, we'll show them in console and display in scanner title
        if (message.includes("Camera") || message.includes("camera") ||
            message.includes("permissions") || message.includes("HTTPS")) {
            console.error("Camera error:", message);
            // Show error message in scanner view instead of hiding it
            $(".scanner-title").text("Camera unavailable - use manual input");
            $(".scanner-title").css("color", "#ef4444");
            // Keep scanner visible for manual input option
            return;
        }

        // Stop any ongoing scanning
        stopScanning();

        // Close any open modal
        $("#manual-modal").addClass("hidden");

        $("#error-message").text(message);
        $("#error-section").removeClass("hidden");
        $("#result-section").addClass("hidden");
        $("#scanner-view").addClass("hidden");
        $("#complaint-section").addClass("hidden");
        $("#facilities-list").addClass("hidden");
        $("#map-view").addClass("hidden");
        $("#shared-search").addClass("hidden");
    }


    // Test function for manual QR code simulation
    window.testQRScan = function(testId) {
        console.log("=== MANUAL QR TEST ===");
        console.log("Testing with ID:", testId || "BH-2024-001");
        lookupDpiId(testId || "BH-2024-001");
    };

    // View toggle state
    let currentView = 'list'; // 'list', 'map', 'scanner', or 'detail'

    // Clear search input
    function clearSearch() {
        $("#header-search-input").val('');
        // Reset all facilities to visible
        $(".facility-card").show();
        // Reset all markers to full opacity
        mapMarkers.forEach(marker => {
            marker.setOpacity(1);
        });
    }

    // Toggle between list and scanner view
    function toggleView() {
        const listView = $("#facilities-list");
        const mapView = $("#map-view");
        const scannerView = $("#scanner-view");
        const resultSection = $("#result-section");
        const errorSection = $("#error-section");
        const complaintSection = $("#complaint-section");
        const centerIcon = $("#center-icon");
        const sharedSearch = $("#shared-search");

        // Clear search when changing views
        clearSearch();

        if (currentView === 'list') {
            // Switch to scanner view
            listView.addClass("hidden");
            mapView.addClass("hidden");
            scannerView.removeClass("hidden");
            resultSection.addClass("hidden");
            errorSection.addClass("hidden");
            complaintSection.addClass("hidden");
            sharedSearch.addClass("hidden");
            centerIcon.removeClass("fa-qrcode").addClass("fa-search");
            currentView = 'scanner';
            // Clear nav highlighting
            $(".nav-item").removeClass("active");
            // Reset scanner title
            $(".scanner-title").text("Scan a facility").css("color", "#1f2937");
            // Auto-start scanning
            setTimeout(() => startScanning(), 300);
        } else if (currentView === 'map') {
            // Switch to scanner view from map
            mapView.addClass("hidden");
            listView.addClass("hidden");
            scannerView.removeClass("hidden");
            resultSection.addClass("hidden");
            errorSection.addClass("hidden");
            complaintSection.addClass("hidden");
            sharedSearch.addClass("hidden");
            centerIcon.removeClass("fa-qrcode").addClass("fa-search");
            currentView = 'scanner';
            // Clear nav highlighting
            $(".nav-item").removeClass("active");
            // Reset scanner title
            $(".scanner-title").text("Scan a facility").css("color", "#1f2937");
            // Auto-start scanning
            setTimeout(() => startScanning(), 300);
        } else if (currentView === 'scanner') {
            // Switch to list view
            scannerView.addClass("hidden");
            resultSection.addClass("hidden");
            errorSection.addClass("hidden");
            complaintSection.addClass("hidden");
            mapView.addClass("hidden");
            listView.removeClass("hidden");
            sharedSearch.removeClass("hidden");
            centerIcon.removeClass("fa-search").addClass("fa-qrcode");
            currentView = 'list';
            // Clear nav highlighting for list view
            $(".nav-item").removeClass("active");
            // Stop scanning if active
            if (isScanning) {
                stopScanning();
            }
        } else if (currentView === 'detail') {
            // From detail page, go to scanner view
            resultSection.addClass("hidden");
            errorSection.addClass("hidden");
            complaintSection.addClass("hidden");
            listView.addClass("hidden");
            mapView.addClass("hidden");
            scannerView.removeClass("hidden");
            sharedSearch.addClass("hidden");
            centerIcon.removeClass("fa-qrcode").addClass("fa-search");
            currentView = 'scanner';
            // Clear nav highlighting
            $(".nav-item").removeClass("active");

            // Reset scanner title
            $(".scanner-title").text("Scan a facility").css("color", "#1f2937");

            // Re-initialize scanner if needed
            if (!html5QrCode) {
                initScanner();
            }

            // Auto-start scanning
            setTimeout(() => startScanning(), 300);
        }
    }

    // Load facilities list
    function loadFacilitiesList() {
        const container = $("#facilities-container");
        container.empty();

        if (!dpiData || dpiData.length === 0) {
            container.html('<p style="text-align: center; color: #6b7280; padding: 2rem;">No facilities found</p>');
            return;
        }

        // Get unique facilities (remove duplicates)
        const uniqueFacilities = {};
        dpiData.forEach(facility => {
            if (!uniqueFacilities[facility.id]) {
                uniqueFacilities[facility.id] = facility;
            }
        });

        Object.values(uniqueFacilities).forEach((facility, index) => {
            const statusClass = facility.functionality === "Functioning" ? "functioning" : "not-functioning";
            const statusText = facility.functionality === "Functioning" ? "Functioning" : "No function";

            // Construct QR code path
            const qrCodePath = `../api/barcode/${facility.id.replace(/\//g, '_')}.png`;

            // Use image from data or fallback to placeholder
            // Update path to use relative path for GitHub Pages compatibility
            let imageUrl = facility.image || `https://placehold.co/400x300/e5e7eb/6b7280?text=${encodeURIComponent(facility.type)}`;
            if (facility.image && facility.image.startsWith('/api/')) {
                imageUrl = '..' + facility.image;
            }

            const card = $(`
                <div class="facility-card" data-id="${facility.id}">
                    <div style="position: relative;">
                        <img src="${imageUrl}" alt="${facility.name}" class="facility-image" />
                        <span class="facility-status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="facility-card-body">
                        <div class="facility-info">
                            <h3 class="facility-name">${facility.type}</h3>
                            <div class="facility-id"># ${facility.id}</div>
                            <div class="facility-location">
                                <i class="fas fa-map-marker-alt"></i> ${facility.location}
                            </div>
                        </div>
                        <img src="${qrCodePath}" alt="QR Code" class="facility-qr" />
                    </div>
                </div>
            `);

            card.click(function() {
                lookupDpiId(facility.id);
            });

            container.append(card);
        });
    }

    // Initialize map
    function initializeMap() {
        if (facilitiesMap) {
            return; // Already initialized
        }

        console.log("Initializing map...");

        // Create map centered on Liberia
        facilitiesMap = L.map('facilities-map', {
            scrollWheelZoom: false,
            zoomControl: false
        }).setView([6.4281, -9.4295], 8);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(facilitiesMap);

        // Load Liberia boundaries
        loadLiberiaBoundaries();

        // Add facility markers
        addFacilityMarkers();

        console.log("Map initialized successfully");
    }

    // Load Liberia boundaries
    async function loadLiberiaBoundaries() {
        try {
            let dataUrl;
            if (window.location.pathname.includes('/dpi4pp/')) {
                dataUrl = "../api/source/liberia.json";
            } else {
                dataUrl = "/api/source/liberia.json";
            }

            console.log("Loading Liberia boundaries from:", dataUrl);
            const response = await axios.get(dataUrl);
            const topoData = response.data;

            // Convert TopoJSON to GeoJSON
            const geoData = topojson.feature(topoData, topoData.objects.liberia);

            // Add to map with styling
            liberiaLayer = L.geoJSON(geoData, {
                style: {
                    color: '#015ece',
                    weight: 2,
                    fillColor: '#e5f2ff',
                    fillOpacity: 0.2
                }
            }).addTo(facilitiesMap);

            console.log("Liberia boundaries loaded successfully");
        } catch (error) {
            console.error("Failed to load Liberia boundaries:", error);
        }
    }

    // Add facility markers to map
    function addFacilityMarkers() {
        if (!facilitiesMap || !dpiData || dpiData.length === 0) {
            console.error("Cannot add markers: map or data not available");
            return;
        }

        // Clear existing markers
        mapMarkers.forEach(marker => marker.remove());
        mapMarkers = [];

        console.log("Adding facility markers to map...");

        // Get unique facilities
        const uniqueFacilities = {};
        dpiData.forEach(facility => {
            if (!uniqueFacilities[facility.id]) {
                uniqueFacilities[facility.id] = facility;
            }
        });

        // Create markers for each facility
        Object.values(uniqueFacilities).forEach(facility => {
            if (facility.coordinates && facility.coordinates.latitude && facility.coordinates.longitude) {
                const statusClass = facility.functionality === "Functioning" ? "functioning" : "not-functioning";
                const statusText = facility.functionality === "Functioning" ? "Functioning" : "No function";

                // Create custom icon based on status
                const iconColor = facility.functionality === "Functioning" ? '#10b981' : '#ef4444';
                const customIcon = L.divIcon({
                    html: `
                        <div style="
                            position: relative;
                            width: 32px;
                            height: 32px;
                            background: ${iconColor};
                            border-radius: 50% 50% 50% 0;
                            transform: rotate(-45deg);
                            border: 3px solid white;
                            box-shadow: 0 3px 12px rgba(0,0,0,0.4);
                        ">
                            <div style="
                                position: absolute;
                                width: 14px;
                                height: 14px;
                                background: white;
                                border-radius: 50%;
                                top: 50%;
                                left: 50%;
                                transform: translate(-50%, -50%);
                            "></div>
                        </div>
                    `,
                    className: 'custom-marker',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32]
                });

                // Create marker
                const marker = L.marker(
                    [facility.coordinates.latitude, facility.coordinates.longitude],
                    { icon: customIcon }
                ).addTo(facilitiesMap);

                // Get image URL
                let imageUrl = facility.image || `https://placehold.co/400x300/e5e7eb/6b7280?text=${encodeURIComponent(facility.type)}`;
                if (facility.image && facility.image.startsWith('/api/')) {
                    imageUrl = '..' + facility.image;
                }

                // Create popup content
                const popupContent = `
                    <div class="map-popup-content">
                        <div class="map-popup-image" style="background-image: url('${imageUrl}')"></div>
                        <div class="map-popup-body">
                            <div class="map-popup-header">
                                <h3 class="map-popup-title">${facility.type}</h3>
                                <span class="map-popup-id">${facility.id}</span>
                            </div>
                            <div class="map-popup-location">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${facility.location}</span>
                            </div>
                            <div class="map-popup-footer">
                                <span class="map-popup-status ${statusClass}">${statusText}</span>
                                <button class="map-popup-view-btn" onclick="window.viewFacilityFromMap('${facility.id}')">
                                    <i class="fas fa-arrow-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;

                marker.bindPopup(popupContent);
                mapMarkers.push(marker);
            }
        });

        console.log(`Added ${mapMarkers.length} markers to map`);
    }

    // Global function to view facility from map popup
    window.viewFacilityFromMap = function(facilityId) {
        lookupDpiId(facilityId);
    };

    // Search facilities (header search)
    $("#header-search-input").on("input", function() {
        const searchTerm = $(this).val().toLowerCase();

        if (currentView === 'list') {
            // Search in list view
            $(".facility-card").each(function() {
                const facilityName = $(this).find(".facility-name").text().toLowerCase();
                const facilityLocation = $(this).find(".facility-location").text().toLowerCase();

                if (facilityName.includes(searchTerm) || facilityLocation.includes(searchTerm)) {
                    $(this).show();
                } else {
                    $(this).hide();
                }
            });
        } else if (currentView === 'map') {
            // Search in map view - filter markers
            mapMarkers.forEach(marker => {
                const popup = marker.getPopup();
                const popupContent = popup.getContent().toLowerCase();

                if (popupContent.includes(searchTerm)) {
                    marker.setOpacity(1);
                } else {
                    marker.setOpacity(0.2);
                }
            });
        }
    });

    // Event Listeners
    $("#toggle-view").click(function() {
        toggleView();
    });

    $("#manual-input").click(function() {
        console.log("=== MANUAL INPUT BUTTON CLICKED ===");
        console.log("Showing manual modal...");
        const modal = $("#manual-modal");
        console.log("Modal element found:", modal.length);
        console.log("Modal classes before:", modal.attr("class"));
        modal.removeClass("hidden").show();
        console.log("Modal classes after:", modal.attr("class"));
        console.log("Modal visible:", modal.is(":visible"));
    });

    $("#close-modal").click(function() {
        $("#manual-modal").addClass("hidden");
    });

    $("#lookup-btn").click(function() {
        console.log("=== LOOKUP BUTTON CLICKED ===");
        const dpiIdInput = $("#dpi-id-input");
        const dpiId = dpiIdInput.val().trim();
        console.log("DPI ID input field found:", dpiIdInput.length);
        console.log("DPI ID value:", dpiId);
        console.log("DPI ID length:", dpiId.length);

        if (dpiId) {
            console.log("Valid DPI ID, hiding modal and looking up...");
            $("#manual-modal").addClass("hidden").hide();
            lookupDpiId(dpiId);
            dpiIdInput.val('');
        } else {
            console.log("Empty DPI ID, not performing lookup");
        }
    });

    $("#dpi-id-input").keypress(function(e) {
        console.log("=== DPI INPUT KEYPRESS ===", e.which);
        if (e.which === 13) {
            console.log("Enter key pressed in DPI input");
            const dpiId = $(this).val().trim();
            console.log("DPI ID from keypress:", dpiId);
            if (dpiId) {
                console.log("Valid DPI ID from keypress, looking up...");
                $("#manual-modal").addClass("hidden").hide();
                lookupDpiId(dpiId);
                $(this).val('');
            } else {
                console.log("Empty DPI ID from keypress");
            }
        }
    });

    // Navigate to map view (first nav icon)
    $("#nav-records").click(function() {
        // Clear search when navigating
        clearSearch();

        // Show the map view
        $("#map-view").removeClass("hidden");
        $("#facilities-list").addClass("hidden");
        $("#scanner-view").addClass("hidden");
        $("#result-section").addClass("hidden");
        $("#error-section").addClass("hidden");
        $("#complaint-section").addClass("hidden");
        $("#shared-search").removeClass("hidden");
        $("#center-icon").removeClass("fa-search").addClass("fa-qrcode");
        currentView = 'map';

        // Update nav highlighting
        $(".nav-item").removeClass("active");
        $("#nav-records").addClass("active");

        if (isScanning) {
            stopScanning();
        }

        // Initialize map if needed
        if (!facilitiesMap) {
            setTimeout(() => {
                initializeMap();
            }, 100);
        } else {
            // Invalidate size to fix display issues
            setTimeout(() => {
                facilitiesMap.invalidateSize();
            }, 100);
        }
    });

    // Detail page back button
    $("#detail-back-btn").click(function() {
        // Clear search when navigating back
        clearSearch();

        $("#result-section").addClass("hidden");
        $("#complaint-section").addClass("hidden");
        $("#map-view").removeClass("hidden");
        $("#shared-search").removeClass("hidden");
        $("#center-icon").removeClass("fa-search").addClass("fa-qrcode");
        currentView = 'map';

        // Update nav highlighting
        $(".nav-item").removeClass("active");
        $("#nav-records").addClass("active");

        // Invalidate map size
        if (facilitiesMap) {
            setTimeout(() => {
                facilitiesMap.invalidateSize();
            }, 100);
        }
    });

    // Close modal when clicking outside
    $(document).click(function(event) {
        if ($(event.target).hasClass('modal')) {
            $(".modal").addClass("hidden");
        }
    });

    // Complaint form functionality
    let currentFacilityData = null;

    // Make a complain button click
    $(".complain-btn").click(function() {
        // Get current facility data from detail page
        const facilityId = $("#detail-facility-id").text().replace("# ", "");
        const facility = dpiData.find(f => f.id === facilityId);

        if (facility) {
            currentFacilityData = facility;
            showComplaintForm(facility);
        }
    });

    // Show complaint form
    function showComplaintForm(facility) {
        // Get image URL
        let imageUrl = facility.image || `https://placehold.co/400x300/e5e7eb/6b7280?text=${encodeURIComponent(facility.type)}`;
        if (facility.image && facility.image.startsWith('/api/')) {
            imageUrl = '..' + facility.image;
        }

        // Set facility info
        $("#complaint-facility-id").text(facility.id);
        $("#complaint-facility-image").attr("src", imageUrl);

        // Reset form
        $("#complaint-form")[0].reset();
        $("#image-preview").addClass("hidden");
        $("#upload-content").show();

        // Hide other sections and show complaint form
        $("#result-section").addClass("hidden");
        $("#facilities-list").addClass("hidden");
        $("#scanner-view").addClass("hidden");
        $("#error-section").addClass("hidden");
        $("#map-view").addClass("hidden");
        $("#shared-search").addClass("hidden");
        $("#complaint-section").removeClass("hidden");
    }

    // Complaint back button
    $("#complaint-back-btn").click(function() {
        // Clear search when navigating back
        clearSearch();

        $("#complaint-section").addClass("hidden");
        $("#result-section").removeClass("hidden");
        $("#shared-search").addClass("hidden");
        currentView = 'detail';
    });

    // Image upload handling
    $("#issue-image").change(function(e) {
        const file = e.target.files[0];
        if (file) {
            // Check file size (max 800x400px is about 320KB for typical images)
            if (file.size > 5 * 1024 * 1024) { // 5MB max
                alert("File size too large. Please choose a smaller image.");
                return;
            }

            // Check file type
            if (!file.type.match('image.*')) {
                alert("Please select an image file.");
                return;
            }

            // Preview image
            const reader = new FileReader();
            reader.onload = function(e) {
                $("#preview-img").attr("src", e.target.result);
                $("#image-preview").removeClass("hidden");
                $(".upload-content").hide();
            };
            reader.readAsDataURL(file);
        }
    });

    // Remove image preview
    $("#remove-image").click(function(e) {
        e.preventDefault();
        $("#issue-image").val('');
        $("#image-preview").addClass("hidden");
        $(".upload-content").show();
    });

    // Upload area click to trigger file input
    $("#upload-area").click(function(e) {
        if (!$(e.target).closest('.remove-image-btn').length &&
            !$(e.target).closest('#image-preview').length) {
            $("#issue-image").click();
        }
    });

    // Form submission
    $("#complaint-form").submit(function(e) {
        e.preventDefault();

        const description = $("#complaint-description").val().trim();
        const imageFile = $("#issue-image")[0].files[0];

        if (!description) {
            alert("Please enter a description.");
            return;
        }

        // Prepare complaint data
        const complaintData = {
            facilityId: currentFacilityData.id,
            facilityType: currentFacilityData.type,
            location: currentFacilityData.location,
            description: description,
            timestamp: new Date().toISOString(),
            hasImage: !!imageFile
        };

        console.log("Complaint submitted:", complaintData);

        // In a real app, you would send this to a server
        // For now, just show success message
        alert("Complaint submitted successfully!\n\nFacility: " + complaintData.facilityType +
              "\nID: " + complaintData.facilityId +
              "\n\nThank you for your report.");

        // Go back to detail page
        $("#complaint-section").addClass("hidden");
        $("#result-section").removeClass("hidden");
        currentView = 'detail';

        // Reset form
        $("#complaint-form")[0].reset();
        $("#image-preview").addClass("hidden");
        $(".upload-content").show();
    });

    // Initialize app
    initializeApp();
});