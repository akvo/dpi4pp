# Claude Code Project Context

## Project Overview
DPI4PP - Digital Public Infrastructure for Public Policy
Multi-app dashboard system for Liberia education and WASH data management.

## Applications

### app_01: Liberia School Management Information System
**Purpose**: Comprehensive school data dashboard for Ministry of Education
**Features**:
- **Dashboard Page**: Statistics cards (enrolled students, teachers, schools, attendance), Chart.js enrollment analytics, recent activities feed
- **School Locations**: Interactive Leaflet map with TopoJSON boundaries, school markers by type and WASH status
- **Database Page**: Expandable school records table with facility details, infrastructure summary, mobile app download prompt
- **Navigation**: Ministry of Education branding, user profile, search functionality

### app_02: WASH Registry Liberia Dashboard
**Purpose**: WASH (Water, Sanitation, Hygiene) infrastructure monitoring and visualization
**Features**:
- **KPI Cards**: Total WASH IDs, % Functional status, New IDs counters
- **Interactive Map**: Leaflet with TopoJSON Liberia boundaries, county-level data visualization
- **Data Filtering**: Period, County, Asset Type, Functional Status, Data Source filters
- **Overview Table**: Ward-level data with pagination and sorting (5 rows per page)
- **Analytics**: Chart.js bar chart showing water assets distribution by type
- **Data Sources**: Support for WASH Registry, Ministry of Health, Education, Public Works

### app_03: DPI Barcode/QR Scanner
**Purpose**: Mobile-friendly facility scanning and lookup application
**Features**:
- **QR Scanner**: HTML5-QRCode camera integration with overlay and scan line animation
- **Manual Input**: Fallback DPI ID input modal for offline scenarios
- **Facility Lookup**: Real-time data fetching from `/api/dpi.json`
- **Results Display**: Detailed facility information presentation
- **Error Handling**: User-friendly error states for scanning failures and missing data
- **Status Indicators**: Real-time scan status and visual feedback

## Development History

### Previous Sessions (app_02 & app_03)
**Issue #2 Implementation**:
- Created complete WASH Registry Dashboard (app_02) with dark theme
- Implemented geographic visualization using Liberia TopoJSON data
- Added comprehensive filtering system and data table with pagination
- Integrated Chart.js for water assets distribution visualization
- Built QR scanner app (app_03) with HTML5-QRCode library
- Added proper error handling and responsive design for mobile scanning
- Configured GitHub Pages deployment with proper base href paths
- Added Liberia flag logo and professional header styling

### Previous Session (app_01)
**Issue #1 Implementation**:
- Refactored facility display from separate sections to expandable table rows
- Updated `/api/schools.json` facility structure from strings to objects with id/name pairs
- Complete dashboard redesign with Chart.js enrollment analytics
- Integrated Leaflet.js school location mapping
- Moved shared TopoJSON data to `/api/source/liberia.json`
- Added Ministry of Education branding and professional UI polish
- Fixed navigation styling and user experience improvements

### Previous Session (app_02 Light Theme)
**Issue #2 UI/UX Redesign**:
- Complete visual transformation from dark to light theme
- Updated CSS variables and color scheme to match reference design
- Redesigned KPI cards with colored icon backgrounds and light card styling
- Removed filter labels and added dropdown chevron arrows
- Right-aligned apply filter button with proper spacing
- Unified map and data sections into single container layout
- Removed "Geographic Distribution" title for cleaner design
- Added proper shadows and borders to data cards
- Updated chart styling with cleaner axes and light theme colors
- Fixed map legend styling for light theme contrast
- Resolved gray areas on map by updating Leaflet container background

