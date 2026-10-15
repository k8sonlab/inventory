# Inventory App

A full-stack inventory management application with Node.js backend, PostgreSQL database, and Vue.js frontend. Built to manage your hobby parts collection with multiple item types (screws, nuts, bearings, RC parts, etc.) organized across shelves and boxes.

**🎯 Dual Database Support:** Use **SQLite** (local, zero setup) or **PostgreSQL** (production/K8s). Choose via `DB_TYPE` environment variable!

## Project Structure

```
inventory/
├── server/              # Node.js + Express API
│   ├── routes/         # API routes
│   ├── models/         # Database models
│   ├── migrations/     # Database migrations
│   ├── utils/          # Utility functions
│   ├── package.json
│   └── index.js        # Main server file
├── client/             # Vue.js frontend
│   ├── src/
│   │   ├── components/ # Vue components
│   │   ├── views/      # Page views
│   │   ├── services/   # API service
│   │   ├── App.vue
│   │   └── main.js
│   ├── package.json
│   └── vite.config.js
├── docker/             # Docker & Kubernetes configs
│   ├── Dockerfile.server
│   ├── Dockerfile.client
│   ├── docker-compose.yml
│   └── kubernetes.yaml
├── scripts/            # Utility scripts
│   ├── setup.js       # One-command setup
│   └── analyze-excel.js
└── Generic Items Storage.xlsx  # Your inventory data
```

## Features

- ✅ **Dual Database Support**: Choose between SQLite (local) or PostgreSQL (production) via env variable
- ✅ **Multiple Item Types**: Screws, Nuts, Bearings, RC Parts, Oils/Pastes, Batteries, and more
- ✅ **Hierarchical Storage**: Shelves → Boxes → Items
- ✅ **Excel Import**: Automatically imports all data from your Excel file
- ✅ **Search & Filter**: Find items by name, location, or category
- ✅ **Dynamic Parameters**: Different item types have different parameters (stored as JSON)
- ✅ **Quantity Tracking**: Keep track of stock levels
- ✅ **Catalog Reference**: Centralized catalog of options (sizes, colors, companies, etc.)
- ✅ **Responsive Vue.js UI**: Modern, mobile-friendly interface
- ✅ **REST API**: Fully documented REST endpoints
- ✅ **Docker & Kubernetes Ready**: Deploy anywhere

## Quick Start

