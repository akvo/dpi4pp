#!/usr/bin/env node

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Function to generate QR code index HTML
function generateQRIndexHtml(facilities) {
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DPI QR Codes</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: 'Inter', sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        padding: 2rem;
      }
      .container { max-width: 1200px; margin: 0 auto; }
      .header { text-align: center; margin-bottom: 3rem; color: white; }
      .header h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 0.5rem; }
      .qr-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 2rem;
      }
      .qr-card {
        background: white;
        border-radius: 1rem;
        padding: 1.5rem;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease;
      }
      .qr-card:hover { transform: translateY(-5px); }
      .qr-header { text-align: center; margin-bottom: 1rem; }
      .qr-title { font-size: 1.1rem; font-weight: 600; color: #374151; margin-bottom: 0.25rem; }
      .qr-subtitle { font-size: 0.9rem; color: #6b7280; }
      .qr-image { text-align: center; margin: 1rem 0; }
      .qr-image img {
        max-width: 150px;
        border: 2px solid #f3f4f6;
        border-radius: 0.5rem;
        padding: 0.5rem;
      }
      .qr-details { display: grid; gap: 0.5rem; }
      .detail-item {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
        border-bottom: 1px solid #f3f4f6;
        font-size: 0.85rem;
      }
      .detail-label { color: #6b7280; font-weight: 500; }
      .detail-value { color: #374151; font-weight: 600; text-align: right; }
      .status-badge {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        border-radius: 0.5rem;
        font-size: 0.75rem;
        font-weight: 600;
      }
      .status-functioning { background: #10b981; color: white; }
      .status-not-functioning { background: #ef4444; color: white; }
      .jmp-basic-service { background: #10b981; color: white; }
      .jmp-limited-service { background: #f59e0b; color: white; }
      .jmp-no-service { background: #ef4444; color: white; }
    </style>
  </head>
  <body>
    <div class="container">
      <header class="header">
        <h1><i class="fas fa-qrcode"></i> DPI Facility QR Codes</h1>
        <p>Quick access QR codes for all WASH facilities</p>
      </header>
      <div class="qr-grid">
        ${facilities.map(facility => {
          const statusClass = facility.functionality === 'Functioning' ? 'status-functioning' : 'status-not-functioning';
          const jmpClass = `jmp-${facility.jmpStatus.toLowerCase().replace(' ', '-')}`;
          return `
        <div class="qr-card">
          <div class="qr-header">
            <div class="qr-title">${facility.name}</div>
            <div class="qr-subtitle">${facility.id}</div>
          </div>
          <div class="qr-image">
            <img src="${facility.id.replace('/', '_')}.png" alt="QR Code for ${facility.id}" />
          </div>
          <div class="qr-details">
            <div class="detail-item">
              <span class="detail-label">Type:</span>
              <span class="detail-value">${facility.type}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Location:</span>
              <span class="detail-value">${facility.location}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Status:</span>
              <span class="detail-value">
                <span class="status-badge ${statusClass}">${facility.functionality}</span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">JMP:</span>
              <span class="detail-value">
                <span class="status-badge ${jmpClass}">${facility.jmpStatus}</span>
              </span>
            </div>
          </div>
        </div>`;
        }).join('')}
      </div>
    </div>
  </body>
</html>`;
    return html;
}

// Load DPI data
const dpiData = JSON.parse(fs.readFileSync(path.join(__dirname, '../api/dpi.json'), 'utf8'));

// Create barcode directory
const barcodeDir = path.join(__dirname, '../api/barcode');
if (!fs.existsSync(barcodeDir)) {
    fs.mkdirSync(barcodeDir, { recursive: true });
}

console.log('Generating QR codes for DPI facilities...');

// Generate QR codes synchronously
const generateQR = async (facility) => {
    const dpiId = facility.id;
    const filename = dpiId.replace('/', '_') + '.png';
    const filepath = path.join(barcodeDir, filename);

    try {
        await QRCode.toFile(filepath, dpiId, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        console.log(`Generated QR code for ${dpiId} -> ${filepath}`);
    } catch (err) {
        console.error(`Error generating QR code for ${dpiId}:`, err);
    }
};

// Generate all QR codes
(async () => {
    for (const facility of dpiData) {
        await generateQR(facility);
    }
    console.log('QR code generation complete!');

    // Generate index.html for QR codes
    const indexHtml = generateQRIndexHtml(dpiData);
    fs.writeFileSync(path.join(barcodeDir, 'index.html'), indexHtml);
    console.log('Generated QR code index page');
})();