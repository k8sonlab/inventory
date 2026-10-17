import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase } from './db.js';
import { runMigrations } from './migrations/run.js';
import { accessLog } from './utils/logging.js';
import { errorHandler } from './utils/httpErrors.js';

// Import routes
import itemRoutes from './routes/items.js';
import categoryRoutes from './routes/categories.js';
import storageRoutes from './routes/locations.js';
import enumRoutes from './routes/enums.js';
import healthRoutes from './routes/health.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(accessLog);
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check
app.use('/healthz', healthRoutes);
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Inventory API is running' });
});

// Routes
app.use('/api/items', itemRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/locations', storageRoutes);
app.use('/api/enums', enumRoutes);

// Error handling middleware
app.use(errorHandler);

let server;
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\nReceived ${signal}, shutting down...`);
  // Kubernetes allows 30s by default; give up slightly earlier.
  const forceExit = setTimeout(() => {
    console.error('Shutdown timed out, forcing exit');
    process.exit(1);
  }, 25000);
  forceExit.unref();
  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeIdleConnections();
      });
    }
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Initialize database and start server
async function start() {
  try {
    await initializeDatabase();
    await runMigrations();
    server = app.listen(port, () => {
      console.log(`Inventory API listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Kubernetes sends SIGTERM; SIGINT covers Ctrl+C in development
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