### Previous Session (app_02 Chart Redesign)
**Issue #2 Chart Enhancement**:
- Redesigned water assets distribution chart with custom legend and external tooltips
- Migrated from static water-assets.json to dynamic DPI data from /api/dpi.json
- Implemented two-column grid layout: chart (1fr) + legend sidebar (180px)
- Created custom external tooltip handler with centered positioning above bars
- Added downward-pointing caret at bottom of tooltip showing "2024" and asset type
- Built custom legend component with color dots, labels, and dynamic percentages
- Mapped 6 DPI asset types to 4 chart categories (Public Taps, Protected Spring, Private Taps, Groundwater)
- Updated color scheme: light blue (#a8d5e2), peach (#ffb88c), mint green (#86e5d2), dark teal (#2d6470)
- Applied rounded corners (8px) and proper bar thickness (60px) to bars
- Fixed tooltip positioning bug by wrapping canvas in chart-canvas-wrapper div
- Calculate real-time percentages based on actual DPI asset counts
- Improved chart title styling and grid line appearance for light theme

### Current Session (app_03 Interactive Map)
**Issue #4 Map View Implementation**:
- Integrated Leaflet.js and TopoJSON libraries into app_03
- Created full-screen interactive map view showing all WASH facilities
- Refactored search bar as reusable shared component for list and map views
- Added Liberia TopoJSON boundaries with blue styling matching app_01/app_02
- Implemented custom 32px teardrop pin markers with color-coding (green=functioning, red=not)
- Designed sophisticated popup cards with facility images, compact layout, and circular action button
- Map fills entire viewport edge-to-edge below header and above bottom nav
- Disabled scroll wheel zoom and removed zoom controls for mobile optimization
- Search functionality works across both list and map views (filters cards, dims markers)
- Auto-clear search when navigating between pages for clean UX
- Added navigation highlighting to show active map view state
- Fixed grey area issue on map with water-color background (#aad3df)
- Implemented proper z-index layering for floating search bar over map
- Map back button navigation returns to map view from details
- Map invalidation on view transitions for proper rendering
- Added box shadow to top header for visual depth
- Reduced splash logo animation size from 280px to 200px
- Updated search placeholder to "Search facilities..." for clarity

## Key Technical Stack
- **Frontend**: Vanilla JS with jQuery (all apps)
- **Charts**: Chart.js (app_01 enrollment analytics, app_02 water assets distribution)
- **Maps**: Leaflet.js with TopoJSON (app_01 school locations, app_02 county boundaries, app_03 facility locations)
- **QR Scanning**: HTML5-QRCode library (app_03)
- **HTTP Client**: Axios for API calls (app_03)
- **Styling**: CSS Grid, Flexbox, light themes, responsive design
- **Data Sources**:
  - `/api/schools.json` - School data with expandable facility details
  - `/api/dpi.json` - Complete DPI facility registry for scanning
  - `/api/source/liberia.json` - Shared TopoJSON geographic boundaries

## File Structure
```
/api/
  ├── schools.json          # School data with facility objects
  ├── dpi.json             # Complete DPI facility registry for scanning
  ├── barcode/             # Generated QR codes directory
  │   ├── index.html       # QR code library interface
  │   └── *.png           # Individual facility QR code images
  └── source/
      └── liberia.json      # Shared TopoJSON boundaries (moved from app_02)
/app_01/                    # School Management Dashboard
  ├── index.html            # Multi-page layout (dashboard/maps/database)
  ├── css/style.css         # Complete redesigned styles
  ├── js/main.js            # Core functionality + charts + maps
  └── images/
      ├── ministry-of-education-logo.png
      └── user-avatar.jpg
/app_02/                    # WASH Registry Dashboard
  ├── index.html            # Single-page WASH analytics
  ├── css/style.css         # Light theme styling
  ├── js/main.js            # Map + filtering + pagination + charts
  ├── data/
  │   └── water-assets.json # Chart data configurations
  └── images/
      └── liberia-logo.png  # Liberia flag branding
/app_03/                    # QR Scanner App
  ├── index.html            # Scanner interface
  ├── css/style.css         # Mobile-optimized styling
  └── js/main.js            # QR scanning + facility lookup
/docs/
  └── index.html           # Navigation landing page for GitHub Pages
/scripts/
  └── generate-qr-codes.js # Node.js QR code generation script
/.github/workflows/
  └── deploy.yml           # GitHub Actions CI/CD pipeline
├── docker-compose.yml     # Local development environment
├── nginx.conf            # Nginx reverse proxy configuration
├── README.md             # Comprehensive project documentation
└── CLAUDE.md             # Claude context cache and development history
```

## Infrastructure & DevOps

### Local Development (Docker)
**docker-compose.yml**: Nginx-based development environment
- **Service**: nginx:latest container on port 3000
- **Volumes**: Read-only mounts for all apps and API data
- **Access**: http://localhost:3000/app_01/, /app_02/, /app_03/
- **Commands**:
  ```bash
  docker compose up -d    # Start development server
  docker compose down -t1 # Stop services
  ```

### Nginx Configuration (nginx.conf)
- **Route mapping**: /app_01/, /app_02/, /app_03/ → respective directories
- **API endpoints**: /api/ with JSON content-type headers
- **Root redirect**: / → /app_01/ (default landing)
- **MIME types**: Proper handling for all static assets

### GitHub Actions CI/CD (.github/workflows/deploy.yml)
**Triggers**: Push to main, PRs, manual workflow dispatch
**Build Process**:
1. **Static site assembly**: Copy all apps and API to build/
2. **GitHub Pages prep**: Update base href tags for `/dpi4pp/` prefix
3. **Navigation setup**: Copy docs/index.html as landing page
4. **Artifact upload**: Prepare for GitHub Pages deployment

**Deploy Process**:
- **Environment**: github-pages with proper permissions
- **Condition**: Only deploys from main branch
- **URL**: https://akvo.github.io/dpi4pp

### QR Code Generation (scripts/generate-qr-codes.js)
**Purpose**: Node.js script to generate QR codes for all DPI facilities
**Features**:
- **QR Generation**: 200px PNG files with 2px margin using qrcode library
- **File naming**: DPI IDs with '/' replaced by '_' (e.g., "BH-2024-001" → "BH-2024-001.png")
- **Library interface**: Auto-generates /api/barcode/index.html with styled grid
- **Visual design**: Status badges, facility details, hover effects
- **Data source**: Reads from /api/dpi.json

**Commands**:
```bash
cd scripts
npm install qrcode    # Install dependencies
node generate-qr-codes.js    # Generate all QR codes
```

### Navigation Landing Page (docs/index.html)
**Purpose**: Main entry point for GitHub Pages deployment
**Design**:
- **Responsive grid**: 4 application cards with descriptions
- **Applications**: School Dashboard, WASH Registry, DPI Scanner, QR Library
- **Styling**: Purple gradient background, hover effects, mobile-optimized
- **Branding**: Akvo footer with GitHub repository link

## Development Workflow
- **Local testing**: Static files - open app_01/index.html directly or use Docker
- **Git workflow**: Feature branches with `[#issue]` commit prefixes
- **Deployment**: Automatic via GitHub Actions on main branch push
- **QR codes**: Generated manually via Node.js script when facility data changes

## Current State

### app_01 (School Management) ✅
- Complete dashboard redesign with modern statistics cards
- Interactive school location mapping with TopoJSON boundaries
- Expandable database table with facility details integration
- Ministry of Education branding and professional assets
- Chart.js enrollment analytics and activity feeds

### app_02 (WASH Registry) ✅
- Light-themed dashboard with colored KPI cards and filtering
- Interactive Liberia county map with geographic data visualization
- Paginated data table with sorting (5 rows per page)
- Chart.js water assets distribution analytics with clean styling
- Multi-source data support (Registry, Health, Education, Public Works)
- Professional light theme design matching reference mockup

### app_03 (QR Scanner) ✅
- HTML5-QRCode camera integration with visual overlays
- Manual DPI ID input fallback for offline scenarios
- Real-time facility lookup with detailed results display
- Mobile-optimized interface with proper error handling
- Status indicators and user feedback systems
- Full-screen interactive map view with Leaflet.js showing all facilities
- Custom teardrop pin markers (32px) with color-coded status
- Sophisticated popup cards with facility images and compact layout
- Reusable search component working across list and map views
- Navigation highlighting for active view state
- Auto-clearing search on page transitions

## Cross-App Integration ✅
- Shared TopoJSON data moved to `/api/source/liberia.json`
- Consistent branding and styling patterns
- GitHub Pages deployment with proper base href configuration
- Git workflow with issue-based commit prefixes (`[#1]`, `[#2]`)

## Next Steps (when requested)
- Additional chart types or data visualizations across all apps
- Real-time data integration and API endpoints
- Advanced filtering and export functionality
- Performance optimizations and caching strategies
- Progressive Web App (PWA) features for offline support
- ALWAYS update CLAUDE.md when commiting to git