### Prerequisites
- **Node.js 20+** (or 22, 24)
- **npm 10+**
- **PostgreSQL 15+** (optional - use SQLite if you don't have it)

### ⚡ Fastest Setup (SQLite)

```bash
# Install dependencies
cd server && npm install
cd ../client && npm install
cd ..

# Create database and import Excel data
npm run migrate
npm run import-excel

# Start servers
cd server && npm run dev    # Terminal 1
# (new terminal)
cd client && npm run dev    # Terminal 2
```

Access the app at **http://localhost:5173** ✨

### 🐘 Using PostgreSQL (K8s)

1. Update `.env` in `server/`:
   ```env
   DB_TYPE=postgres
   DB_HOST=your-k8s-postgres-host
   DB_USER=your_user
   DB_PASSWORD=your_password
   DB_NAME=your_db
   ```

2. Run setup:
   ```bash
   npm run migrate
   npm run import-excel
   ```

### Docker Setup

```bash
cd docker
docker-compose up
```

Access the app at http://localhost:5173

### Kubernetes Deployment

1. **Build images**
   ```bash
   docker build -f docker/Dockerfile.server -t inventory-server:latest .
   docker build -f docker/Dockerfile.client -t inventory-client:latest .
   ```

2. **Load images into Kubernetes** (if using local cluster)
   ```bash
   kind load docker-image inventory-server:latest
   kind load docker-image inventory-client:latest
   ```

3. **Deploy**
   ```bash
   kubectl apply -f docker/kubernetes.yaml
   ```

4. **Access the app**
   ```bash
   kubectl port-forward -n inventory-app svc/inventory-client 5173:5173
   ```
   Then open http://localhost:5173

## Data Structure

Your Excel file has the following structure:

| Sheet | Purpose | Key Fields |
|-------|---------|-----------|
| **Shelves** | Storage locations (e.g., Brown Kallax, White Shelf) | Shelf ID, Location, Notes |
| **Boxes** | Physical containers within shelves | Shelf ID, Storage ID (S11-B01), Box Name, Box Type |
| **Screws** | Fastener inventory | Size, Length, Head Type, Drive Type, Thread Type, Storage ID, Amount |
| **Nut** | Fasteners | Size, Type, Color, Washer, Storage ID, Amount |
| **Bearings** | Rolling elements | Type, Model Type, ID, OD, Width, Storage ID, Amount |
| **Other Items** | Miscellaneous parts | Item Type, Name, Storage ID, Amount |
| **RC Parts** | RC model parts | Company, Model, Item Type, Part Number, Storage ID, Amount |
| **OilsPAstes** | Lubricants | Company, Type, Weight/Type, ML, Storage ID, Amount |
| **Batteries** | Power sources | Type, Amount, Model, Expiration |
| **Types Catalog** | Reference data for enums | Head Types, Thread Types, Drive Types, Colors, etc. |

All inventory items are linked to boxes via the **Storage ID** field, which is the unique identifier for each box.

## API Endpoints

### Health checks
- `GET /healthz` - Always returns HTTP 200 while the server is running (Kubernetes liveness).
- `GET /healthz/ready` - Returns HTTP 200 if PostgreSQL responds to `SELECT 1`, or if SQLite is configured. Returns HTTP 503 if PostgreSQL is unavailable.
- `GET /api/health` - Existing API health endpoint, unchanged.

PostgreSQL pool connections time out after 2 seconds, and readiness queries time out after 2 seconds. Kubernetes readiness probes allow 5 seconds for the check. The server still initializes the database and runs migrations before accepting HTTP requests.

Run backend health endpoint tests with `cd server && npm test`.

To also run the PostgreSQL Excel-import integration test, set `TEST_POSTGRES_URL` to a PostgreSQL connection URL when running `npm test`. The test creates and removes its own isolated database; the test user needs `CREATE DATABASE` permission. It covers existing integer-column migration, fractional quantities, bearings, and washers. Without this variable, the integration test is skipped.

### Items
- `GET /api/items` - List all items (supports filters: search, category_id, box_id, item_type)
- `GET /api/items/:id` - Get single item
- `POST /api/items` - Create item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Categories
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create category
- `DELETE /api/categories/:id` - Delete category

### Storage (Shelves & Boxes)
- `GET /api/storage/shelves` - List all shelves
- `POST /api/storage/shelves` - Create shelf
- `GET /api/storage/boxes` - List all boxes
- `POST /api/storage/boxes` - Create box
- `DELETE /api/storage/boxes/:id` - Delete box

## Environment Variables

Create `.env` in the `server/` directory (`.env.example` is provided):

```env
# Choose which database to use
DB_TYPE=sqlite          # Options: 'sqlite' or 'postgres'

# SQLite (when DB_TYPE=sqlite)
DB_FILE=inventory.db    # Path to SQLite database file

# PostgreSQL (when DB_TYPE=postgres)
DB_HOST=localhost
DB_USER=inventory_user
DB_PASSWORD=password
DB_NAME=inventory_db
DB_PORT=5432

# Server settings
PORT=3000
NODE_ENV=development
```

### Switching Databases

**Using SQLite (default - no setup needed):**
```env
DB_TYPE=sqlite
DB_FILE=inventory.db
```

**Using PostgreSQL (your K8s cluster):**
```env
DB_TYPE=postgres
DB_HOST=your-pg-host
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=your_db
DB_PORT=5432
```

Just change the `DB_TYPE` variable and restart the server!

## Database Schema

Supports both **SQLite** and **PostgreSQL** with identical schema:

```
shelves (1) ──→ (n) boxes ──→ (n) items ──→ categories
                                 └─→ parameters (JSON)
```

**Tables:**
- **shelves**: Physical storage locations (T01, S11, etc.)
- **boxes**: Containers within shelves, identified by Storage ID (S11-B01, T01-B04, etc.)
- **items**: Individual inventory items with polymorphic parameters
- **categories**: Item type categories (Screws, Nuts, etc.)
- **catalog_enums**: Reference data for dropdowns (sizes, colors, companies, etc.)

**Storage:**
- **SQLite**: Single `inventory.db` file in project root
- **PostgreSQL**: Full relational database in your K8s cluster

Quantities support fractional values such as `1.5` in Excel imports and the item editor. PostgreSQL uses `DOUBLE PRECISION` (returned as JSON numbers); SQLite uses `REAL` for new tables and also accepts fractions in existing integer-affinity columns. These are floating-point values, not exact financial decimals.

Existing PostgreSQL integer quantity columns are upgraded automatically on backend startup or with `cd server && npm run migrate`. Run the migration before retrying an Excel import against an existing database; integer quantities and defaults are preserved.

## Customization

### Add New Item Type
1. Create a new sheet in Excel with your data
2. Add row parsing in `server/utils/importExcel.js`
3. Create new category: `await Category.create('Your Type')`
4. Store item-specific data in the `parameters` JSON field

### Modify Parameters for an Item Type
Edit the `parameters` object in `importExcel.js` for each item type:

```javascript
parameters: {
  size: row['Size'],
  custom_field: row['Custom Field'],
  another_field: row['Another Field']
}
```

### Add Frontend Fields
Update Vue components in `client/src/views/ItemsView.vue` to display custom parameters based on `item_type`.

## Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
# If using Docker:
docker ps
# If using local install:
psql -U inventory_user -d inventory_db
```

### Excel Import Fails
- Ensure `Generic Items Storage.xlsx` is in the project root
- Check that PostgreSQL is running and migrations completed
- Run: `node scripts/analyze-excel.js` to debug Excel structure

### Port Already in Use
- Backend (3000): `npm run dev -- --port 3001`
- Frontend (5173): `npm run dev -- --port 5174`

## Next Steps

1. ✅ **Excel Import**: Run setup script to import your inventory
2. 🎨 **Customize UI**: Update Vue components to match your preferences
3. 📊 **Add Reports**: Create export/statistics functionality
4. 🔐 **Authentication**: Add user login if needed
5. 📱 **Mobile App**: Build a mobile version or PWA

## Support

Need help? Check:
1. Logs in terminal output
2. Database with: `psql -U inventory_user -d inventory_db`
3. API health: `curl http://localhost:3000/api/health`

---

**Built with ❤️ for your hobby**
