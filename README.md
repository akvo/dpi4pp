# DPI4PP - WASH Management Information System

A comprehensive WASH (Water, Sanitation, and Hygiene) management system for Liberia schools, featuring facility monitoring, barcode scanning, and data visualization.

## 🚀 Live Demo

**Access the application at**: [https://akvo.github.io/dpi4pp](https://akvo.github.io/dpi4pp)

## 📱 Applications

### 1. School Dashboard
- **URL**: `/app_01/`
- **Features**: Real-time monitoring of WASH facilities in schools
- **Functionality**:
  - Interactive facility database
  - Expandable table views with detailed information
  - JMP status tracking
  - Service schedule monitoring

### 2. DPI Scanner
- **URL**: `/app_03/`
- **Features**: Mobile-friendly barcode/QR code scanner
- **Functionality**:
  - Camera-based QR code scanning
  - Manual DPI ID input
  - Instant facility data lookup
  - Offline-capable design

### 3. QR Code Library
- **URL**: `/api/barcode/`
- **Features**: Complete library of facility QR codes
- **Functionality**:
  - Searchable QR code database
  - Print-ready QR codes
  - Facility status indicators
  - Bulk QR code generation

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (jQuery)
- **Icons**: Font Awesome 6.4.0
- **Maps**: Leaflet.js
- **Barcodes**: HTML5-QRCode
- **Data**: JSON-based REST API
- **Deployment**: GitHub Pages
- **CI/CD**: GitHub Actions

## 📊 Data Structure

### Internal School Data (`/api/schools.json`)
- School information and WASH indicators
- Facility references and metadata
- Performance metrics

### External DPI Registry (`/api/dpi.json`)
- Complete facility database
- Technical specifications
- Maintenance records
- Water quality data

## 🏗 Local Development

### Prerequisites
- Docker and Docker Compose
- Node.js (optional for development tools)
- Python 3.x (for QR code generation)

### Running Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/akvo/dpi4pp.git
   cd dpi4pp
   ```

2. **Start with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

3. **Access applications**:
   - Dashboard: http://localhost:3000/app_01/
   - Scanner: http://localhost:3000/app_03/
   - QR Codes: http://localhost:3000/api/barcode/

4. **Stop services**:
   ```bash
   docker-compose down -t1
   ```

### Generate QR Codes

To regenerate QR codes for all facilities:

```bash
# Install Python dependencies
pip install 'qrcode[pil]'

# Run the QR code generator
cd scripts
python generate_qr_codes.py
```

## 🚢 Deployment

### Automatic Deployment

The application automatically deploys to GitHub Pages when changes are pushed to the `main` branch:

1. Push changes to `main` branch
2. GitHub Actions workflow triggers
3. Static site is built
4. QR codes are generated
5. Application deploys to GitHub Pages

### Manual Deployment

To trigger a manual deployment:

1. Go to the **Actions** tab in GitHub
2. Select **Deploy to GitHub Pages** workflow
3. Click **Run workflow**

### Architecture

The deployment pipeline:

1. **Build Job**:
   - Checks out the code
   - Sets up GitHub Pages
   - Copies all applications to build directory
   - Generates QR codes
   - Creates navigation index page

2. **Deploy Job**:
   - Deploys to GitHub Pages
   - Only runs on `main` branch
   - Publishes to `https://akvo.github.io/dpi4pp`

## 📁 Project Structure

```
dpi4pp/
├── app_01/                 # School Dashboard
│   ├── index.html
│   ├── css/style.css
│   └── js/main.js
├── app_02/                 # Placeholder Application
├── app_03/                 # DPI Scanner
│   ├── index.html
│   ├── css/style.css
│   └── js/main.js
├── api/                    # Data & APIs
│   ├── schools.json        # School data
│   ├── dpi.json           # DPI facility registry
│   └── barcode/           # Generated QR codes
├── scripts/                # Utility scripts
│   └── generate_qr_codes.py
├── .github/workflows/      # CI/CD pipelines
│   └── deploy.yml
├── docker-compose.yml      # Local development
├── nginx.conf             # Nginx configuration
└── README.md
```

## 🔧 Configuration

### Nginx Configuration

The `nginx.conf` file defines:
- Static file serving
- API endpoints (`/api/`)
- Application routes (`/app_01/`, `/app_03/`)
- CORS headers for development

### Docker Configuration

The `docker-compose.yml` provides:
- Nginx reverse proxy
- Volume mounts for development
- Port mapping (3000:80)
- Auto-restart configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an [Issue](https://github.com/akvo/dpi4pp/issues)
- Contact the Akvo team
- Check the [documentation](https://github.com/akvo/dpi4pp/wiki)

---

**Built with ❤️ by Akvo Foundation**
