import express from 'express';
import { CatalogEnum } from '../models/index.js';
import { sendError } from '../utils/httpErrors.js';

const router = express.Router();

// GET all enum types
router.get('/types', async (req, res) => {
  try {
    const types = await CatalogEnum.getAllTypes();
    res.json(types);
  } catch (error) {
    sendError(res, error);
  }
});

// GET all values for a specific enum type
router.get('/type/:enum_type', async (req, res) => {
  try {
    const values = await CatalogEnum.getByType(req.params.enum_type);
    res.json(values);
  } catch (error) {
    sendError(res, error);
  }
});

// POST create a new enum value
router.post('/type/:enum_type/value', async (req, res) => {
  try {
    const { value } = req.body;
    if (!value) return res.status(400).json({ error: 'Value required' });
    
    const result = await CatalogEnum.create(req.params.enum_type, value);
    res.json(result);
  } catch (error) {
    sendError(res, error);
  }
});

// DELETE an enum value
router.delete('/type/:enum_type/value/:value', async (req, res) => {
  try {
    const result = await CatalogEnum.delete(req.params.enum_type, req.params.value);
    res.json(result);
  } catch (error) {
    sendError(res, error);
  }
});

export default router;
