import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase } from './db.js';
import { runMigrations } from './migrations/run.js';

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
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Initialize database and start server
async function start() {
  try {
    await initializeDatabase();
    await runMigrations();
    app.listen(port, () => {
      console.log(`Inventory API listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await closeDatabase();
  process.exit(0);
});

start();
