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
        $("#start-scan").prop("disabled", true).text("No Camera Available");
        $("#stop-scan").prop("disabled", true);
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

            // Add a visual confirmation
            $("#status-indicator").css("color", "#22c55e");

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
        resultSection.removeClass("hidden").show();
        console.log("Result section classes after:", resultSection.attr("class"));

        console.log("Hiding error section...");
        const errorSection = $("#error-section");
        console.log("Error section element found:", errorSection.length);
        errorSection.addClass("hidden").hide();

        console.log("Hiding scanner section...");
        const scannerSection = $(".scanner-section");
        console.log("Scanner section element found:", scannerSection.length);
        console.log("Scanner section classes before:", scannerSection.attr("class"));
        scannerSection.addClass("hidden").hide();
        console.log("Scanner section classes after:", scannerSection.attr("class"));

        console.log("Final check - Result section visible:", !resultSection.hasClass("hidden"));
        console.log("Final check - Scanner section hidden:", scannerSection.hasClass("hidden"));

        // Force visibility check
        console.log("Result section display style:", resultSection.css("display"));
        console.log("Scanner section display style:", scannerSection.css("display"));
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
        console.log("=== RESET TO SCANNER ===");

        console.log("Hiding result section...");
        $("#result-section").addClass("hidden").hide();

        console.log("Hiding error section...");
        $("#error-section").addClass("hidden").hide();

        console.log("Showing scanner section...");
        $(".scanner-section").removeClass("hidden").show();

        // Close any open modal
        console.log("Closing any open modal...");
        const modal = $("#manual-modal");
        console.log("Modal found for reset:", modal.length);
        modal.addClass("hidden").hide();

        // Clear any input fields
        $("#dpi-id-input").val('');

        // Stop any ongoing scanning
        stopScanning();

        // Update scanner status
        updateScanStatus(false);
        updateScannerButtons(false);

        console.log("Reset complete - scanner section visible");

        // Test if event handlers are still working
        console.log("Testing manual input button after reset...");
        const manualBtn = $("#manual-input");
        console.log("Manual input button found:", manualBtn.length);
        console.log("Manual input button visible:", manualBtn.is(":visible"));
        console.log("Manual input button disabled:", manualBtn.prop("disabled"));
    }

    // Test function for manual QR code simulation
    window.testQRScan = function(testId) {
        console.log("=== MANUAL QR TEST ===");
        console.log("Testing with ID:", testId || "BH-2024-001");
        lookupDpiId(testId || "BH-2024-001");
    };

    // Event Listeners
    $("#start-scan").click(function() {
        console.log("Start scan button clicked");
        startScanning();
    });

    $("#stop-scan").click(function() {
        stopScanning();
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