#!/usr/bin/env python3
"""
QR Code Generator for DPI Facilities
Generates QR codes for all DPI facility IDs and creates an index page to display them.
"""

import json
import os
import qrcode
from pathlib import Path

def load_dpi_data():
    """Load DPI data from the api folder"""
    dpi_file = Path(__file__).parent.parent / "api" / "dpi.json"

    if not dpi_file.exists():
        print(f"Error: DPI file not found at {dpi_file}")
        return []

    with open(dpi_file, 'r') as f:
        return json.load(f)

def generate_qr_code(dpi_id, output_path):
    """Generate QR code for a given DPI ID"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(dpi_id)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    img.save(output_path)
    print(f"Generated QR code for {dpi_id} -> {output_path}")

def generate_index_html(facilities, output_path):
    """Generate HTML index page to display all QR codes"""
    html_content = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DPI QR Codes</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Inter', sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        padding: 2rem;
      }

      .container {
        max-width: 1200px;
        margin: 0 auto;
      }

      .header {
        text-align: center;
        margin-bottom: 3rem;
        color: white;
      }

      .header h1 {
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
      }

      .header p {
        font-size: 1.2rem;
        opacity: 0.9;
      }

      .search-container {
        text-align: center;
        margin-bottom: 2rem;
      }

      .search-input {
        padding: 0.75rem 1rem;
        border: none;
        border-radius: 0.5rem;
        font-size: 1rem;
        width: 300px;
        max-width: 100%;
      }

      .search-input:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
      }

      .qr-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 2rem;
        margin-bottom: 2rem;
      }

      .qr-card {
        background: white;
        border-radius: 1rem;
        padding: 1.5rem;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }

      .qr-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
      }

      .qr-header {
        text-align: center;
        margin-bottom: 1rem;
      }

      .qr-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: #374151;
        margin-bottom: 0.25rem;
      }

      .qr-subtitle {
        font-size: 0.9rem;
        color: #6b7280;
        margin-bottom: 0.5rem;
      }

      .qr-image {
        text-align: center;
        margin-bottom: 1rem;
      }

      .qr-image img {
        max-width: 150px;
        height: auto;
        border: 2px solid #f3f4f6;
        border-radius: 0.5rem;
        padding: 0.5rem;
        background: white;
      }

      .qr-details {
        display: grid;
        gap: 0.5rem;
      }

      .detail-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid #f3f4f6;
        font-size: 0.85rem;
      }

      .detail-label {
        color: #6b7280;
        font-weight: 500;
      }

      .detail-value {
        color: #374151;
        font-weight: 600;
        text-align: right;
      }

      .status-badge {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        border-radius: 0.5rem;
        font-size: 0.75rem;
        font-weight: 600;
      }

      .status-functioning {
        background: #10b981;
        color: white;
      }

      .status-not-functioning {
        background: #ef4444;
        color: white;
      }

      .jmp-basic-service {
        background: #10b981;
        color: white;
      }

      .jmp-limited-service {
        background: #f59e0b;
        color: white;
      }

      .jmp-no-service {
        background: #ef4444;
        color: white;
      }

      .no-results {
        text-align: center;
        color: white;
        font-size: 1.2rem;
        padding: 2rem;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 1rem;
        backdrop-filter: blur(10px);
      }

      .stats {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border-radius: 1rem;
        padding: 1.5rem;
        margin-bottom: 2rem;
        color: white;
        display: flex;
        justify-content: space-around;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .stat-item {
        text-align: center;
      }

      .stat-number {
        font-size: 2rem;
        font-weight: 700;
      }

      .stat-label {
        font-size: 0.9rem;
        opacity: 0.9;
      }

      @media (max-width: 768px) {
        body {
          padding: 1rem;
        }

        .header h1 {
          font-size: 2rem;
        }

        .qr-grid {
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }

        .stats {
          flex-direction: column;
          text-align: center;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <header class="header">
        <h1><i class="fas fa-qrcode"></i> DPI Facility QR Codes</h1>
        <p>Quick access QR codes for all WASH facilities</p>
      </header>

      <div class="stats">
        <div class="stat-item">
          <div class="stat-number">""" + str(len(facilities)) + """</div>
          <div class="stat-label">Total Facilities</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">""" + str(len([f for f in facilities if f.get('functionality') == 'Functioning'])) + """</div>
          <div class="stat-label">Functioning</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">""" + str(len([f for f in facilities if f.get('functionality') != 'Functioning'])) + """</div>
          <div class="stat-label">Not Functioning</div>
        </div>
      </div>

      <div class="search-container">
        <input type="text" id="search-input" class="search-input" placeholder="Search by ID, name, location, or type..." />
      </div>

      <div id="qr-grid" class="qr-grid">
"""

    # Generate QR cards for each facility
    for facility in facilities:
        status_class = "status-functioning" if facility.get('functionality') == 'Functioning' else "status-not-functioning"
        jmp_class = f"jmp-{facility.get('jmpStatus', '').lower().replace(' ', '-')}"

        html_content += f"""
        <div class="qr-card" data-id="{facility.get('id', '')}" data-name="{facility.get('name', '')}" data-location="{facility.get('location', '')}" data-type="{facility.get('type', '')}">
          <div class="qr-header">
            <div class="qr-title">{facility.get('name', 'Unknown')}</div>
            <div class="qr-subtitle">{facility.get('id', 'N/A')}</div>
          </div>
          <div class="qr-image">
            <img src="{facility.get('id', 'unknown').replace('/', '_')}.png" alt="QR Code for {facility.get('id', 'Unknown')}" />
          </div>
          <div class="qr-details">
            <div class="detail-item">
              <span class="detail-label">Type:</span>
              <span class="detail-value">{facility.get('type', 'Unknown')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Location:</span>
              <span class="detail-value">{facility.get('location', 'Unknown')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Status:</span>
              <span class="detail-value">
                <span class="status-badge {status_class}">{facility.get('functionality', 'Unknown')}</span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">JMP:</span>
              <span class="detail-value">
                <span class="status-badge {jmp_class}">{facility.get('jmpStatus', 'Unknown')}</span>
              </span>
            </div>
          </div>
        </div>
        """

    html_content += """
      </div>

      <div id="no-results" class="no-results" style="display: none;">
        <i class="fas fa-search"></i>
        <p>No QR codes found matching your search criteria.</p>
      </div>
    </div>

    <script>
      // Search functionality
      const searchInput = document.getElementById('search-input');
      const qrGrid = document.getElementById('qr-grid');
      const noResults = document.getElementById('no-results');
      const qrCards = document.querySelectorAll('.qr-card');

      searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        let visibleCount = 0;

        qrCards.forEach(card => {
          const id = card.dataset.id.toLowerCase();
          const name = card.dataset.name.toLowerCase();
          const location = card.dataset.location.toLowerCase();
          const type = card.dataset.type.toLowerCase();

          if (id.includes(searchTerm) ||
              name.includes(searchTerm) ||
              location.includes(searchTerm) ||
              type.includes(searchTerm)) {
            card.style.display = 'block';
            visibleCount++;
          } else {
            card.style.display = 'none';
          }
        });

        // Show/hide no results message
        if (visibleCount === 0 && searchTerm !== '') {
          noResults.style.display = 'block';
          qrGrid.style.display = 'none';
        } else {
          noResults.style.display = 'none';
          qrGrid.style.display = 'grid';
        }
      });

      // Print functionality
      function printQRCodes() {
        window.print();
      }
    </script>
  </body>
</html>
"""

    with open(output_path, 'w') as f:
        f.write(html_content)
    print(f"Generated index page -> {output_path}")

