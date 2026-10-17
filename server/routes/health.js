import express from 'express';
import { getDatabase, isPostgresDB } from '../db.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

router.get('/ready', async (req, res) => {
  try {
    if (isPostgresDB()) {
      await getDatabase().query({ text: 'SELECT 1', query_timeout: 2000 });
    }
    res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('PostgreSQL readiness check failed:', error);
    res.status(503).json({ status: 'NOT_READY' });
  }
});

export default router;
