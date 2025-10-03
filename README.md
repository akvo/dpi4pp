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

### 2. WASH Registry Liberia Dashboard
- **URL**: `/app_02/`
- **Features**: Comprehensive WASH infrastructure monitoring and visualization
- **Functionality**:
  - Interactive geographic map with Liberia district boundaries
  - Real-time KPI cards (Total WASH IDs, % Functional, New IDs)
  - Advanced filtering by Period, County, Asset Type, Functional Status, and Data Source
  - WASH Assets Overview table with pagination
  - Chart.js visualization of water assets distribution by type
  - Support for multiple data sources (WASH Registry, Ministry of Health, Ministry of Education, Ministry of Public Works)
  - Light theme with responsive design

### 3. DPI Scanner
- **URL**: `/app_03/`
- **Features**: Mobile-friendly barcode/QR code scanner with interactive facility map
- **Functionality**:
  - Camera-based QR code scanning with visual overlay
  - Manual DPI ID input fallback
  - Interactive Leaflet map showing all WASH facilities
  - Custom teardrop pin markers (32px) with color-coding (green=functioning, red=not)
  - Sophisticated popup cards with facility images and details
  - Reusable search component across list and map views
  - Instant facility data lookup
  - Auto-clearing search on page transitions
  - Offline-capable design

### 4. QR Code Library
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
- **Maps**: Leaflet.js with TopoJSON support (topojson-client)
- **Charts**: Chart.js for data visualization
- **Barcodes**: HTML5-QRCode
- **HTTP Client**: Axios for API calls
- **Data**: JSON-based REST API
- **Deployment**: GitHub Pages
- **CI/CD**: GitHub Actions with asset minification
- **Build Tools**: html-minifier-terser, clean-css-cli, terser, jq

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
- Node.js 20+ (for QR code generation and build tools)
- Python 3.x (legacy QR code generator)

### Running Locally

#### Option 1: Docker Compose (Recommended)

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
   - School Dashboard: http://localhost:3000/app_01/
   - WASH Registry Dashboard: http://localhost:3000/app_02/
   - Scanner: http://localhost:3000/app_03/
   - QR Codes: http://localhost:3000/api/barcode/

4. **Stop services**:
   ```bash
   docker-compose down -t1
   ```

#### Option 2: Static File Server

Since this is a pure static site with no backend dependencies, you can also run it using any static file server:

**Using Python**:
```bash
# Python 3
python -m http.server 3000

# Python 2
python -m SimpleHTTPServer 3000
```

**Using Node.js (http-server)**:
```bash
npm install -g http-server
http-server -p 3000
```

**Using PHP**:
```bash
php -S localhost:3000
```

Then access: http://localhost:3000/app_01/

**Note**: Some features like QR code scanning require HTTPS. For testing camera features, use Docker Compose with proper SSL setup or deploy to a hosting service.

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
3. Static site is built and copied to build directory
4. QR codes are generated
5. Assets are minified (HTML, CSS, JS, JSON) for optimal performance
6. Application deploys to GitHub Pages

**Performance Optimization**: The build pipeline includes comprehensive asset minification (~20-30KB bandwidth savings) for faster page loads, particularly beneficial for mobile users on slow networks.

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
   - Sets up Node.js 20 for build tools
   - Installs minification tools (html-minifier-terser, clean-css-cli, terser, jq)
   - Generates QR codes
   - Minifies all HTML files (~15-25% reduction)
   - Minifies all CSS files (~20-30% reduction)
   - Minifies all JavaScript files (~30-40% reduction)
   - Minifies all JSON files (~15-25% reduction)
   - Creates navigation index page
   - Uploads optimized build artifact

2. **Deploy Job**:
   - Deploys minified build to GitHub Pages
   - Only runs on `main` branch
   - Publishes to `https://akvo.github.io/dpi4pp`

**Note**: Source files remain unchanged and readable in the repository. Minification only occurs during the build process for production deployment.

## 📁 Project Structure

```
dpi4pp/
├── app_01/                 # School Dashboard
│   ├── index.html
│   ├── css/style.css
│   └── js/main.js
├── app_02/                 # WASH Registry Liberia Dashboard
│   ├── index.html
│   ├── css/style.css
│   ├── js/main.js
│   ├── data/               # Chart data configurations
│   │   └── water-assets.json
│   └── source/             # Geographic data
│       └── liberia.json
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
- Application routes (`/app_01/`, `/app_02/`, `/app_03/`)
- CORS headers for development

### Docker Configuration

The `docker-compose.yml` provides:
- Nginx reverse proxy
- Volume mounts for development
- Port mapping (3000:80)
- Auto-restart configuration

## 🤖 AI Development Context

### CLAUDE.md

This repository includes `CLAUDE.md`, a comprehensive context file for AI-assisted development with Claude Code. It contains:

- **Project Overview**: Detailed descriptions of all applications (app_01, app_02, app_03)
- **Development History**: Complete changelog of features, implementations, and design decisions
- **Technical Stack**: Architecture decisions, libraries, and integration patterns
- **File Structure**: Detailed breakdown of project organization
- **Infrastructure & DevOps**: Docker setup, GitHub Actions, deployment pipelines
- **Cross-App Integration**: Shared components and data flow
- **Current State**: Feature completion status and next steps

**Purpose**: The CLAUDE.md file serves as a prompt cache for Claude Code, enabling:
- Faster context loading for AI-assisted development sessions
- Consistent understanding of project architecture across sessions
- Preservation of design decisions and implementation rationale
- Efficient onboarding for new development work

**Note**: Always update CLAUDE.md when making significant changes to the codebase to maintain accurate AI development context.

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