def main():
    """Main function to generate QR codes for all DPI facilities"""
    print("Starting QR code generation for DPI facilities...")

    # Load DPI data
    facilities = load_dpi_data()
    if not facilities:
        return

    print(f"Found {len(facilities)} facilities")

    # Set up paths
    script_dir = Path(__file__).parent
    api_dir = script_dir.parent / "api"
    barcode_dir = api_dir / "barcode"

    # Create barcode directory if it doesn't exist
    barcode_dir.mkdir(exist_ok=True)

    # Generate QR codes for each facility
    for facility in facilities:
        dpi_id = facility.get('id')
        if not dpi_id:
            print(f"Warning: Facility missing ID: {facility}")
            continue

        # Sanitize filename (replace / with _ to avoid file system issues)
        filename = dpi_id.replace('/', '_') + '.png'
        output_path = barcode_dir / filename

        generate_qr_code(dpi_id, output_path)

    # Generate index HTML page
    index_path = barcode_dir / "index.html"
    generate_index_html(facilities, index_path)

    print(f"\nQR code generation complete!")
    print(f"- Generated {len(facilities)} QR codes in {barcode_dir}")
    print(f"- Index page available at: {index_path}")
    print(f"- Access via nginx: http://localhost:3000/api/barcode/")

if __name__ == "__main__":
    main()