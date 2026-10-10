import express from 'express';
import { Item, RCPart } from '../models/index.js';

const router = express.Router();

// Get all items with optional filters (includes RC Parts)
router.get('/', async (req, res) => {
  try {
    const filters = {
      category_id: req.query.category_id,
      search: req.query.search,
    };
    const items = await RCPart.getAllCombined(filters);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single item
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create item
router.post('/', async (req, res) => {
  try {
    const item = req.body.source_type === 'rc_part' || req.body.item_type === 'RC Parts' 
      ? await RCPart.create(req.body)
      : await Item.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update item
router.put('/:id', async (req, res) => {
  try {
    const item = req.body.source_type === 'rc_part' || req.body.item_type === 'RC Parts' 
      ? await RCPart.update(req.params.id, req.body)
      : await Item.update(req.params.id, req.body);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete item
router.delete('/:id', async (req, res) => {
  try {
    const item = req.body.source_type === 'rc_part' || req.body.item_type === 'RC Parts'
      ? await RCPart.delete(req.params.id)
      : await Item.delete(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
